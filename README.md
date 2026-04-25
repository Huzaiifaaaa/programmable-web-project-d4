# ProBot Client
**PWP SPRING 2026 — React Web Client**

> A ChatGPT-style React web application for the ProBot AI chat API. Built with React, Bootstrap, and Axios.

### Group Information
* **Student 1:** Muhammad Huzaifa (Muhammad.Huzaifa@student.oulu.fi)
* **Student 2:** Safi Shah (Safi.Shah@student.oulu.fi)
* **Student 3:** Zhenfei Sun (Zhenfei.Sun@student.oulu.fi)

---

## 1. Overview

ProBot Client is a single-page web application that provides a polished, dark-themed chat interface for the ProBot REST API. It was built to give users a familiar, modern experience similar to ChatGPT — with a collapsible sidebar for chat management and a focused conversation view on the right.

**Why this client?**
The ProBot API exposes a powerful Gemini-backed conversation system, but without a client it can only be used via raw HTTP tools like curl or Postman. This client makes the API accessible to any user through a browser, with no technical knowledge required.

**Key features:**
- JWT authentication with persistent login
- ChatGPT-style layout — sidebar with all chats, main area for conversation
- Create, view, search, and delete chat sessions
- Send messages and receive AI replies with a live typing indicator
- Markdown rendering for AI responses (including code blocks)
- Model selector — switch between Gemini 3 Flash, 2.0 Flash, and 1.5 Pro
- Timestamps and copy-to-clipboard on every message
- Toast notifications for all user actions
- Fully responsive dark-themed UI
- Informative error handling for all API error codes

### API Resources and Methods Accessed

| Screen | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| Sign Up | `POST` | `/api/v1/signup/` | Register a new user account |
| Login | `POST` | `/api/v1/login/` | Authenticate and receive JWT token |
| Chat List (sidebar) | `GET` | `/api/v1/users/<user_key>/chats/` | Load all chats for the logged-in user |
| New Chat | `POST` | `/api/v1/chats/` | Create a new chat session |
| Delete Chat | `DELETE` | `/api/v1/chats/<chat_key>/` | Delete a chat session |
| View Messages | `GET` | `/api/v1/chats/<chat_key>/messages/` | Load full message history of a chat |
| Send Message | `POST` | `/api/v1/chats/<chat_key>/messages/` | Send a user message and receive AI reply |

---

## 2. Use Case Diagram

```
                        ┌─────────────────────────────────────────┐
                        │              ProBot Client               │
                        │                                          │
  ┌──────────┐          │  ┌────────────────────────────────────┐ │
  │          │──────────┼─▶│ Register a new account             │ │
  │          │          │  └────────────────────────────────────┘ │
  │          │          │                                          │
  │          │──────────┼─▶┌────────────────────────────────────┐ │
  │          │          │  │ Log in with email and password      │ │
  │          │          │  └────────────────────────────────────┘ │
  │          │          │                                          │
  │          │──────────┼─▶┌────────────────────────────────────┐ │
  │          │          │  │ View all chat sessions              │ │
  │          │          │  └────────────────────────────────────┘ │
  │   User   │          │                                          │
  │          │──────────┼─▶┌────────────────────────────────────┐ │
  │          │          │  │ Search chats                        │ │
  │          │          │  └────────────────────────────────────┘ │
  │          │          │                                          │
  │          │──────────┼─▶┌────────────────────────────────────┐ │
  │          │          │  │ Create a new chat session           │ │
  │          │          │  └────────────────────────────────────┘ │
  │          │          │                                          │
  │          │──────────┼─▶┌────────────────────────────────────┐ │
  │          │          │  │ Open a chat and view messages       │ │
  │          │          │  └────────────────────────────────────┘ │
  │          │          │                                          │
  │          │──────────┼─▶┌────────────────────────────────────┐ │
  │          │          │  │ Send a message to AI                │ │
  │          │          │  └────────────────────────────────────┘ │
  │          │          │                                          │
  │          │──────────┼─▶┌────────────────────────────────────┐ │
  │          │          │  │ Select AI model for response        │ │
  │          │          │  └────────────────────────────────────┘ │
  │          │          │                                          │
  │          │──────────┼─▶┌────────────────────────────────────┐ │
  │          │          │  │ Copy a message to clipboard         │ │
  │          │          │  └────────────────────────────────────┘ │
  │          │          │                                          │
  │          │──────────┼─▶┌────────────────────────────────────┐ │
  │          │          │  │ Delete a chat session               │ │
  │          │          │  └────────────────────────────────────┘ │
  │          │          │                                          │
  └──────────┘──────────┼─▶┌────────────────────────────────────┐ │
                        │  │ Log out                             │ │
                        │  └────────────────────────────────────┘ │
                        └─────────────────────────────────────────┘
```
---

## 3. Installation & Setup

### Prerequisites

- Node.js 18+
- npm 9+
- ProBot API running at `http://localhost:5000` (or production URL)

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-username/probot-client.git
cd probot-client
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
REACT_APP_API_URL={URL}/api/v1
```

## 4. Running the Client

### Development

```bash
npm start
```

Opens at `http://localhost:3000`

### Production build

```bash
npm run build
```

Output goes to `build/` — serve with any static file server:

```bash
npx serve -s build
```

---

## 5. Project Structure

```
src/
├── api/
│   └── probot.js           # All API calls — axios client with JWT interceptor
├── context/
│   └── AuthContext.jsx     # Global auth state (token, user, login, logout)
├── pages/
│   ├── LoginPage.jsx       # Login screen
│   ├── SignupPage.jsx      # Registration screen
│   └── ChatsPage.jsx       # Main layout — sidebar + nested chat route
├── App.jsx                 # Router setup and protected routes
├── App.css                 # Global dark theme styles
└── index.js                # React entry point
```
---

## 6. API Resources Accessed

All requests go through `src/api/probot.js`. The base URL is configurable via `REACT_APP_API_URL`.

| Function | Method | Path | Auth |
|----------|--------|------|------|
| `signup()` | POST | `/signup/` | No |
| `login()` | POST | `/login/` | No |
| `getUserChats()` | GET | `/users/:user_key/chats/` | Bearer JWT |
| `createChat()` | POST | `/chats/` | Bearer JWT |
| `deleteChat()` | DELETE | `/chats/:chat_key/` | Bearer JWT |
| `getMessages()` | GET | `/chats/:chat_key/messages/` | Bearer JWT |
| `sendMessage()` | POST | `/chats/:chat_key/messages/` | Bearer JWT |

---

## 7. Sources & Attribution

| Resource | Usage |
|----------|-------|
| [React documentation](https://react.dev) | Component patterns, hooks |
| [React Router v6](https://reactrouter.com) | Routing and nested routes |
| [Axios documentation](https://axios-http.com) | HTTP client and interceptors |
| [React Bootstrap](https://react-bootstrap.github.io) | UI components |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Markdown rendering in AI responses |
| [react-toastify](https://fkhadra.github.io/react-toastify) | Toast notifications |
| [React Icons](https://react-icons.github.io/react-icons/) | FI icon set |
| [Google Fonts — DM Sans / DM Mono](https://fonts.google.com) | Typography |
| Claude Sonnet (Anthropic) | Code generation assistance, component structure |
