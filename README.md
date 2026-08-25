# Quritiba relay

The realtime relay for Quritiba — a small Hocuspocus (Yjs) WebSocket server that
carries presence (who's here, cursors) and live board sync between people in a
room. One Y document per Qube.

## Deploy (Render — free web service)

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Environment variables:**
  - `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project URL
  - `SUPABASE_SECRET_KEY` — the Supabase service-role key (auth check only)
- Render sets `PORT` automatically; the server binds to it.

Then set `NEXT_PUBLIC_REALTIME_URL=wss://<your-render-service>.onrender.com` in the
Quritiba web app (Vercel) and redeploy.
