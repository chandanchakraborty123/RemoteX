# RemoteX

Premium universal smart remote — **Expo (React Native)** + **FastAPI**.

Control Android TV / Xstream, LG webOS, and AC (IR / Wi‑Fi stub) from your phone on the same Wi‑Fi.

---

## Quick start

**Full beginner guide:** see **[SETUP.md](./SETUP.md)** (install, run BE + FE, phone access, pairing, troubleshooting).

```bash
# One-time
npm install
cd backend && pip install -r requirements.txt && cd ..

# Every day — two terminals
npm run backend    # API  → http://localhost:8000
npm run web        # App  → http://localhost:8081
```

On your phone (same Wi‑Fi): `http://YOUR_PC_IP:8081`  
API auto-points to `http://YOUR_PC_IP:8000`.

---

## Features (current)

| Device | Status |
|--------|--------|
| Android TV / Google TV / Xstream | Real protocol (pair once, reconnect) |
| LG webOS | Real protocol (Accept on TV) |
| AC | Power / Temp / Mode / Fan UI + bridge stub |
| Samsung Tizen | Listed (mock until driver ships) |

---

## Project structure

```text
src/         App (screens, services, UI)
backend/     FastAPI (androidtv, webos, ac)
pc-agent/    Future PC agent notes
SETUP.md     How to run everything
```
