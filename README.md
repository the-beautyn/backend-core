# Backend Core — Beautyn Marketplace

This is the main API server for the Beautyn Marketplace platform. It handles business logic, authentication, booking requests, and communication with the CRM integrations service.

---

## 🚀 Features

- 🔐 JWT-based authentication (clients, salon admins, superadmins)
- 🧾 Booking system with two-stage flow (request → approval)
- 🧩 Multi-tenant architecture (each salon manages their own data)
- 🔌 Integrates with external CRMs (Altegio, EasyWeek, CleverBox)
- 🧠 AI-assisted structure, designed for scalability
- 📘 OpenAPI (Swagger) documentation included

---

## 🧱 Tech Stack

- **Node.js** + **Express** / NestJS (TBD)
- **PostgreSQL** (via Supabase or Railway)
- **TypeORM** / Prisma for database access
- **JWT Auth**
- **Docker-ready**
- CI/CD with GitHub Actions
