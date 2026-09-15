# RemoteX

Premium universal smart remote control — React Native (Expo) + FastAPI.

## Phase 1 (current)

Fully navigable MVP with mock device drivers:

Welcome → Device Type → Brand → Connection → Remote

Includes touchpad, keyboard, voice/AI stubs, macros, favorites, and settings.

## Run mobile app

```bash
npm install
npm start
```

Then open in Expo Go, Android emulator, iOS simulator, or web.

## Open from phone / any device

1. Start backend + web (LAN):

```bash
npm run backend
npm run web
```

2. On your phone (same Wi‑Fi), open:

`http://YOUR_PC_IP:8081`

Example: `http://192.168.1.3:8081`

The app auto-points the API to `http://YOUR_PC_IP:8000` — no Settings change needed.

## Phase 5 — Android TV / Google TV

Real control uses the Android TV Remote Protocol v2 (same as the Google TV app)
through a local FastAPI bridge on your PC.

### 1. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` lets your phone reach the PC on the same Wi‑Fi.

### 2. Point the app at the backend

- **Web / mobile browser:** open via your PC LAN IP — API follows automatically
- Emulator: defaults work (`10.0.2.2`)
- Native Expo Go: Settings → Android TV bridge if needed

### 3. Pair a TV

1. Add device → TV → Android TV / Google TV brand (Sony, Xiaomi, TCL, …)
2. Enter the TV IP
3. When prompted, type the 6-digit code shown on the TV
4. Use the remote (power, nav, volume, keyboard, apps)

Supported now: power, D-pad, volume/mute, home/back/menu, text input, YouTube/Netflix/Prime launch links.


## Project structure

```
src/
  screens/
  components/
  services/
  types/
  data/
  navigation/
  theme/
  context/
backend/
pc-agent/
```
