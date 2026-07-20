"""
CloudCollab Backend API Tests
Covers: auth, workspaces, documents, files, projects, tasks, members.

Runs under pytest-xdist with `-n 2 --dist loadscope` — each class is fully
self-contained (registers its own users, creates its own workspace) so
classes can be executed on independent workers without shared state.
"""
import os
import time
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://feature-mapper-14.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
PASSWORD = "TestPass123!"


def _unique_email(tag):
    return f"test-{tag}-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}@example.com"


def _register(name, email):
    return requests.post(f"{API}/auth/register", json={"name": name, "email": email, "password": PASSWORD})


def _register_ok(name, tag):
    email = _unique_email(tag)
    r = _register(name, email)
    assert r.status_code == 201, f"register failed: {r.status_code} {r.text}"
    d = r.json()
    return {"token": d["access_token"], "user": d["user"], "email": email}


def _headers(u):
    return {"Authorization": f"Bearer {u['token']}"}


# ============== Auth ==============

class TestAuth:
    @pytest.fixture(scope="class")
    def user(self):
        return _register_ok("Auth User", "auth")

    def test_register_returns_token_and_user(self, user):
        assert user["token"]
        assert user["user"]["email"] == user["email"]
        assert user["user"]["name"] == "Auth User"
        assert "id" in user["user"]

    def test_register_duplicate_email_fails(self, user):
        r = _register("Dup", user["email"])
        assert r.status_code == 400

    def test_login_success(self, user):
        r = requests.post(f"{API}/auth/login", json={"email": user["email"], "password": PASSWORD})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == user["email"]

    def test_login_wrong_password(self, user):
        r = requests.post(f"{API}/auth/login", json={"email": user["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_login_unknown_email(self):
        r = requests.post(f"{API}/auth/login", json={"email": _unique_email("nobody"), "password": PASSWORD})
        assert r.status_code == 401

    def test_auth_me(self, user):
        r = requests.get(f"{API}/auth/me", headers=_headers(user))
        assert r.status_code == 200
        assert r.json()["email"] == user["email"]

    def test_auth_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)

    def test_auth_me_bad_token(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer bad.token.here"})
        assert r.status_code == 401


# ============== Workspaces + Members ==============

class TestWorkspacesAndMembers:
    @pytest.fixture(scope="class")
    def owner(self):
        return _register_ok("WS Owner", "wsowner")

    @pytest.fixture(scope="class")
    def other(self):
        return _register_ok("WS Other", "wsother")

    @pytest.fixture(scope="class")
    def workspace(self, owner):
        r = requests.post(f"{API}/workspaces", headers=_headers(owner),
                          json={"name": "TEST_WS", "description": "d"})
        assert r.status_code == 201, r.text
        return r.json()

    def test_create_workspace(self, owner, workspace):
        assert workspace["name"] == "TEST_WS"
        assert workspace["owner_id"] == owner["user"]["id"]

    def test_list_workspaces_includes_created(self, owner, workspace):
        r = requests.get(f"{API}/workspaces", headers=_headers(owner))
        assert r.status_code == 200
        assert workspace["id"] in [w["id"] for w in r.json()]

    def test_get_workspace(self, owner, workspace):
        r = requests.get(f"{API}/workspaces/{workspace['id']}", headers=_headers(owner))
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_WS"

    def test_non_member_cannot_access(self, other, workspace):
        r = requests.get(f"{API}/workspaces/{workspace['id']}", headers=_headers(other))
        assert r.status_code == 403

    def test_invite_member(self, owner, other, workspace):
        r = requests.post(f"{API}/workspaces/{workspace['id']}/members",
                          headers=_headers(owner),
                          json={"email": other["email"], "role": "member"})
        assert r.status_code == 201, r.text
        assert r.json()["user_email"] == other["email"]

    def test_list_members_has_owner_and_invitee(self, owner, other, workspace):
        r = requests.get(f"{API}/workspaces/{workspace['id']}/members", headers=_headers(owner))
        assert r.status_code == 200
        members = r.json()
        emails = {m["user_email"]: m["role"] for m in members}
        assert emails.get(owner["email"]) == "owner"
        assert other["email"] in emails

    def test_invite_duplicate_fails(self, owner, other, workspace):
        r = requests.post(f"{API}/workspaces/{workspace['id']}/members",
                          headers=_headers(owner),
                          json={"email": other["email"], "role": "member"})
        assert r.status_code == 400

    def test_invite_unknown_email_fails(self, owner, workspace):
        r = requests.post(f"{API}/workspaces/{workspace['id']}/members",
                          headers=_headers(owner),
                          json={"email": _unique_email("ghost"), "role": "member"})
        assert r.status_code == 404

    def test_cannot_remove_owner(self, owner, workspace):
        r = requests.delete(
            f"{API}/workspaces/{workspace['id']}/members/{owner['user']['id']}",
            headers=_headers(owner))
        assert r.status_code == 400

    def test_remove_member(self, owner, other, workspace):
        r = requests.delete(
            f"{API}/workspaces/{workspace['id']}/members/{other['user']['id']}",
            headers=_headers(owner))
        assert r.status_code == 204
        # verify no longer a member
        r2 = requests.get(f"{API}/workspaces/{workspace['id']}", headers=_headers(other))
        assert r2.status_code == 403

    def test_z_delete_workspace(self, owner, workspace):
        r = requests.delete(f"{API}/workspaces/{workspace['id']}", headers=_headers(owner))
        assert r.status_code == 204


# ============== Documents ==============

class TestDocuments:
    @pytest.fixture(scope="class")
    def user(self):
        return _register_ok("Doc User", "docuser")

    @pytest.fixture(scope="class")
    def workspace(self, user):
        r = requests.post(f"{API}/workspaces", headers=_headers(user),
                          json={"name": "TEST_DOC_WS"})
        assert r.status_code == 201
        return r.json()

    @pytest.fixture(scope="class")
    def state(self):
        return {}

    def test_create_document(self, user, workspace, state):
        r = requests.post(f"{API}/workspaces/{workspace['id']}/documents",
                          headers=_headers(user),
                          json={"title": "TEST_DOC", "content": "hello"})
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["title"] == "TEST_DOC"
        assert d["content"] == "hello"
        state["doc_id"] = d["id"]

    def test_list_documents(self, user, workspace, state):
        r = requests.get(f"{API}/workspaces/{workspace['id']}/documents", headers=_headers(user))
        assert r.status_code == 200
        assert state["doc_id"] in [d["id"] for d in r.json()]

    def test_get_document(self, user, state):
        r = requests.get(f"{API}/documents/{state['doc_id']}", headers=_headers(user))
        assert r.status_code == 200

    def test_update_document(self, user, state):
        r = requests.put(f"{API}/documents/{state['doc_id']}", headers=_headers(user),
                         json={"title": "TEST_DOC_UP", "content": "updated"})
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_DOC_UP"
        # verify persisted
        r2 = requests.get(f"{API}/documents/{state['doc_id']}", headers=_headers(user))
        assert r2.json()["content"] == "updated"

    def test_z_delete_document(self, user, state):
        r = requests.delete(f"{API}/documents/{state['doc_id']}", headers=_headers(user))
        assert r.status_code == 204
        r2 = requests.get(f"{API}/documents/{state['doc_id']}", headers=_headers(user))
        assert r2.status_code == 404


# ============== Files ==============

class TestFiles:
    @pytest.fixture(scope="class")
    def user(self):
        return _register_ok("File User", "fileuser")

    @pytest.fixture(scope="class")
    def workspace(self, user):
        r = requests.post(f"{API}/workspaces", headers=_headers(user),
                          json={"name": "TEST_FILE_WS"})
        assert r.status_code == 201
        return r.json()

    @pytest.fixture(scope="class")
    def state(self):
        return {}

    def test_upload_file(self, user, workspace, state):
        content = b"hello file contents"
        files = {"file": ("test.txt", io.BytesIO(content), "text/plain")}
        r = requests.post(f"{API}/workspaces/{workspace['id']}/files",
                          headers=_headers(user), files=files)
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["name"] == "test.txt"
        assert d["size"] == len(content)
        state["file_id"] = d["id"]

    def test_list_files(self, user, workspace, state):
        r = requests.get(f"{API}/workspaces/{workspace['id']}/files", headers=_headers(user))
        assert r.status_code == 200
        assert state["file_id"] in [f["id"] for f in r.json()]

    def test_z_delete_file(self, user, workspace, state):
        r = requests.delete(f"{API}/files/{state['file_id']}", headers=_headers(user))
        assert r.status_code == 204
        r2 = requests.get(f"{API}/workspaces/{workspace['id']}/files", headers=_headers(user))
        assert state["file_id"] not in [f["id"] for f in r2.json()]


# ============== Projects & Tasks ==============

class TestProjectsAndTasks:
    @pytest.fixture(scope="class")
    def user(self):
        return _register_ok("Proj User", "projuser")

    @pytest.fixture(scope="class")
    def workspace(self, user):
        r = requests.post(f"{API}/workspaces", headers=_headers(user),
                          json={"name": "TEST_PROJ_WS"})
        assert r.status_code == 201
        return r.json()

    @pytest.fixture(scope="class")
    def state(self):
        return {}

    def test_create_project(self, user, workspace, state):
        r = requests.post(f"{API}/workspaces/{workspace['id']}/projects",
                          headers=_headers(user), json={"name": "TEST_PROJ", "description": "d"})
        assert r.status_code == 201, r.text
        state["project_id"] = r.json()["id"]

    def test_list_projects(self, user, workspace, state):
        r = requests.get(f"{API}/workspaces/{workspace['id']}/projects", headers=_headers(user))
        assert r.status_code == 200
        assert state["project_id"] in [p["id"] for p in r.json()]

    def test_get_project(self, user, state):
        r = requests.get(f"{API}/projects/{state['project_id']}", headers=_headers(user))
        assert r.status_code == 200

    def test_create_task_todo(self, user, state):
        r = requests.post(f"{API}/projects/{state['project_id']}/tasks",
                          headers=_headers(user),
                          json={"title": "TEST_TASK", "description": "d",
                                "status": "todo", "priority": "high"})
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["status"] == "todo"
        assert d["priority"] == "high"
        state["task_id"] = d["id"]

    def test_list_tasks(self, user, state):
        r = requests.get(f"{API}/projects/{state['project_id']}/tasks", headers=_headers(user))
        assert r.status_code == 200
        assert state["task_id"] in [t["id"] for t in r.json()]

    def test_update_task_status_moves_column(self, user, state):
        r = requests.put(f"{API}/tasks/{state['task_id']}", headers=_headers(user),
                         json={"status": "in_progress"})
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"
        # persisted
        r2 = requests.get(f"{API}/tasks/{state['task_id']}", headers=_headers(user))
        assert r2.json()["status"] == "in_progress"

    def test_task_status_done(self, user, state):
        r = requests.put(f"{API}/tasks/{state['task_id']}", headers=_headers(user),
                         json={"status": "done"})
        assert r.status_code == 200
        assert r.json()["status"] == "done"

    def test_y_delete_task(self, user, state):
        r = requests.delete(f"{API}/tasks/{state['task_id']}", headers=_headers(user))
        assert r.status_code == 204

    def test_z_delete_project(self, user, state):
        r = requests.delete(f"{API}/projects/{state['project_id']}", headers=_headers(user))
        assert r.status_code == 204
