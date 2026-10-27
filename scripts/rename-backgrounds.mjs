// Names and tags for the background library, from scripts/background-names.json
// (written after looking at a frame of every video). Needs the admin PIN:
//   ADMIN_PIN=xxxx node scripts/rename-backgrounds.mjs
import fs from 'fs'
const BASE = process.env.RELAY_BASE || 'https://grey-gratis-ice.onrender.com'
const pin = process.env.ADMIN_PIN
if (!pin) throw new Error('Set ADMIN_PIN (the same PIN as Send a notification).')
const plan = JSON.parse(fs.readFileSync(new URL('./background-names.json', import.meta.url), 'utf8'))
let ok = 0
for (const [id, [name, tags]] of Object.entries(plan)) {
  const r = await fetch(`${BASE}/media/backgrounds/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Pin ${pin}` },
    body: JSON.stringify({ name, tags })
  })
  if (r.ok) ok++
  else console.log(`#${id}: ${r.status} ${await r.text()}`)
  if (r.status === 403) process.exit(1) // wrong PIN — stop rather than repeat it 73 times
}
console.log(`Renamed and tagged ${ok} of ${Object.keys(plan).length}.`)
