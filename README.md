# Hello SQLite!

This project includes a [Node.js](https://nodejs.org/en/about/) server script that uses a persistent [SQLite](https://www.sqlite.org) database. The app also includes a front-end with two web pages that connect to the database using the server API. 📊

## Live broadcast relay (Lumen Presenter → OBS)

A tiny in‑memory pub/sub used by [Lumen Presenter](https://github.com/gowthamrajum/lumen-presenter) to stream the current live slide to a web page / OBS **Browser Source** as a transparent lyrics/scripture lower‑third. No database, no extra process — it just rides along on this service.

**Open by default — no configuration required.** The presenter just presses *Broadcast*; there are no keys to set. Each install uses its own `:room` slug so setups don't collide.

**Endpoints:**

- `POST /broadcast/:room` — presenter publishes the live state (JSON body).
- `GET  /broadcast/:room/state` — latest state (poll fallback).
- `GET  /broadcast/:room/stream` — Server‑Sent Events stream (instant updates).
- `GET  /broadcast/:room/view` — the self‑contained overlay page (`public/broadcast.html`). Two modes via `?mode`:
  - **OBS view** (default): transparent alpha, lyrics lower‑third. Options `?pos=bottom|center|top`, `?size=<vh>`, `?clean=1` (drop the scrim).
  - **User view** (`?mode=audience`): full opaque mirror of the projector — slide background + centered lyrics/scripture, theme applied. (Local `lumen-media://` image/video backgrounds can't cross to the web, so those fall back to the worship gradient.)

**URLs:** user/audience → `…/broadcast/<room>/view?mode=audience` · OBS browser source → `…/broadcast/<room>/view`.

**Optional lock‑down:** set `BROADCAST_ADMIN_TOKEN` and/or `BROADCAST_VIEWER_TOKEN` in the environment and the matching side then requires it (`Authorization: Bearer <token>` or `?token=`).

The home page presents the user with a poll where they can choose an option, then the page presents the results in a chart. The admin page displays the log of past choices and allows the user to clear it by supplying an admin key (you can set this up by following the steps in `TODO.md`). 🔒

_Last updated: 14 August 2023_

## Prerequisites

To get best use out of this project you'll ideally be familiar with JavaScript and have a little Node.js experience–check out [Hello Node](https://glitch.com/~glitch-hello-node) if you haven't already!

## What's in this project?

← `README.md`: That’s this file, where you can tell people what your cool website does and how you built it.

← `package.json`: The NPM packages for your project's dependencies.

← `.env`: The environment is cleared when you initially remix the project, but you will add a new env variable value when you follow the steps in `TODO.md` to set up an admin key.

### Server and database

← `server.js`: The Node.js server script for your new site. The JavaScript defines the endpoints in the site API. The API processes requests, connects to the database using the `sqlite` script in `src`, and sends info back to the client (the web pages that make up the app user interface, built using the Handlebars templates in `src/pages`).

← `/src/sqlite.js`: The database script handles setting up and connecting to the SQLite database. The `server.js` API endpoints call the functions in the database script to manage the data.

← `/src/data.json`: The data config file includes the database manager script–`server.js` reads the `database` property to import the correct script.

When the app runs, the scripts build the database:

← `.data/choices.db`: Your database is created and placed in the `.data` folder, a hidden directory whose contents aren’t copied when a project is remixed. You can see the contents of `.data` in the console by selecting __Tools__ >  __Logs__.

### User interface

← `public/style.css`: The style rules that define the site appearance.

← `src/pages`: The handlebars files that make up the site user interface. The API in `server.js` sends data to these templates to include in the HTML.

← `src/pages/index.hbs`: The site homepage presents a form when the user first visits. When the visitor submits a preference through the form, the app calls the `POST` endpoint `/`, passing the user selection. The `server.js` endpoint updates the database and returns the user choices submitted so far, which the page presents in a chart (using [Chart.js](https://www.chartjs.org/docs/)–you can see the code in the page `head`).

← `src/pages/admin.hbs`: The admin page presents a table displaying the log of most recent picks. You can clear the list by setting up your admin key (see `TODO.md`). If the user attempts to clear the list without a valid key, the page will present the log again.

← `src/seo.json`: When you're ready to share your new site or add a custom domain, change SEO/meta settings in here.

## Try this next 🏗️

Take a look in `TODO.md` for steps in setting up your admin key and adding to the site functionality.

💡 __Want to use the server script as an API without using the front-end UI? No problem! Just send a query parameter `?raw=json` with your requests to return JSON, like this (replace the first part of the URL to match your remix): `glitch-hello-sqlite.glitch.me?raw=json`__

___Check out [Blank SQLite](https://glitch.com/~glitch-blank-sqlite) for a minimal demo of get, post, put, and delete methods.___

![Glitch](https://cdn.glitch.com/a9975ea6-8949-4bab-addb-8a95021dc2da%2FLogo_Color.svg?v=1602781328576)

## You built this with Glitch!

[Glitch](https://glitch.com) is a friendly community where millions of people come together to build web apps and websites.

- Need more help? [Check out our Help Center](https://help.glitch.com/) for answers to any common questions.
- Ready to make it official? [Become a paid Glitch member](https://glitch.com/pricing) to boost your app with private sharing, more storage and memory, domains and more.

---

## Service media (Cloudflare R2)

Sunday's order can carry a video or a photo, and both the phone that adds it and
the projection machine that plays it have to be able to reach the file. This
relay is not the place for it: its disk is wiped on every restart, so a clip
uploaded on Saturday would often be gone on Sunday.

So media goes to Cloudflare R2 — 10 GB and no egress charge on the free plan —
and only the URL comes back here, inside the deck like any other background.
The browser uploads **directly** to R2 with a presigned URL, so nothing large
passes through this instance and the 50 mb body limit never applies.

**All of it is dormant until configured.** `GET /media/config` answers
`{"enabled": false}`, the app hides the upload option and offers a link instead,
and everything else works exactly as before. Pasting a YouTube or video link
needs none of this and always works.

### Turning it on

1. Cloudflare ▸ R2 ▸ **Create bucket** (e.g. `cantica-media`).
2. **Settings ▸ Public access** — either enable the `r2.dev` subdomain or, better,
   bind a custom domain. Copy that base URL.
3. **Manage R2 API Tokens ▸ Create** with *Object Read & Write* on that bucket.
   Keep the Access Key ID and Secret.
4. Set these on the Render service:




5. **The bucket needs CORS** — the browser talks to R2 directly, so R2 is what
   has to allow it. Bucket ▸ Settings ▸ CORS policy:

   ```json
   [{
     "AllowedOrigins": ["https://live.teluguchurchdfw.org", "https://cantica-web.onrender.com"],
     "AllowedMethods": ["PUT", "GET"],
     "AllowedHeaders": ["content-type"],
     "MaxAgeSeconds": 3600
   }]
   ```

   Without this the upload fails with a network error and no status code — which
   is exactly what the app reports, because it is the commonest cause and the
   one nobody guesses.

### What it will and won't accept

Images, video and audio only (`ALLOWED` in `r2.js`), 300 MB a file. Keys are
`service-media/<date>/<random>-<safe-name>`, so two people uploading
`welcome.mp4` never collide and no filename can escape the prefix.

`node r2.test.js` checks the request signing against AWS's published SigV4 test
vector and the key sanitiser against hostile filenames.
