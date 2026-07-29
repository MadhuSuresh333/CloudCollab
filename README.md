# ☁️ CloudCollab

A cloud-based collaborative workspace designed to help remote teams communicate, manage projects, assign tasks, and securely share files—all from a single platform.

> **🚧 Project Status:** This project is currently under active development. Core features have been implemented, and bug fixing, optimization, and feature enhancements are ongoing.

---

# 📖 Description

CloudCollab is a full-stack web application that provides a centralized platform for remote teams to collaborate efficiently. It eliminates the need to switch between multiple tools by combining project management, real-time communication, task tracking, and secure file sharing into one seamless application.

The platform is built using the MERN stack with Socket.IO for real-time communication and follows a scalable client-server architecture.

---

# ✨ Key Features

- 👥 User Authentication & Authorization
- 📂 Create and Manage Projects
- ✅ Task Assignment and Progress Tracking
- 💬 Real-Time Team Chat
- 📁 Secure Cloud File Upload & Sharing
- 🔔 Instant Notifications
- 👤 User Profiles
- 📊 Project Dashboard
- 📱 Responsive UI
- ⚡ Real-Time Updates using Socket.IO

---

# 🛠️ Tech Stack

## Frontend

- React.js
- Vite
- HTML5
- CSS3
- JavaScript (ES6+)
- Axios

## Backend

- Node.js
- Express.js
- Socket.IO
- JWT Authentication
- Multer

## Database

- MongoDB Atlas
- Mongoose

## Cloud & DevOps

- Cloudinary (File Storage)
- Git & GitHub

---

# ⚙️ Project Workflow

```
User
   │
   ▼
React Frontend
   │
REST APIs / Socket.IO
   │
Express.js Server
   │
MongoDB Atlas
   │
Cloudinary (File Storage)
```

---

# 🚀 How the Project Works

1. Users create an account and log in securely.
2. A project workspace is created.
3. Team members are invited to collaborate.
4. Tasks are assigned to members.
5. Files are uploaded and shared securely.
6. Team members communicate through real-time chat.
7. Project progress is updated instantly for everyone.

---

# 📂 Project Structure

```
CloudCollab/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── config/
│   ├── sockets/
│   └── package.json
│
└── README.md
```

---

# ⚡ Installation

## Clone the Repository

```bash
git clone https://github.com/yourusername/cloudcollab.git

cd cloudcollab
```

---

## Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## Install Backend Dependencies

```bash
cd ../backend
npm install
```

---

# 🔐 Environment Variables

Create a `.env` file inside the **backend** folder.

Example:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

# ▶️ Running the Project

### Start Backend

```bash
cd backend
npm run dev
```

### Start Frontend

```bash
cd frontend
npm run dev
```

The application will typically be available at:

```
Frontend:
http://localhost:5173

Backend:
http://localhost:5000
```

---

# 🐞 Current Development Status

The project is currently in the **testing and bug-fixing phase**.

### Ongoing Work

- Fixing authentication bugs
- Resolving Socket.IO connection issues
- Improving MongoDB connectivity
- UI polishing
- Performance optimization
- Code refactoring
- Preparing deployment

---

# 🔮 Planned Features

- Video Meetings
- Team Calendar
- Email Notifications
- Activity Logs
- Kanban Board
- Dark Mode
- Mobile Optimization
- Admin Dashboard

---

# 🤝 Contributing

Contributions, suggestions, and issue reports are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

---

# 📜 License

This project is developed for educational and learning purposes.

---

## 👨‍💻 Developer

Madhuvanthi Suresh

Final Year Computer Science Engineering Student

Aspiring Cloud & DevOps Engineer | Full Stack Developer | AWS Enthusiast
