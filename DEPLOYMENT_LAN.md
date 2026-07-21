# Sugam HMS — Offline Multi-PC LAN Deployment Guide

Sugam HMS can run in three modes, chosen per computer at first run (or later from
**Settings → Multi-PC / Network → Setup**):

| Mode | Who | Owns the database? | Runs the LAN server? |
|---|---|---|---|
| **Standalone** | A single clinic PC | Yes (local) | No |
| **Host** | The Billing PC | Yes (the ONE authoritative DB) | Yes |
| **Client** | Each Doctor PC | No — uses the Host's DB over LAN | No |

The same installer produces all three modes. There is one authoritative SQLite
database, on the Host. Clients never open a database file; every request travels
over the LAN to the Host and is authenticated + authorized there.


## 1. Network prerequisites

- One Wi-Fi router or wired switch. **Internet is not required.**
- All three PCs on the **same** network, set to a **Private** network profile in
  Windows (Settings → Network & Internet → Wi-Fi → your network → Private).
- A stable Host address. Strongly recommended: reserve the Host's IP in the
  router (DHCP reservation) so it never changes, e.g. `192.168.1.100`.

Find the Host's IP: on the Host, open Command Prompt and run `ipconfig`; use the
`IPv4 Address` of the active adapter.


## 2. Windows Firewall (Host only)

The Host listens on TCP port **4783** (configurable). Windows will block inbound
connections until you allow that port on **Private** networks.

Run **once** on the Host, in an **Administrator** PowerShell/Command Prompt:

```
netsh advfirewall firewall add rule name="Sugam HMS LAN" dir=in action=allow protocol=TCP localport=4783 profile=private
```

To remove it later:

```
netsh advfirewall firewall delete rule name="Sugam HMS LAN"
```

> Do NOT expose the port on Public networks or forward it on the router. The
> service is for the private clinic LAN only.

**Connection test:** the server uses HTTPS with a per-install self-signed
certificate (traffic is encrypted; the Client pins the Host's cert at pairing).
From a Doctor PC run `curl -k https://<HOST-IP>:4783/health` — a small JSON reply
(`{"status":"ok",...}`) means the firewall + server are working. In a browser the
same URL will show a certificate warning (expected for a self-signed cert; the
Sugam HMS app itself does NOT rely on the browser trust store — it pins the exact
certificate). No reply → re-check the firewall rule, the IP, and that both PCs are
on the same Private network.

---

## 3. Three-laptop setup (2 Doctors + 1 Billing)

### Laptop 3 — Billing (Host)
1. Install and launch Sugam HMS.
2. On the login screen click **Multi-PC setup** (or log in → Settings → Multi-PC
   / Network → Setup).
3. Choose **Main / Host Computer**, keep port `4783`, save.
4. **Fully close and reopen** the app (the mode takes effect on restart).
5. Add the firewall rule from §2.
6. Log in as an admin → **Settings → Multi-PC / Network** → confirm
   "Running · port 4783".

### Laptops 1 & 2 — Doctors (Clients)
1. On the Host: Settings → Multi-PC / Network → **Enable pairing**. A 6-digit code
   appears (valid ~5 minutes).
2. On the Doctor PC: launch → **Multi-PC setup** → **Additional / Client
   Computer**.
3. Enter the Host address (e.g. `192.168.1.100`), port `4783`, the 6-digit code,
   and a name for this PC (e.g. "Doctor A Laptop"). Click **Connect**.
4. **Fully close and reopen** the app.
5. Log in with a normal user account (pairing is device authorization, not login).
6. The top of the screen shows 🟢 **Connected**. Repeat the Enable-pairing step on
   the Host for the second Doctor PC.

> A pairing code authorizes **a single device** and is consumed the moment that
> device pairs (and expires after ~5 min regardless). To connect the second
> Doctor PC, click **Enable pairing** again on the Host to get a fresh code. Each
> device then holds its own long random credential (stored encrypted on that PC).

**Transport security & the pairing trust model.** All Host↔Client traffic runs
over TLS (HTTPS) using a per-install self-signed certificate — the login token,
device credential, and all patient data are encrypted on the wire. During
pairing the Client records ("pins") the Host's certificate; from then on it
rejects any computer that does not present that exact certificate, so a device
that merely knows the Wi-Fi password cannot impersonate the Host or read the
traffic. The one narrow exposure is a man-in-the-middle *during* the short
pairing window itself. To rule that out on a sensitive network, pair only when
the clinic network is trusted, and (optional, belt-and-suspenders) confirm the
Host certificate fingerprint out-of-band: run
`curl -k https://<HOST-IP>:4783/health` — no third machine should be able to
answer that address during pairing.

---

## 4. Daily workflow (no receptionist)

```
Doctor A (Client)                          Billing (Host)
  Search patient / + New Patient
  → Start Consultation
  → record diagnosis + prescription
  → (optional) Consultation Fee [clinical record only]
  → Complete Consultation
        └──────────────► appears in "Ready for Billing"
                                            Select the patient's visit
                                            → prescription auto-loads for THAT visit
                                            → confirm/adjust dispensed medicines
                                            → Generate Bill (FEFO stock deduction)
                                            → the visit leaves the queue
```

Doctor B works the same way, independently and at the same time.

**Consultation fee** is a doctor-reference field only: it is saved on the visit
for the doctor/admin's records and never appears in Billing, the invoice, totals,
payments, or any printed bill.

---

## 5. Host availability during clinic hours

- Keep the Host (Billing PC) powered on and awake. Set Windows power to **never
  sleep while plugged in** (Settings → System → Power) during clinic hours.
- If you close Sugam HMS on the Host while Doctor PCs are connected, it warns and
  lists who will be disconnected.
- If the Host goes offline, Clients show 🔴 **Host Offline** and cannot save until
  it returns — no data is lost or silently written locally; they auto-reconnect.

---

## 6. Backups (Host only)

Backups run on the Host only (Settings → Backup & Restore), WAL-checkpointed and
integrity-verified before being recorded. Clients do not back up anything.
Optionally point the backup folder at an external USB drive.

---

## 7. Rollback / recovery

- **Switch a PC back to Standalone:** Settings → Multi-PC / Network → Setup →
  **Single Computer** → restart. A former Host keeps its database and works
  offline as before. (Reaching Setup on a Client that can't connect: use the
  **Multi-PC setup** link on the login screen.)
- **Re-pair a Client:** on the Host, Enable pairing again; on the Client, Setup →
  Client → enter the new code.
- **Revoke a lost/old device:** Host → Settings → Multi-PC / Network → Revoke.
- The schema migration for this feature is additive; reverting to Standalone
  needs no data changes. A Host DB snapshot is taken by the normal backup flow.

---

## 8. Production build

```
npm run electron:build      # static export + electron compile + db seed + installer
```

Produces the NSIS installer under the configured output directory. Install the
SAME version on all clinic PCs; the Host and Clients must run matching versions.
