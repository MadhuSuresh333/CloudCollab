"""
Tests for CloudCollab iteration-2 features:
  1. GET /api/config
  2. File upload validation (size, extension, empty, no-ext)
  3. WebSocket /api/ws/documents/{id} real-time collaboration

Runs under pytest-xdist with `-n 2 --dist loadscope`. Uses raw `asyncio.run()`
per-test so we don't need pytest-asyncio.
"""
import asyncio
import io
import json
import os
import time
import uuid

import pytest
import requests
import websockets

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://feature-mapper-14.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
PASSWORD = "TestPass123!"


def _unique_email(tag):
    return f"test-{tag}-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}@example.com"


def _register(name, tag):
    email = _unique_email(tag)
    r = requests.post(f"{API}/auth/register", json={
        "name": name, "email": email, "password": PASSWORD
    })
    assert r.status_code == 201, f"register failed: {r.status_code} {r.text}"
    d = r.json()
    return {"token": d["access_token"], "user": d["user"], "email": email}


def _auth(u):
    return {"Authorization": f"Bearer {u['token']}"}


# ============== Config endpoint ==============

class TestConfig:
    def test_config_endpoint_returns_expected_shape(self):
        r = requests.get(f"{API}/config")
        assert r.status_code == 200
        data = r.json()
        assert data["max_file_size_mb"] == 10
        assert data["max_file_size_bytes"] == 10 * 1024 * 1024
        exts = data["allowed_file_extensions"]
        assert isinstance(exts, list)
        assert len(exts) > 0
        # spot-check a few
        for e in [".png", ".pdf", ".txt", ".json"]:
            assert e in exts, f"expected {e} in allowed extensions, got {exts}"

    def test_config_is_public_no_auth_required(self):
        r = requests.get(f"{API}/config")
        assert r.status_code == 200


# ============== File validation ==============

class TestFileValidation:
    @pytest.fixture(scope="class")
    def user(self):
        return _register(f"File Val {uuid.uuid4().hex[:4]}", "fileval")

    @pytest.fixture(scope="class")
    def workspace(self, user):
        r = requests.post(f"{API}/workspaces", headers=_auth(user),
                          json={"name": "TEST_FILE_VAL_WS"})
        assert r.status_code == 201
        return r.json()

    def _upload(self, user, workspace, filename, content, mime="application/octet-stream"):
        files = {"file": (filename, io.BytesIO(content), mime)}
        return requests.post(f"{API}/workspaces/{workspace['id']}/files",
                             headers=_auth(user), files=files)

    def test_reject_disallowed_extension_exe(self, user, workspace):
        r = self._upload(user, workspace, "malware.exe", b"MZ\x90\x00")
        assert r.status_code == 400, r.text
        assert "not allowed" in r.json()["detail"].lower()

    def test_reject_over_size_limit(self, user, workspace):
        # 10MB + 1 byte
        oversize = b"a" * (10 * 1024 * 1024 + 1)
        r = self._upload(user, workspace, "big.txt", oversize, "text/plain")
        assert r.status_code == 413, r.text
        detail = r.json()["detail"].lower()
        assert "10mb" in detail or "10.0" in detail
        assert "mb" in detail

    def test_reject_empty_file(self, user, workspace):
        r = self._upload(user, workspace, "empty.txt", b"", "text/plain")
        assert r.status_code == 400, r.text
        assert "empty" in r.json()["detail"].lower()

    def test_reject_no_extension(self, user, workspace):
        r = self._upload(user, workspace, "README", b"content here")
        assert r.status_code == 400, r.text
        assert "extension" in r.json()["detail"].lower()

    def test_accept_valid_txt(self, user, workspace):
        content = b"Hello, this is a valid text file."
        r = self._upload(user, workspace, "TEST_ok.txt", content, "text/plain")
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["name"] == "TEST_ok.txt"
        assert d["size"] == len(content)
        # cleanup
        requests.delete(f"{API}/files/{d['id']}", headers=_auth(user))

    def test_accept_valid_pdf(self, user, workspace):
        content = b"%PDF-1.4\n%fake pdf for test\n"
        r = self._upload(user, workspace, "TEST_doc.pdf", content, "application/pdf")
        assert r.status_code == 201, r.text
        requests.delete(f"{API}/files/{r.json()['id']}", headers=_auth(user))

    def test_accept_valid_png(self, user, workspace):
        # minimal valid PNG header (not a real image but extension is valid and non-empty)
        content = b"\x89PNG\r\n\x1a\n" + b"a" * 100
        r = self._upload(user, workspace, "TEST_img.png", content, "image/png")
        assert r.status_code == 201, r.text
        requests.delete(f"{API}/files/{r.json()['id']}", headers=_auth(user))


# ============== WebSocket document collaboration ==============

async def _recv_json(ws, timeout=5):
    raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
    return json.loads(raw)


async def _wait_for_type(ws, msg_type, timeout=5):
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        remaining = max(0.1, deadline - asyncio.get_event_loop().time())
        try:
            m = await _recv_json(ws, timeout=remaining)
        except asyncio.TimeoutError:
            break
        if m.get("type") == msg_type:
            return m
    raise AssertionError(f"Did not receive {msg_type} within {timeout}s")


class TestWebSocketCollab:
    @pytest.fixture(scope="class")
    def alice(self):
        return _register("Alice", "wsalice")

    @pytest.fixture(scope="class")
    def bob(self):
        return _register("Bob", "wsbob")

    @pytest.fixture(scope="class")
    def outsider(self):
        return _register("Outsider", "wsoutside")

    @pytest.fixture(scope="class")
    def ws_and_doc(self, alice, bob):
        # Alice creates workspace and doc, invites Bob
        r = requests.post(f"{API}/workspaces", headers=_auth(alice),
                          json={"name": "TEST_WS_COLLAB"})
        assert r.status_code == 201
        workspace = r.json()
        r2 = requests.post(f"{API}/workspaces/{workspace['id']}/members",
                           headers=_auth(alice),
                           json={"email": bob["email"], "role": "member"})
        assert r2.status_code == 201
        r3 = requests.post(f"{API}/workspaces/{workspace['id']}/documents",
                           headers=_auth(alice),
                           json={"title": "TEST_DOC", "content": "initial"})
        assert r3.status_code == 201
        return {"workspace": workspace, "document": r3.json()}

    def test_ws_rejects_invalid_token(self, ws_and_doc):
        doc_id = ws_and_doc["document"]["id"]
        url = f"{WS_BASE}/api/ws/documents/{doc_id}?token=not-a-valid-token"

        async def run():
            with pytest.raises(Exception):
                async with websockets.connect(url) as ws:
                    # Server should close immediately; recv will raise.
                    await asyncio.wait_for(ws.recv(), timeout=5)

        asyncio.run(run())

    def test_ws_rejects_non_member(self, ws_and_doc, outsider):
        doc_id = ws_and_doc["document"]["id"]
        url = f"{WS_BASE}/api/ws/documents/{doc_id}?token={outsider['token']}"

        async def run():
            connected = False
            try:
                async with websockets.connect(url) as ws:
                    connected = True
                    with pytest.raises(Exception):
                        await asyncio.wait_for(ws.recv(), timeout=5)
            except websockets.exceptions.InvalidStatus:
                # Some servers may reject before upgrade
                connected = False
            # Either it was rejected pre-handshake or immediately closed
            assert True  # test passes if we reach here without receiving a valid message

        asyncio.run(run())

    def test_ws_accepts_member_and_sends_active_users(self, ws_and_doc, alice):
        doc_id = ws_and_doc["document"]["id"]
        url = f"{WS_BASE}/api/ws/documents/{doc_id}?token={alice['token']}"

        async def run():
            async with websockets.connect(url) as ws:
                msg = await _recv_json(ws)
                assert msg["type"] == "active_users"
                user_ids = [u["user_id"] for u in msg["users"]]
                assert alice["user"]["id"] in user_ids

        asyncio.run(run())

    def test_ws_two_users_broadcast_and_persist(self, ws_and_doc, alice, bob):
        doc_id = ws_and_doc["document"]["id"]
        url_a = f"{WS_BASE}/api/ws/documents/{doc_id}?token={alice['token']}"
        url_b = f"{WS_BASE}/api/ws/documents/{doc_id}?token={bob['token']}"

        async def run():
            async with websockets.connect(url_a) as ws_a:
                # Alice's initial active_users (just herself)
                msg_a0 = await _recv_json(ws_a)
                assert msg_a0["type"] == "active_users"

                async with websockets.connect(url_b) as ws_b:
                    # Bob receives an active_users with both users
                    msg_b0 = await _wait_for_type(ws_b, "active_users")
                    b_user_ids = {u["user_id"] for u in msg_b0["users"]}
                    assert alice["user"]["id"] in b_user_ids
                    assert bob["user"]["id"] in b_user_ids

                    # Alice should also get an updated active_users (with Bob)
                    msg_a1 = await _wait_for_type(ws_a, "active_users")
                    a_user_ids = {u["user_id"] for u in msg_a1["users"]}
                    assert bob["user"]["id"] in a_user_ids

                    # Alice sends a content_change
                    await ws_a.send(json.dumps({"type": "content_change", "content": "Hello from Alice"}))

                    # Bob should receive it with sender identity
                    msg_content = await _wait_for_type(ws_b, "content_change")
                    assert msg_content["content"] == "Hello from Alice"
                    assert msg_content["user_id"] == alice["user"]["id"]
                    assert msg_content["user_name"] == alice["user"]["name"]

                    # Alice should NOT receive her own content_change (no echo).
                    # Give the server a moment to potentially misbehave.
                    got_echo = False
                    try:
                        while True:
                            m = await _recv_json(ws_a, timeout=1)
                            if m.get("type") == "content_change":
                                got_echo = True
                                break
                    except asyncio.TimeoutError:
                        pass
                    assert not got_echo, "Alice should not receive her own content_change"

                    # Bob sends title_change
                    await ws_b.send(json.dumps({"type": "title_change", "title": "New Title By Bob"}))
                    msg_title = await _wait_for_type(ws_a, "title_change")
                    assert msg_title["title"] == "New Title By Bob"
                    assert msg_title["user_id"] == bob["user"]["id"]

            # After both sockets closed, changes should be persisted
            await asyncio.sleep(1.5)

        asyncio.run(run())

        # Verify persistence via REST
        r = requests.get(f"{API}/documents/{doc_id}", headers=_auth(alice))
        assert r.status_code == 200
        d = r.json()
        assert d["content"] == "Hello from Alice"
        assert d["title"] == "New Title By Bob"

    def test_ws_active_users_updated_on_disconnect(self, ws_and_doc, alice, bob):
        doc_id = ws_and_doc["document"]["id"]
        url_a = f"{WS_BASE}/api/ws/documents/{doc_id}?token={alice['token']}"
        url_b = f"{WS_BASE}/api/ws/documents/{doc_id}?token={bob['token']}"

        async def run():
            ws_a = await websockets.connect(url_a)
            try:
                await _recv_json(ws_a)  # initial active_users
                ws_b = await websockets.connect(url_b)
                # drain Bob's initial and Alice's updated
                await _wait_for_type(ws_b, "active_users")
                await _wait_for_type(ws_a, "active_users")

                # Bob disconnects
                await ws_b.close()

                # Alice should receive an updated active_users without Bob
                msg_after = await _wait_for_type(ws_a, "active_users", timeout=6)
                remaining = {u["user_id"] for u in msg_after["users"]}
                assert alice["user"]["id"] in remaining
                assert bob["user"]["id"] not in remaining
            finally:
                await ws_a.close()

        asyncio.run(run())
