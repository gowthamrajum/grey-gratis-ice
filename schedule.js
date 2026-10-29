// The team, and the monthly schedule of who serves and what is sung.
//
// Two tables that only make sense together: a schedule names people by their
// id in the team, so the team is defined here too.
//
//   GET    /users                    the team (?all=1 includes people removed)
//   GET    /users/:id                one person
//   POST   /users                    add one, or an array of them     (API key)
//   PUT    /users/:id                change a name or roles            (API key)
//   DELETE /users/:id                take someone off the team         (API key)
//
//   GET    /schedules                every month planned, without the detail
//   GET    /schedules/:month         one month — 'YYYY-MM'
//   PUT    /schedules/:month         save the whole month               (builder PIN)
//   PUT    /schedules/:month/sundays/:date   save one Sunday           (builder PIN)
//   DELETE /schedules/:month         drop the month                     (builder PIN)
//
// Adding people takes USERS_API_KEY, as "Authorization: Bearer <key>". Unset,
// nobody can change the team — the safe way round, as with the media PIN.
// Schedules take the builder PIN ("Authorization: Pin <pin>") when BUILDER_PIN
// is set, and are open when it is not — the same rule as the builder itself.
//
// A month is saved while it is still being planned, so a Sunday with nobody on
// sound yet is not an error: it comes back in `gaps`. What IS refused is a
// schedule that is wrong rather than unfinished — a date that is not a Sunday,
// someone in a role they don't fill, the same person in two places at once.
const crypto = require("crypto");

const USERS_API_KEY = process.env.USERS_API_KEY || "";

const ROLES = ["vocals", "keys", "drums", "guitar", "camera", "powerpoint", "sound", "greeter"];

/** Each slot on a Sunday: which team role fills it, and how many it needs. */
const SLOTS = {
  choir: {
    vocalists: { role: "vocals", min: 1 },
    keys: { role: "keys", min: 1 },
    drums: { role: "drums", min: 0 },
    guitar: { role: "guitar", min: 0 }
  },
  media: {
    camera: { role: "camera", min: 1 },
    powerpoint: { role: "powerpoint", min: 1 },
    sound: { role: "sound", min: 1 },
    greeter: { role: "greeter", min: 1 }
  }
};

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function keyOk(req) {
  if (!USERS_API_KEY) return false;
  const m = /^Bearer\s+(.+)$/i.exec(req.get("authorization") || "");
  const a = crypto.createHash("sha256").update(String((m && m[1]) || "")).digest();
  const b = crypto.createHash("sha256").update(USERS_API_KEY).digest();
  return crypto.timingSafeEqual(a, b);
}

/** "James Roy Muggalla" -> "james-roy-muggalla" */
function slugify(name) {
  return String(name).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function initScheduleDb(run) {
  // Removing someone sets active = 0 rather than deleting the row: last month's
  // schedule still names them, and it should still say who that was.
  await run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      roles TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS schedules (
      month TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
}

// ---------- users ----------

function cleanRoles(v) {
  const list = Array.isArray(v) ? v : [];
  return ROLES.filter((r) => list.includes(r));
}

/** A person as sent, or { error }. `id` may be left out and comes from the name. */
function validateUser(u, { partial = false } = {}) {
  if (!u || typeof u !== "object" || Array.isArray(u)) return { error: "Send a person." };
  const out = {};
  if (!partial || u.name !== undefined) {
    const name = String(u.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    if (!name) return { error: "A person needs a name." };
    out.name = name;
  }
  if (!partial || u.roles !== undefined) {
    if (!Array.isArray(u.roles)) return { error: `roles is a list — any of ${ROLES.join(", ")}.` };
    const unknown = u.roles.filter((r) => !ROLES.includes(r));
    if (unknown.length) return { error: `Unknown role: ${unknown.join(", ")}. Roles are ${ROLES.join(", ")}.` };
    out.roles = cleanRoles(u.roles);
    if (!out.roles.length) return { error: "A person needs at least one role." };
  }
  if (!partial) {
    const id = u.id !== undefined ? String(u.id).trim() : slugify(out.name);
    if (!ID_RE.test(id)) return { error: "id is lower-case letters, digits and single dashes." };
    out.id = id;
  }
  return out;
}

const userRow = (r) => {
  let roles = [];
  try { roles = cleanRoles(JSON.parse(r.roles)); } catch (_) {}
  return { id: r.id, name: r.name, roles, active: Number(r.active) === 1, createdAt: r.createdAt, updatedAt: r.updatedAt };
};

// ---------- schedules ----------

function fromISODate(iso) {
  const m = DATE_RE.exec(String(iso ?? "").trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt : null;
}

/** Every Sunday in 'YYYY-MM', as 'YYYY-MM-DD'. */
function sundaysOf(month) {
  const m = MONTH_RE.exec(month);
  if (!m) return [];
  const [y, mo] = [Number(m[1]), Number(m[2])];
  const out = [];
  const d = new Date(Date.UTC(y, mo - 1, 1));
  d.setUTCDate(1 + ((7 - d.getUTCDay()) % 7));
  while (d.getUTCMonth() === mo - 1) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

function httpUrl(v) {
  try {
    const u = new URL(String(v));
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch (_) {
    return null;
  }
}

/** A song's audio or lyrics: the Song DB, an external link, or not found yet. */
function cleanReference(ref, what, errors) {
  if (ref === null || ref === undefined) return null;
  if (ref.source === "songdb") {
    const songId = Number(ref.songId);
    if (!Number.isInteger(songId) || songId < 1) { errors.push(`${what}: songdb needs a songId.`); return null; }
    return { source: "songdb", songId };
  }
  if (ref.source === "external") {
    const url = httpUrl(ref.url);
    if (!url) { errors.push(`${what}: external needs an http(s) url.`); return null; }
    return { source: "external", url };
  }
  errors.push(`${what}: source is "songdb" or "external".`);
  return null;
}

function cleanSong(s, i, where, errors) {
  const at = `${where} song ${i + 1}`;
  if (!s || typeof s !== "object") { errors.push(`${at}: send a song.`); return null; }
  const title = s.title && typeof s.title === "object" ? s.title : {};
  const english = String(title.english ?? "").trim();
  const telugu = String(title.telugu ?? "").trim();
  if (!english && !telugu) { errors.push(`${at}: a song needs a title.`); return null; }
  const songId = s.songId === null || s.songId === undefined ? null : Number(s.songId);
  if (songId !== null && (!Number.isInteger(songId) || songId < 1)) errors.push(`${at}: songId is a Song DB id or null.`);
  return {
    order: i + 1,
    title: { telugu: telugu || null, english: english || telugu },
    songId,
    audio: cleanReference(s.audio, `${at} audio`, errors),
    lyrics: cleanReference(s.lyrics, `${at} lyrics`, errors)
  };
}

/**
 * One Sunday, checked against the team. Returns the clean Sunday; problems go
 * into `errors` (refuse) or `gaps` (save, but say what is still missing).
 */
function cleanSunday(s, month, team, kept, errors, gaps) {
  const date = String(s?.date ?? "").trim();
  const where = date || "a Sunday";
  const dt = fromISODate(date);
  if (!dt) { errors.push(`${where}: date is YYYY-MM-DD.`); return null; }
  if (dt.getUTCDay() !== 0) errors.push(`${date} is not a Sunday.`);
  if (date.slice(0, 7) !== month) errors.push(`${date} is not in ${month}.`);

  const songs = (Array.isArray(s.songs) ? s.songs : []).map((x, i) => cleanSong(x, i, date, errors)).filter(Boolean);

  // Who is already placed this Sunday — a person, or a guest by name — so the
  // same one cannot be on keys and drums at once.
  const placed = new Map();
  const out = { date, occasion: String(s.occasion ?? "").trim() || null, songs };

  for (const [group, slots] of Object.entries(SLOTS)) {
    out[group] = {};
    const given = s[group] && typeof s[group] === "object" ? s[group] : {};
    for (const [slot, { role, min }] of Object.entries(slots)) {
      const list = Array.isArray(given[slot]) ? given[slot] : [];
      const clean = [];
      for (const a of list) {
        let entry, key, label;
        if (typeof a === "string") {
          const person = team.get(a);
          if (!person) { errors.push(`${date} ${slot}: no one on the team has the id "${a}".`); continue; }
          // Taken off the team since: they stay on a Sunday that already had
          // them, so planning the rest of the month isn't blocked, but they
          // can't be put anywhere new.
          if (!person.active && !kept.has(`${date}|${a}`)) {
            errors.push(`${date} ${slot}: ${person.name} has been taken off the team.`);
            continue;
          }
          if (!person.roles.includes(role)) { errors.push(`${date} ${slot}: ${person.name} isn't down for ${role}.`); continue; }
          entry = a; key = `id:${a}`; label = person.name;
        } else if (a && typeof a === "object" && String(a.name ?? "").trim()) {
          const name = String(a.name).trim().replace(/\s+/g, " ").slice(0, 80);
          entry = { name }; key = `guest:${name.toLowerCase()}`; label = name;
        } else {
          errors.push(`${date} ${slot}: each entry is a team id or { "name": "…" }.`);
          continue;
        }
        if (placed.has(key)) {
          errors.push(`${date}: ${label} is in both ${placed.get(key)} and ${slot}.`);
          continue;
        }
        placed.set(key, slot);
        clean.push(entry);
      }
      if (clean.length < min) gaps.push({ date, slot, need: min, have: clean.length });
      out[group][slot] = clean;
    }
  }
  out.notes = String(s.notes ?? "").slice(0, 2000);
  return out;
}

/**
 * The whole month, checked. { schedule, errors, gaps }. `stored` is the month
 * as it was saved, if it was — see the taken-off-the-team rule above.
 */
function cleanSchedule(body, month, team, stored) {
  const kept = new Set();
  for (const s of stored?.sundays || []) {
    for (const group of Object.keys(SLOTS)) {
      for (const list of Object.values(s[group] || {})) {
        for (const a of list) if (typeof a === "string") kept.add(`${s.date}|${a}`);
      }
    }
  }
  const errors = [];
  const gaps = [];
  const list = Array.isArray(body?.sundays) ? body.sundays : [];
  const seen = new Set();
  const sundays = [];
  for (const s of list) {
    const clean = cleanSunday(s, month, team, kept, errors, gaps);
    if (!clean) continue;
    if (seen.has(clean.date)) { errors.push(`${clean.date} is in the month twice.`); continue; }
    seen.add(clean.date);
    sundays.push(clean);
  }
  sundays.sort((a, b) => a.date.localeCompare(b.date));
  return { schedule: { format: "cantica-schedule", version: 1, month, sundays }, errors, gaps };
}

/** Every Sunday's gaps, worked out again on read — the team may have changed. */
function gapsOf(schedule) {
  const gaps = [];
  for (const s of schedule.sundays || []) {
    for (const [group, slots] of Object.entries(SLOTS)) {
      for (const [slot, { min }] of Object.entries(slots)) {
        const have = (s[group]?.[slot] || []).length;
        if (have < min) gaps.push({ date: s.date, slot, need: min, have });
      }
    }
  }
  return gaps;
}

/** Ids a schedule names, so a response can say who they are. */
function idsIn(schedule) {
  const ids = new Set();
  for (const s of schedule.sundays || []) {
    for (const group of Object.keys(SLOTS)) {
      for (const list of Object.values(s[group] || {})) {
        for (const a of list) if (typeof a === "string") ids.add(a);
      }
    }
  }
  return [...ids];
}

function register(app, { run, get, all, pinOk }) {
  /** Everyone, removed people included — cleanSunday decides what they may do. */
  async function loadTeam() {
    const rows = await all("SELECT * FROM team_members");
    return new Map(rows.map((r) => [r.id, userRow(r)]));
  }

  /** The schedule as stored, with `people` naming every id in it. */
  async function scheduleOut(row) {
    let schedule;
    try { schedule = JSON.parse(row.data); } catch (_) { schedule = { sundays: [] }; }
    const ids = idsIn(schedule);
    const people = {};
    if (ids.length) {
      const rows = await all(`SELECT * FROM team_members WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
      for (const r of rows) {
        const u = userRow(r);
        people[u.id] = { name: u.name, active: u.active };
      }
    }
    return { ...schedule, createdAt: row.createdAt, updatedAt: row.updatedAt, people, gaps: gapsOf(schedule) };
  }

  /** Schedules need the builder PIN when one is set. */
  function builderOk(req) {
    if (!process.env.BUILDER_PIN) return true;
    const m = /^Pin\s+(.+)$/i.exec(req.get("authorization") || "");
    return pinOk((m && m[1]) || req.body?.pin);
  }

  function needKey(req, res) {
    if (!USERS_API_KEY) {
      res.status(503).json({ error: "no-api-key", message: "USERS_API_KEY is not set on the relay." });
      return false;
    }
    if (!keyOk(req)) {
      res.status(401).json({ error: "bad-api-key", message: "Send the API key as Authorization: Bearer <key>." });
      return false;
    }
    return true;
  }

  // ---------- users ----------

  app.get("/users", async (req, res) => {
    try {
      const everyone = req.query.all === "1";
      const rows = await all(
        `SELECT * FROM team_members ${everyone ? "" : "WHERE active = 1"} ORDER BY name COLLATE NOCASE`
      );
      res.set("Cache-Control", "no-store");
      res.json({ roles: ROLES, users: rows.map(userRow) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/users/:id", async (req, res) => {
    try {
      const row = await get("SELECT * FROM team_members WHERE id = ?", [req.params.id]);
      if (!row) return res.status(404).json({ error: "not-found" });
      res.json(userRow(row));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Add one person or several. An id already on the team is refused, unless
   * that person had been removed — then adding them again brings them back.
   */
  app.post("/users", async (req, res) => {
    if (!needKey(req, res)) return;
    const many = Array.isArray(req.body);
    const list = many ? req.body : [req.body];
    const clean = [];
    for (const [i, u] of list.entries()) {
      const c = validateUser(u);
      if (c.error) return res.status(400).json({ error: many ? `Person ${i + 1}: ${c.error}` : c.error });
      if (clean.some((x) => x.id === c.id)) return res.status(400).json({ error: `"${c.id}" is in the list twice.` });
      clean.push(c);
    }
    try {
      const existing = await all(
        `SELECT id, active FROM team_members WHERE id IN (${clean.map(() => "?").join(",")})`,
        clean.map((c) => c.id)
      );
      const taken = existing.filter((r) => Number(r.active) === 1).map((r) => r.id);
      if (taken.length) {
        return res.status(409).json({ error: "exists", message: `Already on the team: ${taken.join(", ")}.`, ids: taken });
      }
      const now = new Date().toISOString();
      for (const c of clean) {
        await run(
          `INSERT INTO team_members (id, name, roles, active, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, roles = excluded.roles, active = 1, updatedAt = excluded.updatedAt`,
          [c.id, c.name, JSON.stringify(c.roles), now, now]
        );
      }
      const rows = await all(
        `SELECT * FROM team_members WHERE id IN (${clean.map(() => "?").join(",")}) ORDER BY name COLLATE NOCASE`,
        clean.map((c) => c.id)
      );
      const users = rows.map(userRow);
      res.status(201).json(many ? { users } : users[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/users/:id", async (req, res) => {
    if (!needKey(req, res)) return;
    const c = validateUser(req.body, { partial: true });
    if (c.error) return res.status(400).json({ error: c.error });
    try {
      const row = await get("SELECT * FROM team_members WHERE id = ?", [req.params.id]);
      if (!row) return res.status(404).json({ error: "not-found" });
      const now = new Date().toISOString();
      await run(
        "UPDATE team_members SET name = COALESCE(?, name), roles = COALESCE(?, roles), updatedAt = ? WHERE id = ?",
        [c.name ?? null, c.roles ? JSON.stringify(c.roles) : null, now, req.params.id]
      );
      res.json(userRow(await get("SELECT * FROM team_members WHERE id = ?", [req.params.id])));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/users/:id", async (req, res) => {
    if (!needKey(req, res)) return;
    try {
      const r = await run("UPDATE team_members SET active = 0, updatedAt = ? WHERE id = ? AND active = 1", [
        new Date().toISOString(),
        req.params.id
      ]);
      if (!r.rowsAffected) return res.status(404).json({ error: "not-found" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------- schedules ----------

  app.get("/schedules", async (req, res) => {
    try {
      const rows = await all("SELECT * FROM schedules ORDER BY month DESC");
      res.set("Cache-Control", "no-store");
      res.json({
        schedules: rows.map((r) => {
          let s = {};
          try { s = JSON.parse(r.data); } catch (_) {}
          return {
            month: r.month,
            sundays: (s.sundays || []).map((x) => x.date),
            gaps: gapsOf(s).length,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
          };
        })
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * One month. A month not yet planned is not a 404 — it comes back empty,
   * with its Sundays laid out, which is exactly what the builder opens on.
   */
  app.get("/schedules/:month", async (req, res) => {
    const month = req.params.month;
    if (!MONTH_RE.test(month)) return res.status(400).json({ error: "month is YYYY-MM." });
    try {
      const row = await get("SELECT * FROM schedules WHERE month = ?", [month]);
      res.set("Cache-Control", "no-store");
      if (!row) {
        return res.json({ format: "cantica-schedule", version: 1, month, saved: false, sundays: [], allSundays: sundaysOf(month), people: {}, gaps: [] });
      }
      res.json({ ...(await scheduleOut(row)), saved: true, allSundays: sundaysOf(month) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  async function save(month, schedule) {
    const now = new Date().toISOString();
    await run(
      `INSERT INTO schedules (month, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)
       ON CONFLICT(month) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`,
      [month, JSON.stringify(schedule), now, now]
    );
    return get("SELECT * FROM schedules WHERE month = ?", [month]);
  }

  app.put("/schedules/:month", async (req, res) => {
    if (!builderOk(req)) return res.status(403).json({ error: "bad-pin" });
    const month = req.params.month;
    if (!MONTH_RE.test(month)) return res.status(400).json({ error: "month is YYYY-MM." });
    try {
      const row = await get("SELECT data FROM schedules WHERE month = ?", [month]);
      let stored = null;
      if (row) try { stored = JSON.parse(row.data); } catch (_) {}
      const { schedule, errors } = cleanSchedule(req.body, month, await loadTeam(), stored);
      if (errors.length) return res.status(400).json({ error: "invalid", errors });
      res.json({ ...(await scheduleOut(await save(month, schedule))), saved: true, allSundays: sundaysOf(month) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * One Sunday, leaving the rest of the month as it is — so two people can
   * plan different Sundays without one save undoing the other.
   */
  app.put("/schedules/:month/sundays/:date", async (req, res) => {
    if (!builderOk(req)) return res.status(403).json({ error: "bad-pin" });
    const { month, date } = req.params;
    if (!MONTH_RE.test(month)) return res.status(400).json({ error: "month is YYYY-MM." });
    try {
      const row = await get("SELECT * FROM schedules WHERE month = ?", [month]);
      let current = { sundays: [] };
      if (row) try { current = JSON.parse(row.data); } catch (_) {}
      const others = (current.sundays || []).filter((s) => s.date !== date);
      const { schedule, errors } = cleanSchedule(
        { sundays: [...others, { ...req.body, date }] },
        month,
        await loadTeam(),
        current
      );
      if (errors.length) return res.status(400).json({ error: "invalid", errors });
      res.json({ ...(await scheduleOut(await save(month, schedule))), saved: true, allSundays: sundaysOf(month) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/schedules/:month", async (req, res) => {
    if (!builderOk(req)) return res.status(403).json({ error: "bad-pin" });
    try {
      const r = await run("DELETE FROM schedules WHERE month = ?", [req.params.month]);
      if (!r.rowsAffected) return res.status(404).json({ error: "not-found" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { register, initScheduleDb, sundaysOf, ROLES, SLOTS };
