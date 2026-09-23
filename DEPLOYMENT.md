# Deployment Guide — NexCRM Online Deployment

This guide explains how to deploy the NexCRM & Operations Management System online so anyone can access it over the public internet.

The system is architected as a **unified production fullstack service**: the Express server serves both the REST API (`/api/*`) and the compiled React frontend (`/*`), so you only need to host **one service**.

---

## 🌟 Option 1: Deploy on Render.com (Recommended — 100% Free & Quickest)

Render provides free hosting for web services with automatic HTTPS.

### Steps:
1. **Push your code to GitHub**:
   Create a new GitHub repository (e.g. `nexcrm-system`) and push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of CRM & Operations Management System"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/nexcrm-system.git
   git push -u origin main
   ```

2. **Log into Render**:
   - Go to [https://render.com](https://render.com) and log in with your GitHub account.

3. **Create New Web Service**:
   - Click **"New +"** → **"Web Service"**.
   - Select your GitHub repository.
   - Configure the following settings:
     - **Name**: `nexcrm-system` (or any name you prefer)
     - **Region**: Closest to you (e.g., Singapore or Frankfurt)
     - **Branch**: `main`
     - **Runtime**: `Node`
     - **Build Command**:
       ```bash
       npm --prefix client install --include=dev && npm --prefix client run build && npm --prefix server install --include=dev && npm --prefix server run prisma:generate && npm --prefix server run prisma:push && npm --prefix server run seed && npm --prefix server run build
       ```
     - **Start Command**:
       ```bash
       npm --prefix server run start
       ```
     - **Plan**: `Free`

4. **Environment Variables**:
   Under **"Environment Variables"**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: `file:./dev.db`
   - `JWT_SECRET`: (Click *Generate* or enter any secure random 32-character string)
   - `CORS_ORIGIN`: `*`

5. **Deploy**:
   - Click **"Create Web Service"**.
   - Render will build both the frontend and backend, seed the database, and provide a live public URL (e.g. `https://nexcrm-system.onrender.com`).

---

## 🚀 Option 2: Deploy on Railway.app

Railway offers instant deployment from GitHub:

1. Push your repository to GitHub.
2. Go to [https://railway.app](https://railway.app) and click **"New Project"** → **"Deploy from GitHub repo"**.
3. Select your repository.
4. Set the **Build Command** to:
   ```bash
   npm --prefix client install --include=dev && npm --prefix client run build && npm --prefix server install --include=dev && npm --prefix server run prisma:generate && npm --prefix server run prisma:push && npm --prefix server run seed && npm --prefix server run build
   ```
5. Set the **Start Command** to:
   ```bash
   npm --prefix server run start
   ```
6. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `file:./dev.db`
   - `JWT_SECRET` = `super-secret-key-32-chars-minimum`
7. Click **Generate Domain** in service settings to get your public HTTPS URL!

---

## 🐳 Option 3: Deploy with Docker on Any VPS (DigitalOcean, AWS EC2, Linode, Coolify)

If you have a Linux VPS with Docker installed:

1. **Clone the repository on your server**:
   ```bash
   git clone https://github.com/<YOUR_USERNAME>/nexcrm-system.git
   cd nexcrm-system
   ```

2. **Run with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

3. The container will build the React app, compile the TypeScript server, initialize the SQLite database on a persistent volume (`/app/data/crm.db`), and serve everything on port `5000`.

4. **Optional Nginx Reverse Proxy (with SSL via Certbot)**:
   ```nginx
   server {
       server_name crm.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🐘 Production PostgreSQL Configuration (Optional)

If you prefer to connect to an external managed PostgreSQL database (e.g., Supabase, Neon, or AWS RDS):

1. In `server/prisma/schema.prisma`, update the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set your `DATABASE_URL` environment variable:
   ```env
   DATABASE_URL="postgresql://user:password@db-host:5432/nexcrm?sslmode=require"
   ```
3. Run `npm run prisma:generate && npm run prisma:push && npm run seed` to apply the schema and seed data.

---

## 🔑 Demo Logins on Live Deployment

Once deployed, anyone accessing your URL can immediately test all 3 tiers:

- **Admin**: `admin@crm.local` / `Admin@123`
- **Manager**: `manager@crm.local` / `Manager@123`
- **Executive**: `executive@crm.local` / `Exec@123`

Or simply click the **1-Click Demo Evaluation buttons** on the login page!
