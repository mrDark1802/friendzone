# 🌐 FriendZone — Real-Time Social & Translation Platform

> **Connect across cultures. Chat without language barriers.**
> 
> FriendZone is a production-ready, real-time social platform designed to discover friends worldwide and communicate seamlessly with automated, real-time message translation.

---

## 🎯 Purpose & Core Value Proposition

Language barriers often prevent meaningful international friendships and global collaboration. **FriendZone** solves this by combining verified social networking with real-time, context-aware message translation:

- **Discover & Connect**: Find members across the globe and build authentic user connections.
- **Mandatory Email Verification**: Prevents bots, spam registrations, disposable accounts, and fake profiles.
- **1-on-1 & Group Conversations**: Chat directly with friends or create group channels for shared interests.
- **Real-Time Translation Engine**: Automatically translates incoming messages into each member's native language in real time without interrupting the conversation flow.

---

## 🛠️ Complete Tech Stack

### **Frontend Suite (`friendzone-client`)**
| Component | Technology | Description |
| :--- | :--- | :--- |
| **Core Framework** | **React 18 + Vite** | Fast SPA rendering and HMR development |
| **Language** | **TypeScript** | Type-safe state management, APIs, and props |
| **Styling** | **Tailwind CSS** | Custom design system (`#07080e` background, `#11131f` surfaces, Indigo accent) |
| **Icons & Motion** | **Lucide React** | Production icon set and smooth CSS transitions |
| **Routing** | **React Router v6** | Public marketing routes and protected dashboard layouts |
| **Real-Time Data** | **Socket.IO Client** | Bi-directional WebSocket communication for instant messaging & online status |

### **Backend Suite (`friendzone-server`)**
| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime / Framework** | **Node.js + Express.js** | Enterprise modular Express application in TypeScript |
| **Database ORM** | **Prisma ORM 5** | Type-safe database queries with PostgreSQL |
| **Primary Database** | **PostgreSQL (Supabase)** | Relational storage for users, friendships, messages, and translations |
| **Cache & Rate Limiting** | **Redis (Upstash)** | Real-time presence tracking & sliding-window rate limiters |
| **WebSockets** | **Socket.IO Server** | Room-based socket isolation (`user:id`, `conv:id`) with JWT handshake auth |
| **Translation Engine** | **Azure Cognitive Services** | Cloud AI translator with dynamic multi-language fallback |
| **Email Dispatcher** | **Resend API + Nodemailer** | Dual-transport dispatcher for verification and password reset emails |
| **Validation & Security** | **Zod + Helmet + CORS** | Request body validation, HTTP security headers, and production origin whitelisting |

---

## 🔒 Security & Architecture Highlights

### **1. Mandatory Email Verification Boundary**
- Accounts are created in an `UNVERIFIED` state (`isVerified = false`).
- Hard backend middleware (`requireVerifiedEmail`) blocks unverified access to protected API routes.
- Attempting login with unverified credentials triggers an automatic client redirect to `/verify-email?email=user@domain.com`.

### **2. Hard Authorization & BOLA/IDOR Defense**
- Server endpoints never trust client-supplied user IDs in request bodies or query parameters.
- User identity is derived directly from verified JWT access tokens (`req.user!.userId`).
- Conversation member verification (`conversationMember.findUnique`) enforces strict permission checks before permitting message creation or reading.

### **3. Reject Friend Request & Row Cleanup**
- Canonical pair algorithm (`userId1 < userId2`) ensures consistent database lookup for user relationships.
- Rejecting a friend request executes `prisma.friendship.delete(...)` to completely delete the database record, allowing users to send clean re-requests in the future.

### **4. Real-Time Translation & Quota Management**
- Automatically detects message language and translates text into each recipient's native language.
- Enforces user translation quotas (`QuotaService`) to manage API resource utilization.

---

## 📁 Repository Structure

```text
friendzone/
├── friendzone-client/          # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── components/         # Reusable UI widgets (QuotaTracker, ProtectedRoute, Navbar)
│   │   ├── context/            # AuthContext (JWT state, login, logout, verification status)
│   │   ├── layouts/            # Public & Dashboard Layouts
│   │   ├── pages/              # App screens (HomePage, SignIn, SignUp, Dashboard, Chat, Contacts, Requests, Settings)
│   │   ├── routes/             # App route definitions (publicRouteConfig, protectedRouteConfig)
│   │   └── services/           # Axios API client & Socket.IO listener managers
│   └── package.json
│
├── friendzone-server/          # Express.js + Prisma Backend API Server
│   ├── prisma/                 # PostgreSQL Database Schema & Migration files
│   ├── src/
│   │   ├── config/             # Zod environment validation, logger, Redis, database setup
│   │   ├── infrastructure/     # Socket.IO server & background worker queues
│   │   ├── middleware/         # JWT authentication, verified email, rate limit, validation
│   │   ├── modules/            # API Modules (auth, users, friendships, conversations, messages, notifications)
│   │   ├── services/           # Email dispatcher (Resend/SMTP) & Translation services
│   │   └── app.ts              # Express application factory & middleware setup
│   └── package.json
│
└── README.md                   # Root Documentation
```

---

## ⚡ API Endpoints Summary

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public / Rate-limited | Registers a new account in `UNVERIFIED` state |
| `POST` | `/api/v1/auth/login` | Public / Rate-limited | Authenticates user & issues access/refresh tokens |
| `GET` | `/api/v1/auth/verify-email` | Public | Validates verification token & activates account |
| `POST` | `/api/v1/auth/resend-verification` | Public / Rate-limited | Resends email verification link |
| `POST` | `/api/v1/auth/forgot-password` | Public / Rate-limited | Dispatches password reset link |
| `POST` | `/api/v1/auth/reset-password` | Public / Rate-limited | Resets password with valid reset token |
| `GET` | `/api/v1/users/me` | JWT + Verified Email | Fetches authenticated user profile & quota |
| `PATCH` | `/api/v1/users/me` | JWT + Verified Email | Updates display name, native language, and preferences |
| `POST` | `/api/v1/users/me/password` | JWT + Verified Email | Changes account password |
| `GET` | `/api/v1/friendships` | JWT + Verified Email | Lists user friends and pending requests |
| `POST` | `/api/v1/friendships/request` | JWT + Verified Email | Sends a friend request to another member |
| `POST` | `/api/v1/friendships/accept` | JWT + Verified Email | Accepts an incoming friend request |
| `POST` | `/api/v1/friendships/reject` | JWT + Verified Email | Rejects a friend request and deletes database entry |
| `GET` | `/api/v1/conversations` | JWT + Verified Email | Retrieves user active 1-on-1 and group conversations |
| `GET` | `/api/v1/messages/:conversationId` | JWT + Verified Email | Cursor-paginated message feed with live translation |
| `POST` | `/api/v1/notifications/read` | JWT + Verified Email | Marks notifications as read |

---

## 🚀 Getting Started

### **Prerequisites**
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **PostgreSQL Database**: Supabase or local instance
- **Redis Server**: Upstash or local instance

### **1. Server Setup (`friendzone-server`)**
```bash
# Navigate to server directory
cd friendzone-server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Update DATABASE_URL, REDIS_URL, JWT_SECRET, RESEND_API_KEY in .env

# Push Prisma schema to database (non-destructive)
npx prisma db push

# Start development server
npm run dev
```
Server runs on `http://localhost:5000`.

---

### **2. Client Setup (`friendzone-client`)**
```bash
# Navigate to client directory
cd friendzone-client

# Install dependencies
npm install

# Configure environment variables
# .env -> VITE_API_BASE_URL=http://localhost:5000/api/v1

# Start Vite development server
npm run dev
```
Client runs on `http://localhost:5173`.

---

## 🌐 Production Deployments

- **Production Backend API**: `https://friendzone-g05i.onrender.com`
- **Official Web Application**: `https://sandeepworks.in`
- **Support Contact**: `friendzone_live@proton.me`

---

## 📜 License

This project is licensed under the MIT License — see the repository files for details.