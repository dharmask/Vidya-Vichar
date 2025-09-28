# VidyaVichar – MERN Sticky Q&A Board (Live updates via SSE)

github repo link- https://github.com/incredibleharsh021/Vidya-Vichar.git


A real‑time classroom Q&A “sticky note” board for lectures. Students post questions; Teachers (and TAs) triage, reply, mark important, and close them. Live updates are pushed over **Server‑Sent Events (SSE)** so everyone sees changes instantly.

---

## ✨ Features
- **Auth**: Sign up / login with roles — *student*, *ta*, *teacher* (JWT auth).
- **Classes & Lectures**: Teacher creates classes (auto‑generated join **code**) and lectures.
- **Student experience**: Join by code, pick lecture, ask questions (client‑side duplicate check; server enforces uniqueness per lecture per author).
- **Teacher tools**: Mark important, answer/close, **delete** questions, remove students.
- **TA tools**: View the board and **reply/close** (cannot delete).
- **Live board**: Realtime updates with **SSE**. No polling.
- **Resilient UX**: Selected class/lecture remembered across refresh. Optional **Dark Mode** toggle.
- **MongoDB models**: Users, Classes, Lectures, Questions.

---

## 🧱 Tech Stack
- **Client**: React ^18.3.1 + Vite ^5.4.2
- **Server**: Express ^4.19.2, JWT ^9.0.2, Mongoose ^8.6.0, CORS ^2.8.5, Morgan ^1.10.0
- **DB**: MongoDB (local or Atlas)
- **Realtime**: Server‑Sent Events (SSE)

---

## 📁 Monorepo Layout
```
fool_final/
├─ client/                 # React + Vite app
│  ├─ src/
│  │  ├─ App.jsx
│  │  ├─ main.jsx
│  │  ├─ styles.css
│  │  └─ pages/
│  │     ├─ Login.jsx      # Sign up / Login with role selector & Dark Mode
│  │     ├─ Student.jsx    # Join class, pick lecture, ask questions
│  │     ├─ Teacher.jsx    # Create class/lecture, manage board & members
│  │     ├─ TA.jsx         # View & reply to questions (no delete)
│  │     └─ Board.jsx      # Live board (SSE), duplicate detection, filters
│  ├─ vite.config.js
│  └─ .env                 # VITE_API_URL=http://localhost:5000
│
└─ server/                 # Express API
   ├─ src/
   │  ├─ index.js          # App init, CORS, routes, Mongo connect
   │  ├─ middleware/auth.js
   │  ├─ models/           # User, Class, Lecture, Question
   │  ├─ routes/
   │  │  ├─ auth.js
   │  │  ├─ classes.js
   │  │  ├─ lectures.js
   │  │  └─ questions.js
   │  └─ utils/            # genCode (class code), sse (pub/sub)
   ├─ .env.example
   └─ package.json
```

---

## 🚀 Quick Start

### 1) Prerequisites
- Node.js 18+ and npm
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

### 2) Server
```bash
cd server
cp .env.example .env
# edit .env: MONGO_URI, JWT_SECRET, CLIENT_ORIGIN (defaults to http://localhost:5173)
npm install
npm run dev
# server on http://localhost:5000
```

**`server/.env`**
```ini
MONGO_URI=mongodb://127.0.0.1:27017/vidyavichar
JWT_SECRET=change-me
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

### 3) Client
```bash
cd client
echo "VITE_API_URL=http://localhost:5000" > .env
npm install
npm run dev
# app on http://localhost:5173
```

---

## 🔐 Roles & Permissions

| Action | Student | TA | Teacher |
|---|:--:|:--:|:--:|
| Register / Login | ✅ | ✅ | ✅ |
| Join class by code | ✅ | ❌ | ❌ |
| Create class | ❌ | ❌ | ✅ |
| Create lecture | ❌ | ❌ | ✅ |
| View board (class member) | ✅ | ✅ | ✅ |
| Ask question | ✅ | ✅ (for testing/use if needed) | ✅ (rare) |
| Mark important / answer / close | ❌ | ✅ | ✅ |
| **Delete** question | ❌ | ❌ | ✅ |
| Remove student / add TA | ❌ | ❌ | ✅ |

> **TA access** to a class is granted by the teacher via **POST `/api/classes/:id/add-ta`** with the TA’s email (the TA must have registered with role = `ta`).

---

## 🧩 API — Quick Reference

All JSON unless noted. Authenticated routes require header: `Authorization: Bearer <JWT>`.

### Auth
- `POST /api/auth/register` → create account  
  Body: `{"name","email","password","role":"student|ta|teacher"}`
- `POST /api/auth/login` → get ``{ token, user }``  
  Body: `{"email","password"}`

### Classes
- `POST /api/classes` *(teacher)* → create class  
  Body: `{"subject"}` → `{ _id, subject, code, owner, ... }`
- `GET /api/classes/my` → classes for current user (based on role)
- `GET /api/classes/:id` → class details with members
- `POST /api/classes/:id/lectures` *(teacher)* → create lecture  
  Body: `{"title"}`
- `GET /api/classes/:id/lectures` → list lectures (members only)
- `POST /api/classes/join` *(student)* → join by code  
  Body: `{"code"}`
- `POST /api/classes/:id/add-ta` *(teacher)* → add an existing **ta** by email  
  Body: `{"email"}`
- `POST /api/classes/:id/remove-student` *(teacher)*  
  Body: `{"studentId"}`

### Lectures
- `GET /api/lectures/:id/questions` → list questions for lecture
- `POST /api/lectures/:id/questions` → create question  
  Body: `{"text"}`  
  > Duplicate prevention: server enforces unique `(lectureId, author, text)`.
- `GET /api/lectures/:id/stream?token=<JWT>` → **SSE** stream for live updates

### Questions
- `PATCH /api/questions/:id` *(teacher | ta)* → update  
  Body (any): `{"important":bool,"status":"open|answered|deleted","answer":string}`
- `DELETE /api/questions/:id` *(teacher)* → delete (sets status `deleted`)

---

## 🗄️ Data Models (Mongoose)

### User
```js
{ name, email, passwordHash, role: 'student'|'teacher'|'ta',
  classesEnrolled: [ClassId], classesTeaching: [ClassId], classesTA: [ClassId] }
```

### Class
```js
{ subject, code, owner: UserId, tas: [UserId], students: [UserId] }
```

### Lecture
```js
{ classId: ClassId, title }
```

### Question
```js
{ lectureId: LectureId, text, author: UserId,
  important: Boolean, status: 'open'|'answered'|'deleted',
  answer: String, answeredBy: UserId }
```
> Index: `({ lectureId, author, text }, { unique: true })`

---

## 🛰️ Realtime (SSE) Notes
- The client listens on `GET /api/lectures/:id/stream?token=<JWT>` using `EventSource`.
- SSE cannot send `Authorization` headers, so the JWT is passed as a **query param** and verified server‑side.
- Server emits events like `{ "type": "create" | "update" | "delete", "id": "<questionId>" }` and the client re-fetches when needed.

---

## 🧪 Manual Test Flow

1) **Register** three accounts in the UI: a **teacher**, a **student**, and a **ta**.  
2) As **teacher** → create a class ("DSAPS") → copy **code**.  
3) As **student** → *Join* using the code.  
4) As **teacher** → create a **lecture** ("Heap Basics").  
5) As **student** → select class+lecture → ask a few questions.  
6) As **ta** → ask the teacher to *Add TA* by email to the class → open the board, **reply/close**.  
7) Watch live updates reflect instantly across all three accounts.

---

## 🧰 Troubleshooting

- **CORS / 401 on SSE**: Ensure `CLIENT_ORIGIN` in `server/.env` matches the client URL and the client sends `?token=<JWT>` to `/stream`.
- **Mongo connect error**: Check `MONGO_URI` and that `mongod` is running (or use an Atlas URI).
- **403 “Not class owner”** on manage actions: you must be the teacher who created the class.
- **409 Duplicate question**: same `(lectureId, author, text)` exists — edit the text slightly.
- **Port clashes**: change `PORT` (server) or `VITE_PORT` (client: run with `--port 5173`).

---

## 📜 Scripts

**Server**
```bash
npm run dev    # start API on http://localhost:5000
npm start      # same (no nodemon)
```

**Client**
```bash
npm run dev       # start Vite dev server
npm run build     # production build to dist/
npm run preview   # preview built files
```

---

## 📝 License
Educational sample. Add your preferred license if you publish.
