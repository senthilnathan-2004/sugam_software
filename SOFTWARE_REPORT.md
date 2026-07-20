# Sugam HMS — Complete Software Report

_Generated: 2026-07-16_

## 1. What it is
Offline-first **Hospital Management System**. Desktop app, runs fully local — no server, no internet. All data in a local SQLite file. Target: small/mid hospital or clinic (maternity/pediatric branding per logo).

## 2. Tech stack
| Layer | Tech |
|---|---|
| Shell | Electron 33 (CommonJS main, NodeNext) |
| UI | Next.js 15.5.19 (App Router, static export) + React 19 |
| Styling | Tailwind v4, Radix UI, lucide icons, framer-motion |
| State | Zustand + react-hook-form + zod |
| DB | Prisma 5 ORM → SQLite (`prisma/dev.db`, ~388 KB) |
| Auth | bcrypt + JWT (per-install random secret) |
| Extras | node-cron (backups), xlsx (import/export), jspdf, recharts |

## 3. Architecture — 3 layers
```
RENDERER (Next/React)  ->  window.electronAPI.invoke("ns:action", data)
        |                        preload.ts - contextIsolation + namespace allowlist
        v
MAIN PROCESS (electron/ipc/*.ts)  ->  Prisma singleton (electron/db.ts)  ->  SQLite
```
- Renderer: `localhost:3000` (dev) / `app://` static (packaged).
- ~60 IPC handlers across 10 namespaces (`auth: patient: doctor: reception: inventory: billing: reports: dashboard: settings: backup: notification:`).
- Each handler returns `{ success, data }` or `{ success, error }`.

## 4. Data model — 22 Prisma models
`User · AuditLog · AppSetting · Notification · Patient · PatientVisit · PatientDocument · Doctor · Appointment · Consultation · Prescription · LabRequest · MedicineCategory · Supplier · Medicine · MedicineBatch · PurchaseOrder · Invoice · Payment · InvoiceReturn · DailySummary · Backup`

## 5. Feature modules
| Module | Does |
|---|---|
| **Dashboard** | KPIs, revenue/patient charts, recent activity, notifications |
| **Reception** | Appointments, walk-ins, queue |
| **Doctor** | Consultation room, today's queue, prescriptions, patient timeline |
| **Patients** | Registration, detail, docs upload, visit history, health card |
| **Doctors** | Directory, profile detail, consultation history |
| **Inventory** | Medicines, batches (FEFO), suppliers, purchases, stock alerts, Excel import/export |
| **Billing (POS)** | Invoice build, barcode scan, GST, discounts, returns, print (A4/thermal), Excel |
| **Reports** | Sales/inventory analytics |
| **Settings** | User management (RBAC roles) |
| **System** | Tray, auto-updater, cron backups, deep links |

## 6. Auth & RBAC
- 4 roles: **ADMIN / DOCTOR / BILLING / RECEPTION**.
- Login -> bcrypt verify -> JWT (secret persisted per-install in userData).
- WARNING: RBAC is client-side only — see gaps below.

## 7. Live DB state (at generation time)
users **4** · patients **2** · doctors **1** · medicines **9** (+9 batches, 5 categories, 1 supplier) · invoices **7** · appointments **2**

Seeded logins:
- `admin@sugamhms.com` / `Admin@123`
- `doctor@sugamhms.com` / `Doctor@123`
- `billing@sugamhms.com` / `Billing@123`
- `reception@sugamhms.com` / `Reception@123`

## 8. Changes made (session 2026-07-16)
1. **Routing fix** — dynamic `[id]` routes broke under `output: export`. Converted to query-param static routes (`/patients/detail?id=`, `/doctors/detail?id=`, `/doctors/workspace?id=`); deleted 3 `[id]` folders.
2. **Electron tsconfig** — migrated deprecated `node10` -> **NodeNext** (added `.js` import extensions), CJS preserved. Killed the TS 7.0 deprecation error.
3. **Perf** — dev switched to **Turbopack** (startup 10.9s -> ~1.6s; routes ~0.22s warm). Added `next:serve` for prod-speed static run.
4. **Seeded 9 medicines** + supplier + 5 categories + stocked batches.
5. **Payment modal** — now single **Cash / UPI** selector (was 3-way split incl. Card).
6. **Emergency contact** — made optional in patient registration.
7. **Walk-in billing** — cashier can bill with **or without** a patient.
8. **WhatsApp bill share** — optional; auto-fills patient phone, or cashier types number for walk-in. Opens wa.me with formatted bill.
9. **Font** — global +12.5% (16 -> 18px).
10. **Logo** — placed in sidebar, login, favicon, tray, window/taskbar icon.
11. **Login left panel** — simplified to centered logo + name.
12. **UI tidy** — removed sidebar profile border; fixed lockfile/workspace-root terminal warning via `next.config`.
13. Color palette re-skin applied then **reverted** (back to blue/orange) per request.

**Health:** app + electron typecheck clean (exit 0), dev terminal zero errors/warnings, static export builds (26 pages), app boots clean.

## 9. Known gaps / risks (unfixed — need design decisions)
| Severity | Gap |
|---|---|
| HIGH | **No server-side authz** — RBAC is 100% client-side (`auth.store.ts`). No IPC handler verifies JWT/role. Any renderer code can call `settings:create-user` (self-promote to ADMIN), `patient:delete`, etc. |
| HIGH | **Audit log attributes actions to a random ADMIN** (`findFirst role:ADMIN`), not the real actor — no user context threaded through IPC. |
| MED | No zod validation at IPC boundary (`data: any` trusted); mass-assignment in `inventory:suppliers:create`. |
| MED | Backup is raw file copy w/o WAL checkpoint; hard-delete cascades AuditLog (compliance). |
| LOW | `Patient.age` persisted/stale; dead winston logger in renderer. |

## 10. How to run
```bash
# from sugam_software/
unset ELECTRON_RUN_AS_NODE
export DATABASE_URL="file:<abs>/prisma/dev.db"
npm run electron:dev        # Turbopack dev + electron
```
First-time setup: `npx prisma migrate deploy` then seed. Package for users: `npm run electron:dist-win`.

Environment blockers (dev in VSCode/sandbox):
- `unset ELECTRON_RUN_AS_NODE` (else electron runs as plain Node, crashes).
- `export DATABASE_URL="file:<abs>/prisma/dev.db"` (electron main has no dotenv).
