# 🛡️ PrivGuard — Autonomous DPDPA Statutory Compliance & Data Governance Platform

> **PrivGuard** is an enterprise-grade, autonomous compliance monitoring and auditing platform engineered to enforce the **Digital Personal Data Protection Act (DPDPA) 2023** and **DPDP Rules 2025 (MeitY)** across distributed applications in real time.

---

## 🌟 Executive Overview

PrivGuard acts as an independent, autonomous regulatory auditor that monitors client applications (Data Fiduciaries), detects personal data exposures, enforces purpose limitation, verifies consent lifecycles, and generates legally compliant statutory audit reports with zero performance overhead.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Client Applications (Data Fiduciaries)             │
│                                                                         │
│   [ DemoApp (Port 5001) ]                   [ Messenger (Port 5002) ]   │
│   • E-commerce & User Auth                  • Chat & OTP Messaging      │
│   • /api/audit-feed/evidence                • Zero-Touch PrivGuard SDK  │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    │ Inbound Telemetry (Events/PII)  │ Outbound Audit Scans
                    ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRIVGUARD PLATFORM                            │
│                                                                         │
│   • Real-Time Event Ingestion Engine (Port 5000)                        │
│   • Rule & Policy Engine (DPDPA 2023 Rules: POL-001 to POL-006)         │
│   • 5-Pillar Statutory Compliance Scoring Engine                        │
│   • WebSocket Live Monitoring & Violation Dispatcher                    │
│   • Autonomous Multi-Layer Evidence Scanner                             │
│   • Executive & Regulatory Audit Report PDF Generator                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 1. 🔍 Autonomous 3-Layer Evidence Scanner
PrivGuard ingests structured statutory evidence directly from client applications without touching production database credentials:
* **Layer 1 (Declared Governance)**: Privacy Notice, transparency declarations, itemized lawful purposes, retention periods, and principal rights framework.
* **Layer 2 (Observed Telemetry)**: Real-time API data flows, processing events, and server logs.
* **Layer 3 (Database Schema Discovery)**: Table schemas, discovered PII columns, and data retention ages.

### 2. ⚡ Real-Time PII & Breach Detection
* Deterministic pattern matching for high-risk Indian and global PII: **Aadhaar, PAN, Phone Numbers, Email Addresses, Physical Addresses**.
* Instant detection of **Purpose Mismatches** (e.g., OTP-only mobile used in marketing or checkout).
* Real-time notification over **Socket.IO** to auditor dashboards.

### 3. ⚖️ 5-Pillar Statutory Compliance Scoring
Computes an objective 0–100% compliance health score mapped directly to statutory provisions:
1. **Notice & Transparency (DPDPA Sec 5 & 6)**: 20 pts
2. **Data Principal Rights Framework (DPDPA Sec 11-14)**: 20 pts
3. **Log Sanitization & Technical Safeguards (DPDPA Sec 8(5))**: 20 pts
4. **Purpose Limitation & Processing Scope (DPDPA Sec 6(1))**: 20 pts
5. **Consent Lifecycle & Storage Limitation (DPDPA Sec 6(4) & Sec 8(7))**: 20 pts

### 4. 📄 Statutory PDF Audit Report Generator
Generates exportable, audit-grade DPDPA compliance reports detailing executive posture, risk scores, discovered evidence, legal violations, and step-by-step remediation guidance.

### 5. 🔌 Zero-Touch Universal SDK / Middleware
A zero-dependency Node.js/Express middleware (`privguard-middleware.js`) that automatically instruments any Express backend with statutory audit feeds and async telemetry in 1 line of code.

---

## 🏗️ Project Architecture

```
privGaurd/
├── Backend/                 # Central Auditor API & Policy Engine (Express, MongoDB, Socket.IO)
│   ├── controllers/         # Audit, Event, Policy, Violation, Auth controllers
│   ├── database/            # MongoDB connection & default policy seeding
│   ├── models/              # Event, Policy, Violation, AuditLog, User Mongoose models
│   ├── routes/              # Express API route handlers
│   ├── tests/               # Automated test suites
│   ├── demo.js              # Live scenario integration runner
│   ├── testMultiClient.js   # Multi-client end-to-end test suite
│   ├── server.js            # Server entry point (Port 5000)
│   └── package.json
│
├── Frontend/                # Auditor Operations Dashboard (React, Vite, Vanilla CSS)
│   ├── vercel.json          # SPA routing rewrite configuration for Vercel
│   ├── src/
│   │   ├── pages/           # Dashboard, LiveMonitor, Violations, Policies, AuditTrail, Settings
│   │   ├── components/      # Modal dialogs, Navigation, Stat cards, Compliance ring
│   │   ├── context/         # AuthContext
│   │   ├── api/             # api.js (Dynamic VITE_API_URL resolution)
│   │   └── utils/           # pdfGenerator.js (Audit Report PDF Engine)
│   └── package.json
│
├── event-processor/         # Standalone Event Normalization & Ingestion Service (Port 5003)
├── guard-intelligence/      # Policy Evaluation & AI Risk Analysis Pipeline
└── sdk/                     # Zero-Dependency DPDPA Compliance Middleware (privguard-middleware.js)
```

---

## ☁️ Cloud Deployment Guide (Render & Vercel)

PrivGuard is 100% cloud-ready for split deployment: **Backend on Render** and **Frontend on Vercel**.

```
┌────────────────────────────────────────────────────────┐
│               Frontend on VERCEL                       │
│    URL: https://privguard-dashboard.vercel.app         │
│    Config: VITE_API_URL=https://privguard.onrender.com │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / WSS
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend on RENDER                        │
│    URL: https://privguard.onrender.com                 │
│    Database: MongoDB Atlas                             │
└────────────────────────────────────────────────────────┘
```

---

### Step 1: Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) & click **New + &rarr; Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   * **Name**: `privguard-backend`
   * **Root Directory**: `privGaurd/Backend` (or `Backend` if repo root is `privGaurd`)
   * **Environment**: `Node`
   * **Region**: Choose the closest region (e.g., `Singapore` or `Frankfurt`)
   * **Branch**: `main`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
4. Add the following **Environment Variables** in Render:

| Variable Name | Example Value | Description |
|---|---|---|
| `PORT` | `5000` | Port (*Render sets this automatically*) |
| `MONGO_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/privguard` | MongoDB connection string |
| `JWT_SECRET_KEY` | `your_super_secret_jwt_key_here` | Secret key for JWT auth |
| `TARGET_APP_URL` | `https://demoapp-backend.onrender.com` | Live URL of the client app to audit |
| `DEMOAPP_URL` | `https://demoapp-backend.onrender.com` | Fallback URL for DemoApp |
| `EMAIL_USER` | `admin@gmail.com` | (Optional) SMTP Email for OTP |
| `EMAIL_PASS` | `xxxx xxxx xxxx xxxx` | (Optional) App password for SMTP |

5. Click **Create Web Service**. Once deployed, copy your Render URL (e.g. `https://privguard-backend.onrender.com`).

---

### Step 2: Deploy Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/) & click **Add New... &rarr; Project**.
2. Import your Git repository.
3. In the project configuration:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click *Edit* and select `privGaurd/Frontend` (or `Frontend`)
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
   * **Install Command**: `npm install`
4. Expand **Environment Variables** and add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://privguard-backend.onrender.com` | Your live Render backend URL (no trailing slash) |

5. Click **Deploy**.
6. Vercel will automatically build the React bundle. Route refreshing (e.g. `/dashboard`, `/live-monitor`) is handled seamlessly by `vercel.json`.

---

## 🚀 Local Development Quickstart

### Step 1: Start PrivGuard Backend

```bash
cd privGaurd/Backend
npm install
npm start
# Running on http://localhost:5000 (Socket.IO enabled)
```

### Step 2: Start PrivGuard Frontend

```bash
cd privGaurd/Frontend
npm install
npm run dev
# Dashboard accessible at http://localhost:5173
```

**Default Demo Credentials:**
* **Username**: `admin`
* **Password**: `Admin@123`

### Step 3: Run Multi-Client Integration Verification

```bash
cd privGaurd/Backend
node testMultiClient.js
# Runs 22 end-to-end integration tests
```

---

## 🔌 Connecting Client Applications

### Option A: Using the Zero-Touch SDK (`privguard-middleware.js`)

Mount the middleware in your Express application:

```javascript
const express = require('express');
const privguard = require('./middleware/privguard-middleware'); // or from privGaurd/sdk

const app = express();
app.use(express.json());

// Mount BEFORE routes:
app.use(privguard({
  serviceName: 'my-service-backend',
  fiduciaryName: 'Enterprise Technologies Pvt. Ltd.',
  privguardUrl: process.env.PRIVGUARD_URL || 'http://localhost:5000',
  dpoEmail: 'dpo@enterprise.local',
  grievanceEmail: 'grievance@enterprise.local'
}));

// Your application routes here...
```

---

### Option B: Direct Telemetry Ingestion (Custom API)

Emit structured events directly to PrivGuard via `POST /api/events`:

```http
POST /api/events
Content-Type: application/json

{
  "eventType": "USER_REGISTERED",
  "source": "APPLICATION_API",
  "service": "custom-app",
  "endpoint": "/api/users/register",
  "payload": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "mobileNumber": "9876543210"
  },
  "timestamp": "2026-08-22T08:00:00.000Z"
}
```

---

## 📡 Core API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/events` | Ingest real-time application processing event |
| `GET` | `/api/events` | Retrieve recent ingested events |
| `POST` | `/api/audit/scan-target` | Trigger on-demand statutory DPDPA compliance scan on target client |
| `GET` | `/api/audit/report` | Generate comprehensive DPDPA statutory audit report |
| `GET` | `/api/violations` | List detected policy violations |
| `GET` | `/api/violations/stats/summary` | Real-time compliance metrics & open violation counts |
| `DELETE` | `/api/violations/reset/all` | Reset telemetry and violations for clean testing |
| `GET` | `/api/policies` | Retrieve statutory DPDPA compliance policies |

---

## 🛡️ DPDPA Statutory Policies Enforced

| Policy ID | Policy Name | DPDPA Provision | Severity |
|---|---|---|---|
| `POL-001` | Email Logging Prohibited | Section 8(5) - Technical Safeguards | **HIGH** |
| `POL-002` | Phone Number Logging Prohibited | Section 8(5) - Technical Safeguards | **HIGH** |
| `POL-003` | PAN Card Logging Prohibited | Section 8(5) - Sensitive Financial PII | **CRITICAL** |
| `POL-004` | Purpose Limitation Mismatch | Section 6(1) - Specified Purpose Requirement | **HIGH** |
| `POL-005` | Data Retention Threshold Exceeded | Section 8(7) - Purpose Expiry Erasure | **MEDIUM** |
| `POL-006` | Aadhaar Logging Prohibited | Section 8(5) - High-Sensitivity Identifier | **CRITICAL** |

---

## ⚖️ License & Compliance Notice

This platform is architected in adherence to the **Digital Personal Data Protection Act (DPDPA), 2023** and **DPDP Rules 2025** published by the Ministry of Electronics and Information Technology (MeitY), Government of India.