# Sugam HMS

**Offline-first Hospital Management System.** Windows desktop app — runs fully local, no server, no internet. All data lives in an embedded SQLite file. Built for a small/mid hospital or clinic (patient records, doctor consultations, pharmacy inventory, POS billing, reporting, admin).

Optionally runs across multiple PCs on a LAN (one HOST + several CLIENTs) with no cloud.

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 33 (Chromium + Node main) |
| UI | Next.js 15 (App Router, React 19), static export → `out/` |
| Styling | Tailwind v4, shadcn/ui (Radix), Framer Motion, lucide |
| State / forms | Zustand · react-hook-form · zod |
| ORM / DB | Prisma 5 → SQLite (`prisma/dev.db`, WAL mode) |
| Auth | JWT (jsonwebtoken) + bcrypt; server-side session registry, per-install secret |
| Charts / export | Recharts · xlsx · jsPDF |
| Scheduling | node-cron (DB backups) |
| Packaging | electron-builder (NSIS installer, Windows x64) |

---

## Architecture (3 layers)

```
RENDERER (Next/React)  ->  window.electronAPI.invoke("ns:action", data, <jwt>)
        |                     preload.ts — contextIsolation, channel-prefix allowlist, attaches JWT
        v
MAIN PROCESS (electron/ipc/*.ts)  ->  authorize.ts (session + role check)
        |                             ->  Prisma singleton (electron/db.ts)  ->  SQLite
        v
    app:// static protocol (packaged)  |  localhost:3000 (dev)
```

- Renderer never touches Node/FS/Prisma directly. `contextIsolation: true`, `nodeIntegration: false`.
- **Every IPC call authenticated server-side.** JWT read from `localStorage`, verified in main; renderer identity never trusted for authz. Per-channel role check against `CHANNEL_ROLES` (fails closed on unmapped channel).
- ~60 IPC handlers across 10 namespaces: `auth patient doctor reception inventory billing reports dashboard settings backup notification`.
- Each handler returns `{ success, data }` or `{ success, error }`.

Full detail: [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Feature modules

| Module | Does |
|---|---|
| **Dashboard** | KPIs, revenue/patient charts, recent activity, notifications |
| **Reception** | Appointments, walk-ins, queue |
| **Doctor** | Consultation room, today's queue, prescriptions, patient timeline |
| **Patients** | Registration, detail, doc upload, visit history, health card |
| **Doctors** | Directory, profile, consultation history |
| **Inventory** | Medicines, batches (FEFO), suppliers, purchases, stock alerts, Excel import/export |
| **Billing (POS)** | Invoice build, barcode scan, GST, discounts, returns, print (A4/thermal), WhatsApp share, Excel |
| **Reports** | Sales/inventory analytics |
| **Settings** | User management (RBAC) |
| **System** | Tray, auto-updater, cron backups, deep links, LAN host/client |

**Roles:** ADMIN · DOCTOR · BILLING · RECEPTION.

**Data model:** 22 Prisma models — `User · AuditLog · AppSetting · Notification · Patient · PatientVisit · PatientDocument · Doctor · Appointment · Consultation · Prescription · LabRequest · MedicineCategory · Supplier · Medicine · MedicineBatch · PurchaseOrder · Invoice · Payment · InvoiceReturn · DailySummary · Backup`.

---

## Getting started (dev)

Requires Node 18+ and npm.

```bash
cd sugam_software
npm install                      # postinstall runs `prisma generate`

# first-time DB setup (no dev.db is committed)
npx prisma migrate deploy        # creates prisma/dev.db from migrations
DATABASE_URL="file:./dev.db" node prisma/seed.js   # seed users + demo data

npm run electron:dev             # Turbopack dev server + electron
```

> **Do NOT** use `npm run prisma:seed` on Windows — its `--compiler-options '{...}'` quoting breaks (JSON.parse error). Run the seed script directly as shown.

### Windows / VSCode env blockers

Two env fixes needed if electron won't boot in a VSCode/sandbox shell:

- **`unset ELECTRON_RUN_AS_NODE`** — VSCode sets it to `1`; electron then runs as plain Node and crashes (`Cannot read properties of undefined (reading 'requestSingleInstanceLock')`).
- **`export DATABASE_URL="file:C:/Users/.../prisma/dev.db"`** — electron main has no dotenv; every `new PrismaClient()` reads only `process.env.DATABASE_URL`. Use a **Windows-form absolute path** (`file:C:/...`, not `file:/c/...`) or Prisma fails with Error 14 (unable to open DB).

Seeded logins:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sugamhms.com` | `Admin@123` |
| Doctor | `doctor@sugamhms.com` | `Doctor@123` |
| Billing | `billing@sugamhms.com` | `Billing@123` |
| Reception | `reception@sugamhms.com` | `Reception@123` |

---

## Build & package

```bash
npm run build:app          # prisma generate + next build + electron tsc
npm run electron:dist-win  # full build + prep dist DB + NSIS installer (Windows x64)
```

Installer output lands in `release*/`. See [DEPLOYMENT_LAN.md](DEPLOYMENT_LAN.md) for multi-PC LAN setup (STANDALONE / HOST / CLIENT).

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run electron:dev` | Turbopack dev + electron |
| `npm run next:dev` | Next dev server only |
| `npm run build:app` | prisma generate + next build + electron tsc |
| `npm run electron:build` | full build + dist DB + electron-builder |
| `npm run electron:dist-win` | Windows x64 installer |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `prisma generate` | regenerate Prisma client |

---

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — end-to-end architecture, request lifecycle, IPC/auth model
- [DEPLOYMENT_LAN.md](DEPLOYMENT_LAN.md) — offline multi-PC LAN deployment
- [SOFTWARE_REPORT.md](SOFTWARE_REPORT.md) — feature/state report
- [SMOKE_TEST.md](SMOKE_TEST.md) — manual smoke-test checklist

---

## License

Proprietary — © Sugam HMS Team.
