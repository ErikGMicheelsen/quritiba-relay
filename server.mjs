// ============================================================================
// The Quritiba realtime relay — standalone (for Render / any Node host).
//
// A small Hocuspocus (Yjs) websocket server. Every open Qube canvas connects
// here; the relay merges everyone's edits conflict-free and fans them back
// out, and carries presence (who's here, where their cursor is) on the same
// connection. One Y document per Qube, named "qube-<id>".
//
// The database stays the source of truth for chips — this relay holds only the
// live, in-memory picture while people are present. When the last person leaves
// a Qube, its document evaporates; the next visit reseeds from the database.
//
// AUTH: onAuthenticate verifies the client's Supabase session token and that the
// person holds a seat in (or owns) that Qube. Needs NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SECRET_KEY in the environment. With no secret key it runs WITHOUT
// auth — never expose that to the internet.
//
// PORT: honours the host's PORT (Render sets it) → REALTIME_PORT → 1234.
// ============================================================================

import { Server } from "@hocuspocus/server";
import { createClient } from "@supabase/supabase-js";

const port = Number(process.env.PORT ?? process.env.REALTIME_PORT ?? 1234);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const admin =
  SUPABASE_URL && SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

if (!admin) {
  console.warn("[realtime] no SUPABASE_SECRET_KEY — running WITHOUT auth. Never expose this to the internet.");
}

const server = new Server({
  port,
  address: "0.0.0.0",
  async onAuthenticate({ token, documentName }) {
    if (!admin) return { userId: null };
    const { data, error } = await admin.auth.getUser(token);
    const user = data?.user;
    if (error || !user) throw new Error("Not signed in.");

    // Campaign Lab canvas documents are named "campaign-<id>" and are owner-only
    // (only the owner gets the editing canvas; everyone else gets the join view).
    if (documentName.startsWith("campaign-")) {
      const campaignId = documentName.slice("campaign-".length);
      const { data: owned } = await admin
        .from("campaigns")
        .select("id")
        .eq("id", campaignId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!owned) throw new Error("Not the owner of this campaign.");
      return { userId: user.id };
    }

    // Qube canvas documents are named "qube-<id>" — a seat or ownership is required.
    const qubeId = documentName.replace(/^qube-/, "");
    const { data: seat } = await admin
      .from("qube_members")
      .select("user_id")
      .eq("qube_id", qubeId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!seat) {
      const { data: owned } = await admin
        .from("qubes")
        .select("id")
        .eq("id", qubeId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!owned) throw new Error("Not a member of this room.");
    }
    return { userId: user.id };
  },
  async onConnect({ documentName }) {
    console.log(`[realtime] connection joined ${documentName}`);
  },
  async onDisconnect({ documentName }) {
    console.log(`[realtime] connection left ${documentName}`);
  },
});

server.listen().then(() => {
  console.log(
    `[realtime] Quritiba relay listening on 0.0.0.0:${port}${admin ? " (auth on)" : " (NO AUTH)"}`
  );
});
