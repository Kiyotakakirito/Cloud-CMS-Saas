# 🌐 Cloud CMS SaaS
### *The Ultimate Shop Command Center for ISP & Cable TV Operators*

[![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Next.js%20%7C%20Supabase-blue)](https://github.com/Kiyotakakirito/Cloud-CMS-Saas)
[![Security](https://img.shields.io/badge/Security-ACID%20Transactions%20%7C%20XSS%20Shield-green)](#-security--integrity)
[![License](https://img.shields.io/badge/License-MIT-gray)](LICENSE)

Cloud CMS is a professional-grade, multi-tenant SaaS application designed to empower local ISP and Cable TV owners. It transforms chaotic manual bookkeeping into a streamlined, automated, and secure digital operation.

---

## 🚀 Key Features

### 🏢 Total Shop Isolation (Multi-Tenancy)
*   **Virtual Databases:** Every shop owner operates in a totally isolated environment.
*   **Zero Conflict:** Different shops can have subscribers with the same Card Numbers or IDs without any database collisions.
*   **Global Security:** High-level Row Level Security (RLS) ensuring your data is only visible to your team.

### 💰 The "Perfect Ledger" System
*   **True Feed:** A chronological storytelling feed of every cash collection and credit renewal. It links payments to previous debts automatically.
*   **ACID Integrity:** All financial operations (Renewals, Settlements, Retractions) are handled by **PostgreSQL RPC Functions**. If a server crashes mid-transaction, your data remains 100% accurate—no "half-paid" bills.
*   **Staggered Expiry Engine:** Handles hundreds of customers with different recharge dates. The system provides a **Live Countdown** and **Early Warning** badges (Due Soon, Expiring Today, Overdue).

### 👥 Team Access & Granular Permissions
*   **Unlimited Custom Roles:** Create roles like "Area Manager", "Field Agent", or "Office Admin".
*   **Feature-Level Toggles:** Control exactly what each staff member can see. Hide financial targets from workers while enabling "Renewals" and "Collections".
*   **Live Sync:** Permission changes reflect on staff screens instantly as they navigate.

### 📊 Data Power Tools
*   **Bulk Importer:** Onboard your entire customer base from Excel/CSV in seconds with automatic area detection and duplicate STB filtering.
*   **Daily Collection Reports:** One-click CSV exports for daily cash tallies, filtered by date.
*   **Subscriber Command Center:** A 360-degree view of every customer's billing history, connection details, and internal notes.

---

## 🛠️ Tech Stack

*   **Frontend:** [Next.js 14](https://nextjs.org/) (App Router, TypeScript, Tailwind CSS, Lucide Icons)
*   **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+, Pydantic v2)
*   **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, GoTrue Auth, Real-time Metadata)
*   **Architecture:** RESTful API with Atomic Database Transactions (RPC)

---

## 🛡️ Security & Integrity

*   **XSS Shield:** Global input sanitization layer strips malicious HTML/Scripts from all user inputs.
*   **CSRF Protection:** Hardened `access_token` cookies with `SameSite=Strict` and `Secure` flags.
*   **Live Auth Sync:** Bypasses stale JWT data by fetching fresh user metadata from the Admin API on every request.
*   **Audit Trail:** Every critical action (Delete, Update, Import, Renew) is logged with a timestamp and the user ID of the performer.

---

## ⚙️ Installation & Setup

### 1. Prerequisites
*   Node.js 20+
*   Python 3.11+
*   Supabase Account

### 2. Environment Configuration
Create a `.env.supabase` in the root directory:
```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key (for admin tasks)
```

Create a `.env` in the root for general settings:
```env
SECRET_KEY=your-random-secret-key
ENVIRONMENT=development
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 Database Requirements
To enable the high-integrity features, run the provided SQL scripts in your Supabase SQL Editor:
*   `user_profiles` permissions column (JSONB)
*   `customers` per-tenant unique constraint
*   `fn_renew_subscription` RPC
*   `fn_clear_outstanding_balance` RPC

---

## 🤝 Contributing
Contributions are welcome! Please follow our internal development mandates and security standards.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ for the ISP community.*
