# NexCRM & Operations Management System

A production-ready, enterprise-grade **Customer Relationship Management (CRM) & Operations System** built with **Node.js, Express, TypeScript, Prisma ORM, and React (Vite + Tailwind CSS)**.

The system is designed from the ground up for high scalability (supporting **5M+ customers and 50M+ activity records**), **strict role-based security**, and **Optimistic Concurrency Control (OCC)** to prevent lost updates during concurrent edits.

---

## 🌟 Key Highlights & Engineering Features

- **Optimistic Concurrency Control (OCC)**:
  - Resolves the classic race condition where Employee A updates an order to ₹55,000 while Employee B simultaneously updates it to ₹60,000.
  - Implements monotonic `version` tracking returning `409 Conflict` on stale mutations with an interactive resolution dialog.
  - Built-in **Live Concurrency Simulator** accessible with one click in the UI!
- **High-Volume Scale Architecture (5M+ Customers, 50M+ Activities)**:
  - **Keyset / Cursor Pagination** eliminating $O(N)$ `OFFSET` query degradation.
  - **PostgreSQL Monthly Range Partitioning** strategy for 50M+ append-only audit records.
  - Comprehensive composite indexing on high-frequency query paths.
- **Enterprise RBAC & Security**:
  - Roles: `ADMIN`, `MANAGER`, `EXECUTIVE`.
  - IDOR (Insecure Direct Object Reference) scoping: Executives can only view/modify records assigned to them or their department.
  - Rate limiting, Helmet security headers, Zod schema validation, and bcrypt (cost factor 10) password hashing.
  - No sensitive credentials (such as password hashes) are ever exposed in API responses.
- **Immutable Tamper-Evident Audit Trail**:
  - Automatically records state transitions (e.g. `Rahul created customer CUST-1023`, `Amit changed lead status: NEW → QUALIFIED`, `Rahul updated order ORD-1001: ₹50,000 → ₹55,000`).
  - No `UPDATE` or `DELETE` endpoints exist for audit records.
- **1-Click Demo Evaluation Switcher**:
  - Easily toggle between Admin, Manager, and Executive roles directly from the UI header to test authorization boundaries instantly.
- **Automated Test Suite**:
  - Vitest test suite covering Authentication, RBAC/IDOR, Optimistic Concurrency Control, Validation, and Order/Payment workflows.

---

## 🛠 Technology Stack

| Layer | Technologies | Rationale |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express, TypeScript, Tsx | Strong type safety, clean layered architecture, industry standard |
| **Database & ORM** | Prisma ORM, SQLite (local) / PostgreSQL (production) | Zero-friction local setup + drop-in PostgreSQL migration schema |
| **Security** | JWT, BcryptJS, Helmet, CORS, Express-Rate-Limit, Zod | Defense-in-depth protection against IDOR, brute-force, injection |
| **Frontend** | React 18, Vite 6, Tailwind CSS, Lucide Icons | Responsive, sleek dark-mode UI with optimistic client feedback |
| **Testing** | Vitest, Supertest | Fast, reliable integration and unit test coverage |

---

## 🔑 Pre-Seeded Demo Credentials

The database is pre-populated with accounts across all three organizational tiers:

| Role | Email | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@crm.local` | `Admin@123` | Full system access, system-wide audit logs, global operations |
| **Manager** | `manager@crm.local` | `Manager@123` | Branch management, team leads, orders, audit logs |
| **Executive** | `executive@crm.local` | `Exec@123` | Assigned customers, assigned leads, assigned orders & tasks |
| **Executive (Bangalore)** | `priya@crm.local` | `Exec@123` | Operations executive for Bangalore branch |

> **Tip:** You can log in with a single click using the **"1-Click Demo Evaluation Logins"** on the login screen or switch roles anytime via the **Role dropdown** in the header.

---

## 🚀 Quick Setup & How to Run

### Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **npm** v9+

### 1. Install Dependencies
Run in the root directory:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### 2. Configure Environment Variables
The `.env` file is pre-configured in `server/.env`:
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="crm-production-grade-super-secret-key-2025"
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

### 3. Generate Database & Seed Data
```bash
cd server
npm run prisma:generate
npm run prisma:push
npm run seed
cd ..
```

### 4. Run the Application
In separate terminal windows (or using npm scripts):

**Terminal 1 — Backend API Server (Port 5000):**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend Client (Port 5173):**
```bash
cd client
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 🌐 Online Deployment (Render, Railway, Docker)

The application is architected to run as a **single unified fullstack service**: Express serves both the REST API (`/api/*`) and the compiled React frontend (`/*`), requiring only a single port/service.

For complete step-by-step instructions on deploying to **Render.com (Free)**, **Railway**, or **Docker/VPS**, see [DEPLOYMENT.md](file:///d:/Projects/CRM%20&%20Operations%20Management%20System/DEPLOYMENT.md).

---

## 🧪 How to Run Automated Tests

To execute the Vitest automated test suite:
```bash
cd server
npm test
```

### Test Coverage Summary:
- `auth.test.ts`: Login validation, password verification, JWT issuance, protected endpoint checks.
- `rbac.test.ts`: Admin access, Executive forbidden (403) from deleting customers and viewing root audit logs.
- `concurrency.test.ts`: Exact reproduction of the ₹50,000 -> ₹55,000 vs ₹60,000 race condition. Verifies 409 Conflict rejection, stale version detection, and conflict audit logging.
- `business-logic.test.ts`: Order payment flow (UNPAID -> PARTIAL -> PAID), lead-to-customer conversion, Zod input validation, dashboard aggregation.

---

## 📁 Repository Structure

```
CRM & Operations Management System/
├── ARCHITECTURE.md          # In-depth architectural & scalability documentation
├── README.md                # Project documentation and quickstart
├── package.json             # Root package scripts
├── server/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema with relations & composite indexes
│   │   └── seed.ts          # Realistic seed data (Users, Customers, Orders, Audit)
│   ├── src/
│   │   ├── __tests__/       # Vitest automated test suites
│   │   ├── controllers/     # Auth, Customer, Lead, Order, Payment, Task, Dashboard, Audit
│   │   ├── middleware/      # Auth (JWT), RBAC, IDOR, Zod validation, Rate limiter
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # AuditService (immutable logging)
│   │   ├── app.ts           # Express application configuration
│   │   ├── config.ts        # Environment configuration
│   │   ├── prisma.ts        # Prisma client singleton
│   │   └── index.ts         # Server entrypoint
│   └── package.json
└── client/
    ├── src/
    │   ├── components/      # Layout (Sidebar, Header), Modals (Concurrency, Scale Specs)
    │   ├── context/         # AuthContext with 1-click Role Switcher
    │   ├── pages/           # Dashboard, Customers, Leads, Orders, Payments, Tasks, Audit
    │   ├── services/        # Axios API client with auth interceptor
    │   ├── types/           # TypeScript domain interfaces
    │   ├── App.tsx          # Main layout and routing
    │   └── main.tsx         # React DOM entrypoint
    └── package.json
```
