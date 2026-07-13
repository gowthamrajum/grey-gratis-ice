# Hello SQLite!

This project includes a [Node.js](https://nodejs.org/en/about/) server script that uses a persistent [SQLite](https://www.sqlite.org) database. The app also includes a front-end with two web pages that connect to the database using the server API. 📊

## Live broadcast relay (Lumen Presenter → OBS)

A tiny in‑memory pub/sub used by [Lumen Presenter](https://github.com/gowthamrajum/lumen-presenter) to stream the current live slide to an OBS **Browser Source** as a transparent lyrics/scripture lower‑third. No database, no extra process — it just rides along on this service.

**Configure two secrets in the environment:**

| Env var | Purpose |
| --- | --- |
| `BROADCAST_ADMIN_TOKEN` | Authorizes publishing. Lives only on the presenter (admin) machine. |
| `BROADCAST_VIEWER_TOKEN` | Read‑only; embedded in the OBS URL. |

If either is unset the matching endpoints return `503` (feature stays off).

**Endpoints** (`:room` lets several churches share one relay):

- `POST /broadcast/:room` — admin publishes the live state. `Authorization: Bearer <BROADCAST_ADMIN_TOKEN>`. Body = JSON live state.
- `GET  /broadcast/:room/state?token=<viewer>` — latest state (poll fallback).
- `GET  /broadcast/:room/stream?token=<viewer>` — Server‑Sent Events stream (instant updates).
- `GET  /broadcast/:room/view?token=<viewer>` — the self‑contained OBS overlay page (`public/broadcast.html`).

**OBS Browser Source URL:** `https://<this-host>/broadcast/main/view?token=<BROADCAST_VIEWER_TOKEN>` (transparent background; optional `&pos=bottom|center|top` and `&size=<vh>`).

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
