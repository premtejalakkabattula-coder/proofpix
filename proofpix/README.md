# ProofPix 🔐
### Digital Media Ownership, Protection & Verification Platform

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16+ installed
- **MongoDB** running locally (or MongoDB Atlas URI)

---

## 📦 Installation & Setup

### Step 1 — Clone / Extract the project
```
proofpix/
  ├── backend/
  └── frontend/
```

### Step 2 — Install backend dependencies
```bash
cd proofpix/backend
npm install
```

### Step 3 — Configure environment
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your values:
# PORT=5001
# MONGO_URI=mongodb://localhost:27017/proofpix
# JWT_SECRET=your_super_secret_key_here
# FRONTEND_URL=http://localhost:3000
```

### Step 4 — Start MongoDB (if running locally)
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Step 5 — Seed the database (optional)
```bash
# From the backend/ directory:
npm run seed
```

If you want to create an initial user, the seed script will add:
- Email: `admin@proofpix.local`
- Password: `Password123`

### Step 6 — Start the server
```bash
# From the backend/ directory:
npm start

# Or for development (auto-restart):
npm run dev
```

### Step 7 — Open the app
Visit: **http://localhost:5001**

---

## 🌐 Application Pages

| Page | URL | Description |
|------|-----|-------------|
| Landing | `/` | Home page with feature overview |
| Sign Up | `/signup` | Create a new account |
| Login | `/login` | Sign in |
| Dashboard | `/dashboard` | View & manage your files |
| Upload | `/upload` | Upload & protect a file |
| View | `/view/:hash` | Secure content viewer |
| Verify | `/verify` | Check if any file is registered |

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | No | Register new user |
| POST | `/api/auth/login` | No | Login and get JWT |
| GET | `/api/auth/me` | JWT | Get current user info |

### Files
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/files/upload` | JWT | Upload & protect a file |
| GET | `/api/files/view/:hash` | No | Stream a file by hash |
| GET | `/api/files/view-meta/:hash` | No | Get file metadata |
| GET | `/api/files/my-files` | JWT | List current user's files |
| DELETE | `/api/files/:id` | JWT | Delete a file |

### Verify
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/verify` | No | Check if a file is registered |

---

## 📁 Project Structure

```
proofpix/
├── frontend/
│   ├── index.html          # Single Page Application
│   ├── css/
│   │   └── style.css       # Dark theme styles
│   └── js/
│       └── app.js          # SPA routing & logic
│
├── backend/
│   ├── server.js           # Express entry point
│   ├── package.json
│   ├── .env.example
│   ├── uploads/            # Stored files (auto-created)
│   ├── models/
│   │   ├── User.js         # User schema
│   │   └── Media.js        # Media metadata schema
│   ├── routes/
│   │   ├── auth.js         # Signup, Login, Me
│   │   ├── files.js        # Upload, View, Delete
│   │   └── verify.js       # Verification endpoint
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   └── utils/
│       ├── multerConfig.js # File upload config
│       └── mediaProcessor.js # Watermark + SHA-256
```

---

## ✨ Features

### 🔐 Authentication
- JWT-based auth with 7-day token expiry
- bcrypt password hashing (12 rounds)
- Protected routes on both frontend & backend

### 📤 Upload & Protection
- Drag-and-drop or click-to-browse upload
- Automatic watermark applied to images (bottom-right)
- SHA-256 fingerprint generated for every file
- Metadata stored in MongoDB
- Duplicate detection with console logging

### 🔗 Secure Sharing
- Each file gets a unique `/view/:hash` URL
- Direct `/uploads/` access is blocked (403)
- Files served only through hash-authenticated route

### 🔍 Verification
- Upload any file to check if it's registered
- Returns owner name, registration date, and hash
- Works without needing an account

### 📊 Dashboard
- Grid view of all uploaded files
- Thumbnail previews for images
- Copy share link, view, or delete actions

---

## 🔒 Security Notes

- Passwords are never stored in plain text
- JWT tokens expire after 7 days
- File types are validated on upload (whitelist-based)
- Max file size: 50MB
- Direct file path access is blocked
- Files accessible only via hash-based routes

---

## 📝 Notes for Developers

- Videos are stored and hashed but NOT watermarked (requires ffmpeg — not included in MVP)
- The `uploads/` folder is gitignored — don't delete it, the backend creates it automatically
- The frontend is a Single Page Application (SPA) served by Express from `/frontend`
- MongoDB connection string defaults to `mongodb://localhost:27017/proofpix` if `.env` is not set

---

## 🛠 Troubleshooting

**"Cannot connect to MongoDB"**
→ Make sure MongoDB is running. Check `mongod` service.

**"Port 5001 already in use"**
→ Change `PORT=5002` in `.env`

**Sharp installation issues**
→ Run `npm rebuild sharp` or check Node.js version compatibility

**Files not showing in dashboard**
→ Check MongoDB is running and JWT token is valid (try logging out and back in)
