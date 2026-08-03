# CloudCollab

A full-stack collaborative workspace platform built with **React**, **Express**, **MongoDB**, and **Socket.IO** — think Trello + Slack-lite for small teams.

## Tech Stack

| Layer      | Technology                            |
|------------|----------------------------------------|
| Frontend   | React 19 (Vite), React Router, Axios, Socket.IO Client |
| Backend    | Express 5, Socket.IO                  |
| Database   | MongoDB (Mongoose ODM)                |
| Auth       | JWT, bcryptjs                         |
| File Upload| Multer (wired for documents; not yet used elsewhere) |

## What's implemented

- **Auth** — register, login, JWT-protected routes, session rehydration on page refresh
- **Workspaces** — create/update/delete, invite members by email, per-member roles (owner / admin / member)
- **Projects** — CRUD within a workspace, status, due dates
- **Tasks / Kanban** — drag-and-drop board (todo → in-progress → review → done), priority, labels, due dates, assignees, comments — all synced live over Socket.IO to everyone viewing the same board
- **Documents** — a generic real-time collaborative text document (from the original scaffold), with live cursor/delta broadcasting
- Socket.IO connections are authenticated with the same JWT used for REST calls

## Not implemented yet

- Team chat (Slack-style channels/DMs)
- File sharing/uploads outside of the document feature
- Notifications feed / activity log
- Calendar view
- Admin dashboard (user & workspace management, analytics)

These were intentionally deferred — see the "Continuing development" section below for suggested next steps.

## Project Structure

```
collaborative-cloud-platform/
├── backend/
│   └── src/
│       ├── config/        # DB & Socket.IO setup (Socket.IO now verifies JWT on connect)
│       ├── controllers/   # auth, document, workspace, project, task
│       ├── middleware/    # auth (protect), workspaceAccess (membership/role checks), errorHandler, upload
│       ├── models/        # User, Document, Workspace, Project, Task
│       ├── routes/        # authRoutes, documentRoutes, workspaceRoutes, projectRoutes, taskRoutes, taskDetailRoutes
│       ├── services/      # business logic per domain
│       ├── app.js
│       └── server.js
└── frontend/
    └── src/
        ├── components/    # Navbar, Modal, ProtectedRoute, TaskCard, TaskModal
        ├── context/       # AuthContext (wired to the API), SocketContext
        ├── hooks/         # useCollaboration (document real-time editing)
        ├── pages/         # Home, Login, Register, Dashboard, WorkspaceDetail, ProjectBoard
        └── services/      # api.js (axios instance) + one service module per domain
```

### API overview

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:workspaceId
PUT    /api/workspaces/:workspaceId
DELETE /api/workspaces/:workspaceId
POST   /api/workspaces/:workspaceId/members
DELETE /api/workspaces/:workspaceId/members/:userId
PUT    /api/workspaces/:workspaceId/members/:userId
GET    /api/workspaces/:workspaceId/projects
POST   /api/workspaces/:workspaceId/projects

GET    /api/projects/:projectId
PUT    /api/projects/:projectId
DELETE /api/projects/:projectId
GET    /api/projects/:projectId/tasks
POST   /api/projects/:projectId/tasks

GET    /api/tasks/:taskId
PUT    /api/tasks/:taskId
DELETE /api/tasks/:taskId
PATCH  /api/tasks/:taskId/move
POST   /api/tasks/:taskId/comments

POST   /api/documents  ...  (see documentRoutes.js — from the original scaffold)
```

Socket.IO events: `join:room` / `leave:room`, `task:created` / `task:updated` / `task:moved` / `task:deleted` / `task:comment`, `document:change` / `document:update`, `cursor:move` / `cursor:update`, `typing:start` / `typing:stop`.

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas connection string)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # edit with your Mongo URI and a real JWT secret
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the API at `http://localhost:5000/api` and the Socket.IO server at `http://localhost:5000` by default (see `frontend/.env` / `vite.config.js` proxy). Visit `http://localhost:5173`, register an account, create a workspace, and you're in.

## Continuing development

Suggested order for the remaining features, since each builds naturally on what's already here:

1. **Notifications** — you already have Socket.IO rooms per workspace/project; add a `Notification` model and emit into a `user:<id>` room on invites, assignments, and comments.
2. **Chat** — reuse the `join:room` / `typing:start` events already in `config/socket.js`; add a `Message` model and a `workspace:<id>` chat room.
3. **File sharing** — `multer` is already a dependency and partially wired for documents; extend it with a `File` model and attach uploads to tasks/projects.
4. **Admin dashboard** — `User.role` already has an `admin` enum value and `middleware/auth.js` has an `authorize()` helper ready to use; add admin-only routes for user/workspace management.

## License

MIT
