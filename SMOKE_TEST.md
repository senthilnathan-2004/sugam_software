# Sugam HMS — Smoke Test Checklist

Run before any release. Requires a display (Electron GUI). Start with the dev
recipe: unset `ELECTRON_RUN_AS_NODE`, set `DATABASE_URL="file:<abs>/prisma/dev.db"`,
then `npm run electron:dev`. Seed logins (from `prisma/seed.ts`):

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@sugamhms.com | Admin@123 |
| DOCTOR | doctor@sugamhms.com | Doctor@123 |
| BILLING | billing@sugamhms.com | Billing@123 |
| RECEPTION | reception@sugamhms.com | Reception@123 |

> ⚠️ These are seeded defaults shown on the login screen. **Change them before a real deployment.**

## 1. Auth & session (security — new in this pass)
- [ ] Log in as each of the 4 roles; each lands on its start page (ADMIN→dashboard, DOCTOR→doctor, RECEPTION→reception, BILLING→billing).
- [ ] Wrong password → "Invalid credentials"; disabled account → rejected.
- [ ] **Restart the app while logged in** → brief loading screen, then lands back in (session re-verified), NOT stuck on errors.
- [ ] Log out → returns to login; confirm you cannot re-enter a dashboard route by back-button (session revoked).
- [ ] Idle 15 min → auto sign-out toast.
- [ ] Change own password (Settings) → log out → new password works, old fails.

## 2. Role-based access (server-side RBAC — new)
- [ ] Sidebar for each role shows only its sections (RECEPTION: no Reports/Settings/Inventory-writes; DOCTOR: no Billing; BILLING: no Doctor Panel; only ADMIN sees Dashboard + Settings).
- [ ] As non-ADMIN, confirm no `FORBIDDEN` error toasts appear during normal allowed workflows (if one does, the role map in `electron/ipc/authorize.ts` needs that channel adjusted).
- [ ] (Optional, devtools console) As RECEPTION, call `window.electronAPI.invoke('settings:create-user', {...})` → returns `{success:false, error:'FORBIDDEN'}` (cannot self-promote).

## 3. Patients
- [ ] Create a patient (all required fields) → appears in list; **age shown matches DOB** (not a stored/stale value).
- [ ] Submit with a blank required field / bad DOB → clean validation error, no crash.
- [ ] Edit the patient → changes persist.
- [ ] Delete the patient (ADMIN) → disappears from list (soft-deleted).
- [ ] Upload a patient document → saved.

## 4. Billing
- [ ] Create an invoice **with** a registered patient → stock deducts (FEFO), invoice appears.
- [ ] Create an invoice for a **walk-in** (no patient, name/phone only) → succeeds.
- [ ] Record a payment against an invoice.
- [ ] Attempt to bill more than available stock → blocked with "Insufficient stock", nothing deducted.

## 5. Inventory
- [ ] Add a supplier / medicine / purchase (ADMIN or BILLING) → appears.
- [ ] Set a medicine's stock below reorder level → **low-stock alert** shows on the alerts panel.
- [ ] Excel import/export on the medicines page → works (xlsx now lazy-loads on first click; a brief pause on first use is expected).

## 6. Audit trail (new)
- [ ] Perform several actions as different users, then (ADMIN) open the dashboard **System Log Feed**.
- [ ] Confirm each entry is attributed to the **actual acting user** (name + role), not a random admin.

## 7. Backup & restore (hardened)
- [ ] Settings → create a backup → succeeds; a `.db` file appears in the chosen folder.
- [ ] Corrupt/replace the backup file with a non-DB file, then restore it → **rejected** ("failed integrity check"), live DB untouched.
- [ ] Restore a valid backup → app signals restart required; after restart data matches the backup.
- [ ] Confirm a `*.pre-restore-*` snapshot of the previous DB was written next to `dev.db`.

## 8. Reliability (new)
- [ ] Dashboard renders with a **populated** DB (real charts) and with an **empty** DB (zeros, **no fabricated numbers**).
- [ ] Confirm `userData/logs/main.log` exists and captures startup + errors.
- [ ] Cold start: note approximate time-to-interactive with empty vs. populated DB.

## 9. Offline
- [ ] Disconnect all networking, launch the app → everything above still works; auto-updater silently does nothing (no error dialog).
