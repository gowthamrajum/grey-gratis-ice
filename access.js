// Who may open the Service Builder, and who is holding a service open.
//
// Two small things that both answer "can this person change it?", kept together
// because they are asked on the same screen and neither is big enough to be a
// module of its own.
const crypto = require("crypto");

const BUILDER_PIN = process.env.BUILDER_PIN || "";

/**
 * How long a hold survives without a word from its holder.
 *
 * A tab closed by a phone going to sleep never says goodbye, so a lock that
 * only cleared on release would strand a service until the relay restarted.
 * Fifteen minutes is long enough to think, read a passage, take a call — and
 * short enough that a service is never locked for a whole evening by someone
 * who has gone home. LOCK_IDLE_MS overrides it — which is also the only way to
 * watch a hold expire without waiting a quarter of an hour to find out.
 */
const IDLE_MS = Number(process.env.LOCK_IDLE_MS) > 0 ? Number(process.env.LOCK_IDLE_MS) : 15 * 60 * 1000;

/** serviceId -> { holder, name, at }. In memory on purpose: see release(). */
const held = new Map();

function pinOk(given) {
  if (!BUILDER_PIN) return false;
  const a = crypto.createHash("sha256").update(String(given ?? "")).digest();
  const b = crypto.createHash("sha256").update(BUILDER_PIN).digest();
  return crypto.timingSafeEqual(a, b);
}

/** The live hold on a service, dropping it first if it has gone stale. */
function current(id, now) {
  const lock = held.get(id);
  if (!lock) return null;
  if (now - lock.at > IDLE_MS) {
    held.delete(id);
    return null;
  }
  return lock;
}

function register(app) {
  // Whether the builder is gated at all. An unset BUILDER_PIN leaves it open —
  // the same as before this existed. Locking the whole team out of the builder
  // because a variable was forgotten on a deploy is worse than not gating it.
  app.get("/builder/pin", (_req, res) => {
    res.json({ required: !!BUILDER_PIN });
  });

  app.post("/builder/pin", (req, res) => {
    if (!BUILDER_PIN) return res.json({ ok: true, required: false });
    if (!pinOk(req.body?.pin)) return res.status(403).json({ error: "bad-pin" });
    res.json({ ok: true, required: true });
  });

  /**
   * Claim a service, or refresh a claim already held.
   *
   * The same holder asking again is a heartbeat, not a second claim — that is
   * what keeps a service held while somebody is working, and lets it go when
   * they stop.
   */
  app.post("/services/:id/lock", (req, res) => {
    const id = String(req.params.id);
    const holder = String(req.body?.holder ?? "").slice(0, 60);
    const name = String(req.body?.name ?? "").slice(0, 60);
    if (!holder) return res.status(400).json({ error: "no-holder" });

    const now = Date.now();
    const lock = current(id, now);
    if (lock && lock.holder !== holder) {
      return res.status(409).json({
        error: "held",
        by: lock.name || "someone else",
        // How long until it frees itself, so the UI can say something true
        // rather than "try again later".
        freeInMs: Math.max(0, IDLE_MS - (now - lock.at))
      });
    }
    held.set(id, { holder, name, at: now });
    res.json({ ok: true, holder, freeInMs: IDLE_MS });
  });

  /**
   * Let a service go.
   *
   * Only the holder may: a second person releasing a lock they do not hold is
   * how two people end up editing at once, which is the thing this prevents.
   */
  app.delete("/services/:id/lock", (req, res) => {
    const id = String(req.params.id);
    const holder = String(req.query.holder ?? req.body?.holder ?? "");
    const lock = current(id, Date.now());
    if (lock && lock.holder !== holder) return res.status(403).json({ error: "not-holder" });
    held.delete(id);
    res.json({ ok: true });
  });

  /** Who holds it, if anyone — asked before offering to open a service. */
  app.get("/services/:id/lock", (req, res) => {
    const now = Date.now();
    const lock = current(String(req.params.id), now);
    if (!lock) return res.json({ held: false });
    res.json({
      held: true,
      by: lock.name || "someone else",
      holder: lock.holder,
      freeInMs: Math.max(0, IDLE_MS - (now - lock.at))
    });
  });
}

module.exports = { register, pinOk, IDLE_MS };
