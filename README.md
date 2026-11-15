# EcoReport: A Mobile and Web-Based Environmental Reporting System for Sto. Rosario, Pateros

> A Capstone Project submitted to the Institute of Information and Computing Technology, Pateros Technological College, in partial fulfillment of the requirements for the degree of Bachelor of Science in Information Technology.

---

## 📖 Overview

Barangay Sto. Rosario Kanluran, Pateros relies on Facebook Messenger and manual walk-in reporting to handle environmental concerns such as illegal dumping, improper garbage disposal, flooding, clogged drainage, overgrown trees, and stray animal waste. Reports get buried in chats, lack proper tracking, and are difficult to validate - especially with limited barangay manpower.

**EcoReport** is a centralized mobile + web platform that streamlines environmental reporting and monitoring for residents, guest users, and barangay officials. Residents submit reports with photos, videos, and GPS-tagged locations; barangay officials review, validate, assign, and resolve them through an admin dashboard with real-time analytics, GIS mapping, and role-based access control.

---

## ✨ Key Features

### For Residents (Mobile App)

- Secure registration with ID upload, OCR verification, and face detection
- Submit environmental reports with **photos, videos, GPS location**, and detailed descriptions
- Track report status in real time (Pending → Ongoing → Assigned → Resolved / Rejected)
- QR code for in-person identity verification at the barangay hall
- Barangay announcements, waste collection schedules, and emergency hotlines
- Health center information, appointment requests, and certificate requests
- Environment map showing reports submitted within the barangay boundary

### For Guest Users (Mobile App)

- Report environmental concerns without registering (1 report per day per IP)
- Browse public announcements, waste schedules, and emergency hotlines

### For Barangay Officials (Web Admin Panel)

- Dashboard with report statistics, category breakdown, and monthly trend charts
- Report management: accept, reject, assign workers, and resolve reports
- Assignment management with worker tracking
- QR verification for residents (camera scanner + paste fallback)
- Manage announcements, notification center, and emergency hotlines
- Health center, waste schedule, certificates, inventory, blotter, and disaster alerts
- GIS map with all reports plotted inside the barangay boundary
- Activity analytics with CSV export
- **Assign Worker permission** - admin can grant specific officials the right to assign workers (not all officials have this by default)

### For System Administrators (Web Admin Panel)

- User management with role changes, lock/unlock, and account deactivation
- Resident account verification (approve/reject uploaded IDs)
- System settings - barangay info, password policy, login lockout, report categories, maintenance mode
- Audit logs of all staff actions with CSV export
- Generate reports (account activity, login activity, verification, admin actions, security)

### System-Wide

- **Maintenance mode** - admins can temporarily block resident/guest access with a custom message
- **JWT authentication** with configurable session timeouts and failed-login lockout
- **Role-based access control** - Admin, Barangay Official, Resident, Guest
- **Secure QR verification** - tokenized QR codes that expire every 10 minutes
- **Audit trail** - every staff action is logged

---

## 🛠 Tech Stack

### Backend

| Layer             | Technology            |
| ----------------- | --------------------- |
| Runtime           | Node.js               |
| Framework         | Express.js 5          |
| Database          | MySQL (Railway)       |
| Authentication    | JSON Web Tokens (JWT) |
| Password Hashing  | bcrypt                |
| Media Storage     | Cloudinary            |
| Email             | Resend                |
| Upload Handling   | Multer                |
| HTML Sanitization | xss                   |

### Mobile Frontend

| Layer             | Technology                    |
| ----------------- | ----------------------------- |
| Framework         | React 19 + Vite               |
| Styling           | Tailwind CSS 4                |
| Routing           | React Router 7                |
| Icons             | React Icons                   |
| Maps              | Leaflet + OpenStreetMap       |
| OCR               | PaddleOCR (ONNX Runtime WASM) |
| Face Detection    | face-api.js                   |
| HTML Sanitization | DOMPurify                     |

### Web Admin Panel

| Layer             | Technology                      |
| ----------------- | ------------------------------- |
| Framework         | React 19 + Vite                 |
| Styling           | Custom CSS + Tailwind utilities |
| Routing           | React Router 7                  |
| Icons             | React Icons                     |
| Maps              | Leaflet + OpenStreetMap         |
| Rich Text Editor  | react-quill-new                 |
| QR Scanner        | html5-qrcode                    |
| PDF Export        | html2pdf.js                     |
| HTML Sanitization | DOMPurify                       |

### Deployment

| Service              | Purpose                           |
| -------------------- | --------------------------------- |
| **Railway**          | Backend API + MySQL database      |
| **Cloudflare Pages** | Mobile frontend + Web admin panel |

---

## 🚀 Installation and Setup

### Prerequisites

- Node.js 20+
- npm 10+
- MySQL 8+ (local) or Railway MySQL (cloud)
- Cloudinary account (for image/video uploads)
- Resend account (for transactional emails)

### 1. Clone the repository

```bash
git clone <https://github.com/yrmendones/EcoReport>.git
cd EcoReport
```
