// Web push, for the church app.
//
// VAPID rather than FCM: the keys are self-signed, so there is no Google or
// Apple account in the loop and the same pair reaches Android and iPhone alike.
// Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (npx web-push generate-vapid-keys)
// and VAPID_SUBJECT to a mailto: for the church. Without them the endpoints
// still answer — they just answer "off", so a deploy that forgets the keys
// looks switched off rather than broken.
//
// Sending is behind PUSH_ADMIN_PIN. A push cannot be recalled once it has left
// here, so the pin is checked on the way in and never travels back out.
const crypto = require("crypto");
const webpush = require("web-push");

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:gowthamrajum@gmail.com";
const ADMIN_PIN = process.env.PUSH_ADMIN_PIN || "";

const configured = !!(PUBLIC_KEY && PRIVATE_KEY);
if (configured) webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

/**
 * Compare pins without leaking how much of one was right.
 *
 * A pin is short enough to guess with feedback, and `a === b` returns as soon
 * as two characters differ. Both sides are hashed first so the compare is over
 * equal lengths whatever was sent — timingSafeEqual throws on a mismatch.
 */
function pinOk(given) {
  if (!ADMIN_PIN) return false;
  const a = crypto.createHash("sha256").update(String(given ?? "")).digest();
  const b = crypto.createHash("sha256").update(ADMIN_PIN).digest();
  return crypto.timingSafeEqual(a, b);
}

async function initPushDb(run) {
  await run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      platform TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      last_sent_at TEXT
    )
  `);
}

/**
 * A browser's subscription, as PushSubscription.toJSON() gives it.
 *
 * The keys are checked for shape here rather than trusted, because a bad one
 * fails in a way nothing downstream can clean up: web-push rejects it locally
 * with "Public key is not valid for specified curve" and never reaches the push
 * service, so there is no 404 or 410 to prune on and the row would sit there
 * failing on every send forever. p256dh is an uncompressed P-256 point — 65
 * bytes opening with 0x04 — and auth is 16 bytes.
 */
function readSubscription(body) {
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || !/^https:\/\//.test(endpoint)) return null;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  const key = Buffer.from(p256dh, "base64url");
  if (key.length !== 65 || key[0] !== 0x04) return null;
  if (Buffer.from(auth, "base64url").length !== 16) return null;
  return { endpoint, p256dh, auth };
}

function register(app, { run, get, all }) {
  // What the client needs before it can subscribe. The public key is public by
  // definition — it ships inside every subscription request anyway.
  app.get("/push/key", (_req, res) => {
    res.json({ enabled: configured, key: configured ? PUBLIC_KEY : null });
  });

  app.post("/push/subscribe", async (req, res) => {
    const sub = readSubscription(req.body);
    if (!sub) return res.status(400).json({ error: "not-a-subscription" });
    try {
      // The endpoint IS the identity. A phone that re-subscribes gets the same
      // row rather than a second one, so the count means people, not installs.
      await run(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth, platform)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
        [sub.endpoint, sub.p256dh, sub.auth, String(req.body?.platform || "").slice(0, 40)]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/push/unsubscribe", async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== "string") return res.status(400).json({ error: "no-endpoint" });
    try {
      await run("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // The sender's own screen: is this pin right, and how many phones would hear
  // it. Answering the count only after the pin checks out keeps the size of the
  // congregation's subscriber list from being a public number.
  app.post("/push/status", async (req, res) => {
    if (!pinOk(req.body?.pin)) return res.status(403).json({ error: "bad-pin" });
    try {
      const row = await get("SELECT COUNT(*) AS n FROM push_subscriptions");
      res.json({ ok: true, enabled: configured, subscribers: Number(row?.n ?? 0) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/push/send", async (req, res) => {
    if (!pinOk(req.body?.pin)) return res.status(403).json({ error: "bad-pin" });
    if (!configured) return res.status(503).json({ error: "push-not-configured" });

    const title = String(req.body?.title ?? "").trim();
    const body = String(req.body?.body ?? "").trim();
    const url = String(req.body?.url ?? "/").trim() || "/";
    if (!title) return res.status(400).json({ error: "no-title" });

    let rows;
    try {
      rows = await all("SELECT endpoint, p256dh, auth FROM push_subscriptions");
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
    if (!rows.length) return res.json({ ok: true, sent: 0, failed: 0, removed: 0, subscribers: 0 });

    const payload = JSON.stringify({ title, body, url });
    let sent = 0;
    let failed = 0;
    const dead = [];

    // Sent in parallel but settled either way: one phone whose subscription has
    // expired must not stop the notification reaching everybody else.
    await Promise.all(
      rows.map(async (r) => {
        const sub = { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } };
        try {
          await webpush.sendNotification(sub, payload, { TTL: 60 * 60 * 12 });
          sent++;
        } catch (e) {
          // 404/410 is the push service saying this endpoint is gone for good.
          // Left in the table it fails on every send from now until forever, so
          // it goes. Anything else may be temporary and is left alone.
          if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(r.endpoint);
          else failed++;
        }
      })
    );

    for (const endpoint of dead) {
      try {
        await run("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
      } catch {
        /* a row that will not delete is not worth failing the send over */
      }
    }
    try {
      await run("UPDATE push_subscriptions SET last_sent_at = datetime('now')");
    } catch {
      /* bookkeeping only */
    }

    res.json({ ok: true, sent, failed, removed: dead.length, subscribers: rows.length });
  });
}

module.exports = { register, initPushDb, pinOk, configured };
