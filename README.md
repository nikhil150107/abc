# Full Stack Auth Setup (Hackathon Ready)

## Project Structure

```
abc/
├── Backend/          # Node.js + Express + MongoDB backend
│   ├── controllers/  # Auth controllers (register, login, OTP, password reset)
│   ├── database/     # MongoDB connection (db.js)
│   ├── helper/       # Email helper (nodemailer)
│   ├── middleware/   # JWT auth middleware
│   ├── models/       # User model
│   ├── routes/       # Auth & dashboard routes
│   ├── .env.example  # Environment variables template
│   ├── server.js     # Server entry point
│   └── package.json
│
└── Frontend/         # React + Vite frontend
    ├── src/
    │   ├── api/          # API request helper
    │   ├── context/      # Auth context (token, user state)
    │   ├── pages/        # Login, Register, OTP, Forgot/Reset Password, Dashboard
    │   ├── App.jsx       # Router setup
    │   ├── App.css       # Styles
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## Features

- ✅ User Registration (with email OTP verification)
- ✅ OTP Verification
- ✅ Resend OTP
- ✅ Login with JWT
- ✅ Forgot Password (OTP via email)
- ✅ Reset Password
- ✅ Protected Dashboard
- ✅ MongoDB database

## Setup

### Backend
```bash
cd Backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URL, JWT secret, and Gmail credentials
npm run dev
```

### Frontend
```bash
cd Frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`, Backend on `http://localhost:5000`.

## Environment Variables (Backend/.env)

```
PORT=5000
MONGO_URL=mongodb://localhost:27017/your_database_name
JWT_SECRET_KEY=your_jwt_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

> **Note for Gmail:** Use an App Password (not your regular password) in `EMAIL_PASS`. Generate one at https://myaccount.google.com/apppasswords

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user (sends OTP email) |
| POST | `/api/auth/verify-otp` | Verify email with OTP |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/forgot-password` | Send OTP for password reset |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| GET | `/api/dashboard` | Protected route (requires JWT) |

## Pages

- `/login` - Login page
- `/register` - Registration page
- `/verify-otp` - OTP verification page
- `/forgot-password` - Forgot password page
- `/reset-password` - Reset password page
- `/dashboard` - Protected dashboard (requires login)