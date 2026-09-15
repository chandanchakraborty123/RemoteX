# RemoteX — Setup & Run Guide

Simple steps to run the **app (frontend)** and **API (backend)** on your PC, then open it on your phone.

---

## What you need

| Thing | Why |
|--------|-----|
| **Node.js 20+** | Runs the Expo / React Native app |
| **Python 3.10+** | Runs the FastAPI backend |
| **Same Wi‑Fi** | Phone and PC must be on the same network to control TVs |

Check versions:

```bash
node -v
python --version
```

---

## One-time setup

Open a terminal in the project folder (`RemoteX`).

### 1. Install the app dependencies

```bash
npm install
```

### 2. Install the backend dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

> **Windows tip:** If `pip` fails, try `python -m pip install -r requirements.txt`.

That’s it for install.

---

## Every day — start both servers

You need **two terminals** (both left open).

### Terminal 1 — Backend (API)

```bash
npm run backend
```

You should see something like:

```text
Uvicorn running on http://0.0.0.0:8000
```

- API URL on this PC: **http://localhost:8000**
- From your phone: **http://YOUR_PC_IP:8000**
- Health check: open **http://localhost:8000/health** in a browser — should show `"ok": true`

### Terminal 2 — Frontend (app)

```bash
npm run web
```

You should see Metro waiting on port **8081**.

- On this PC: **http://localhost:8081**
- On your phone (same Wi‑Fi): **http://YOUR_PC_IP:8081**

---

## Find your PC IP (for the phone)

### Windows

```bash
ipconfig
```

Look for **IPv4 Address** under your Wi‑Fi adapter (example: `192.168.1.3`).

### Mac / Linux

```bash
ipconfig getifaddr en0
# or
hostname -I
```

Then on the phone browser open:

```text
http://192.168.1.3:8081
```

(use your real IP)

The app **auto-uses** `http://YOUR_PC_IP:8000` for the API when you open it this way. You usually don’t need to change Settings.

---

## Quick check that everything works

1. Backend health → `http://localhost:8000/health`
2. App loads → `http://localhost:8081`
3. Phone (same Wi‑Fi) → `http://YOUR_PC_IP:8081`
4. In the app: **Scan for devices** (TV must be on, same Wi‑Fi)

---

## What each part controls

| Port | Service | Used for |
|------|---------|----------|
| **8000** | FastAPI backend | Android TV, LG webOS, AC bridge |
| **8081** | Expo web app | The RemoteX UI on PC / phone |

---

## Pair a real device (short)

### Android TV / Google TV / Xstream

1. Start backend + web  
2. **Scan** → Connect  
3. Enter the **6-digit code** shown on the TV  
4. Use the remote (no code needed next time)

### LG webOS

1. **Scan** (or manual IP → choose LG webOS)  
2. Press **Yes / Allow** on the TV  
3. Tap **Pair & Connect** in the app  

### AC (IR / Wi‑Fi)

1. Add device → **AC** → pick brand  
2. Choose **IR** or **Wi‑Fi** → Connect  
3. Use Power / Temp / Mode / Fan  
   *(Real IR blast needs a blaster later; state works today.)*

### Samsung

Listed in the app; real Tizen driver not wired yet (mock connect).

---

## Optional: Expo Go / emulator

```bash
npm start
```

Then:

- Press `a` for Android emulator  
- Press `i` for iOS simulator  
- Or scan the QR with **Expo Go** on your phone  

If the API URL is wrong, open **Settings** in the app and set:

```text
http://YOUR_PC_IP:8000
```

Emulator default is usually fine without changes.

---

## Common problems

| Problem | Fix |
|---------|-----|
| Phone can’t open the app | Same Wi‑Fi as PC; use PC IP not `localhost`; allow Windows Firewall for Node/Python |
| Scan finds nothing | Backend running? TV on? Same network? Try manual IP |
| `Port 8081 is being used` | Something already runs Expo — use that, or close the old terminal and start again |
| `Port 8000` busy | Stop the other backend, or change the port in `npm run backend` / Settings |
| `ModuleNotFoundError` (Python) | Run `pip install -r backend/requirements.txt` again |
| Pairing fails | TV awake, “Allow remote” / pairing prompts enabled; retry Scan |

---

## Useful commands (cheat sheet)

```bash
# Install (once)
npm install
cd backend && pip install -r requirements.txt && cd ..

# Run (every day) — two terminals
npm run backend
npm run web

# Or from backend folder manually
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` is important so your **phone** can reach the PC.

---

## Project folders (simple map)

```text
RemoteX/
  src/          → App screens & UI (frontend)
  backend/      → FastAPI API (Android TV, webOS, AC)
  package.json  → npm scripts: backend, web, start
```

---

Happy controlling 📺❄️
