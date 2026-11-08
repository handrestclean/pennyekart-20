import { createClient } from "npm:@supabase/supabase-js@2";
import { adminClient, corsHeaders, json } from "../_shared/auth.ts";

// Customer sign-in is mobile-number only (business requirement: no password, no OTP).
// The session is minted here on the server; no shared password exists in the app.
const norm = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);
const randomPassword = () => {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
};
const uuidRe = /^[0-9a-f-]{36}$/i;

// Best-effort throttle per instance (limits rapid number guessing).
const hits = new Map<string, number[]>();
const throttled = (key: string, max = 10, windowMs = 60_000) => {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (throttled(ip)) return json({ error: "Too many attempts. Please wait a minute." }, 429);

  const admin = adminClient();
  const mobile = norm(body.mobile);
  if (mobile.length !== 10) return json({ error: "Enter a valid 10-digit mobile number" }, 400);
  const email = `${mobile}@pennyekart.in`;

  const mintSession = async () => {
    const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link?.properties?.hashed_token) return null;
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data, error: vErr } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
    if (vErr || !data.session) return null;
    return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
  };

  if (body.action === "login") {
    const deviceId = String(body.device_id ?? "").slice(0, 100) || null;
    const deviceName = String(body.device_name ?? "").slice(0, 200) || null;
    const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 300);
    const audit = async (event_type: string, is_suspicious: boolean, reason: string, user_id: string | null = null) => {
      try {
        await admin.from("customer_auth_audit_logs").insert({
          user_id, mobile_number: mobile, device_id: deviceId, device_name: deviceName,
          ip_address: ip, user_agent: userAgent, event_type, is_suspicious, reason,
        });
      } catch { /* never block login on audit failure */ }
    };
    const { data: p } = await admin.from("profiles")
      .select("user_id, user_type, is_super_admin, is_blocked, password_status")
      .eq("email", email).maybeSingle();
    if (!p) { await audit("unregistered_attempt", false, "Login tried with an unregistered number"); return json({ status: "not_registered" }); }
    // Only plain customer accounts can use mobile-only sign-in.
    if (p.user_type !== "customer" || p.is_super_admin) {
      await audit("unauthorized_role_attempt", true, "Customer login tried on a partner/admin account", p.user_id);
      return json({ error: "Please use the partner or admin login for this account" }, 403);
    }
    if (p.is_blocked) {
      await audit("blocked_login_attempt", true, "Login tried on a blocked account", p.user_id);
      return json({ error: "This account is blocked. Please contact support." }, 403);
    }

    // Device tracking (warning only, never blocks).
    const { data: prev } = await admin.from("customer_auth_audit_logs")
      .select("device_id").eq("user_id", p.user_id).not("device_id", "is", null).limit(1000);
    const known = new Set((prev ?? []).map((r: { device_id: string }) => r.device_id));
    const isNewDevice = !!deviceId && known.size > 0 && !known.has(deviceId);
    const deviceCount = known.size + (deviceId && !known.has(deviceId) ? 1 : 0);
    if (isNewDevice) await audit("multiple_devices", true, `Login from a new device (${deviceCount} devices used)`, p.user_id);
    else await audit("login_success", false, known.size === 0 ? "First device" : "Known device", p.user_id);

    // Retire the old shared password for this account (no action needed from the customer).
    if (p.password_status === "legacy") {
      const { error } = await admin.auth.admin.updateUserById(p.user_id, { password: randomPassword() });
      if (!error) await admin.from("profiles").update({ password_status: "server_managed" }).eq("user_id", p.user_id);
    }
    const session = await mintSession();
    if (!session) return json({ error: "Login temporarily unavailable. Please try again." }, 500);
    return json({ status: "ok", is_new_device: isNewDevice, ...session });
  }

  if (body.action === "signup") {
    const fullName = String(body.full_name ?? "").trim();
    const localBodyId = String(body.local_body_id ?? "");
    const ward = Number(body.ward_number);
    const referral = String(body.referral_code ?? "").trim().slice(0, 32);
    if (fullName.length < 1 || fullName.length > 100) return json({ error: "Enter your name" }, 400);
    if (!uuidRe.test(localBodyId) || !Number.isInteger(ward) || ward < 1 || ward > 200) return json({ error: "Select your panchayath and ward" }, 400);

    const { data: lb } = await admin.from("locations_local_bodies").select("ward_count").eq("id", localBodyId).eq("is_active", true).maybeSingle();
    if (!lb || ward > lb.ward_count) return json({ error: "Select a valid panchayath and ward" }, 400);

    const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing) return json({ status: "already_registered" });

    const { error } = await admin.auth.admin.createUser({
      email,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        mobile_number: mobile,
        user_type: "customer", // always forced on the server
        local_body_id: localBodyId,
        ward_number: ward,
        referral_code: referral || undefined,
      },
    });
    if (error) {
      if (/already/i.test(error.message)) return json({ status: "already_registered" });
      return json({ error: "Signup failed. Please try again." }, 500);
    }
    await admin.from("profiles").update({ password_status: "server_managed" }).eq("email", email);
    const session = await mintSession();
    if (!session) return json({ error: "Account created. Please log in." }, 500);
    return json({ status: "ok", ...session });
  }

  // Mobile number is the sign-in identity: this updates both the login account
  // and the profile so the customer can log in with their new number.
  if (body.action === "update_mobile") {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Not signed in" }, 401);
    const newMobile = norm(body.new_mobile);
    if (newMobile.length !== 10) return json({ error: "Enter a valid 10-digit mobile number" }, 400);
    const newEmail = `${newMobile}@pennyekart.in`;

    const { data: current } = await admin.from("profiles").select("email").eq("user_id", userId).maybeSingle();
    if (!current) return json({ error: "Profile not found" }, 404);
    if (current.email === newEmail) return json({ status: "ok" });

    const { data: taken } = await admin.from("profiles").select("id").eq("email", newEmail).maybeSingle();
    if (taken) return json({ error: "This mobile number is already registered" }, 409);

    const { error: authErr } = await admin.auth.admin.updateUserById(userId, { email: newEmail, email_confirm: true });
    if (authErr) {
      if (/already/i.test(authErr.message)) return json({ error: "This mobile number is already registered" }, 409);
      return json({ error: "Could not update mobile number. Please try again." }, 500);
    }
    const { error: pErr } = await admin.from("profiles").update({ mobile_number: newMobile, email: newEmail }).eq("user_id", userId);
    if (pErr) return json({ error: "Mobile updated but profile sync failed. Please contact support." }, 500);
    return json({ status: "ok" });
  }

  return json({ error: "Invalid action" }, 400);
});
