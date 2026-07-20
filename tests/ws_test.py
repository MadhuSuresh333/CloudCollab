"""Quick WebSocket test for document collaboration.

Creates 2 users, one document, connects both via websocket, and verifies
that a content_change from user A is received by user B."""
import asyncio
import json
import os
import time
import subprocess

import httpx
import websockets

BACKEND = subprocess.check_output(
    ["grep", "REACT_APP_BACKEND_URL", "/app/frontend/.env"]
).decode().split("=", 1)[1].strip()

WS_BASE = BACKEND.replace("https://", "wss://").replace("http://", "ws://")
ts = int(time.time())


async def register(client, name, email):
    r = await client.post(f"{BACKEND}/api/auth/register", json={
        "name": name, "email": email, "password": "pw123456"
    })
    r.raise_for_status()
    return r.json()


async def main():
    async with httpx.AsyncClient(timeout=15) as c:
        u1 = await register(c, "Alice", f"alice{ts}@t.com")
        u2 = await register(c, "Bob", f"bob{ts}@t.com")
        t1, t2 = u1["access_token"], u2["access_token"]

        # Alice creates workspace + document, invites Bob
        ws = (await c.post(f"{BACKEND}/api/workspaces",
                           json={"name": "Collab"},
                           headers={"Authorization": f"Bearer {t1}"})).json()
        await c.post(f"{BACKEND}/api/workspaces/{ws['id']}/members",
                     json={"email": f"bob{ts}@t.com", "role": "member"},
                     headers={"Authorization": f"Bearer {t1}"})
        doc = (await c.post(f"{BACKEND}/api/workspaces/{ws['id']}/documents",
                            json={"title": "Test Doc", "content": "hello"},
                            headers={"Authorization": f"Bearer {t1}"})).json()

    doc_id = doc["id"]
    print(f"Document: {doc_id}")

    async def connect(token, name):
        url = f"{WS_BASE}/api/ws/documents/{doc_id}?token={token}"
        return await websockets.connect(url)

    ws_a = await connect(t1, "Alice")
    ws_b = await connect(t2, "Bob")

    # Both should receive an active_users message
    msg_a = json.loads(await asyncio.wait_for(ws_a.recv(), timeout=5))
    msg_b1 = json.loads(await asyncio.wait_for(ws_b.recv(), timeout=5))
    print(f"Alice initial: {msg_a}")
    print(f"Bob initial:   {msg_b1}")
    assert msg_b1["type"] == "active_users"
    assert len(msg_b1["users"]) == 2

    # Alice sends a content change
    await ws_a.send(json.dumps({"type": "content_change", "content": "Alice edited this"}))

    # Bob should receive it
    msg_b2 = json.loads(await asyncio.wait_for(ws_b.recv(), timeout=5))
    print(f"Bob received:  {msg_b2}")
    assert msg_b2["type"] == "content_change"
    assert msg_b2["content"] == "Alice edited this"
    assert msg_b2["user_name"] == "Alice"

    # Bob sends title change
    await ws_b.send(json.dumps({"type": "title_change", "title": "New Title By Bob"}))

    # Alice may still have a queued active_users message; keep reading until we
    # find the title_change (or timeout).
    async def wait_for(ws, msg_type, timeout=5):
        deadline = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < deadline:
            remaining = deadline - asyncio.get_event_loop().time()
            m = json.loads(await asyncio.wait_for(ws.recv(), timeout=remaining))
            print(f"  <- {m}")
            if m.get("type") == msg_type:
                return m
        raise AssertionError(f"Did not receive {msg_type} within {timeout}s")

    msg_a2 = await wait_for(ws_a, "title_change")
    assert msg_a2["title"] == "New Title By Bob"

    await ws_a.close()
    await ws_b.close()

    # Give backend a moment to persist and verify the DB was updated
    await asyncio.sleep(1.5)
    async with httpx.AsyncClient(timeout=15) as c:
        doc_after = (await c.get(f"{BACKEND}/api/documents/{doc_id}",
                                 headers={"Authorization": f"Bearer {t1}"})).json()
    print(f"Persisted title:   {doc_after['title']}")
    print(f"Persisted content: {doc_after['content']}")
    assert doc_after["title"] == "New Title By Bob"
    assert doc_after["content"] == "Alice edited this"

    print("\n\u2705 All WebSocket tests passed!")


asyncio.run(main())
