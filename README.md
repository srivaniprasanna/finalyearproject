# Crop Suitability – React (Vite + Tailwind)

Same features as the Flutter app: login/register, **best crops for my location** (no crop selection), and **check if a specific crop is suitable**.

## Setup

```bash
cd react-crop
npm install
```

## Run

Backend must be running on port 8000 (or set `VITE_API_URL`).

```bash
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

Output in `dist/`. For production, set `VITE_API_URL` to your backend URL before building.

## Backend URL

- Default: `http://localhost:8000`
- Override: create `.env` with `VITE_API_URL=http://your-backend:8000`
