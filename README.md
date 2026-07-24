# ⭐ Total Star Meetup

A tiny, **Geometry Dash-themed** website that takes a list of players (you type
their usernames) and tallies the whole squad's **combined stats** — total Stars,
Moons, Diamonds, Secret Coins, User Coins, Demons and Creator Points.

Player data comes from **[GDBrowser](https://gdbrowser.com)** by
**[GDColon](https://gdcolon.com)**. It's a pure static site (no backend) that runs
entirely in your browser and deploys to **GitHub Pages**.

> Built spec-first with [GitHub Spec Kit](https://github.com/github/spec-kit) —
> see [`specs/001-gd-total-stats/`](specs/001-gd-total-stats/) for the constitution,
> spec, plan and tasks.

## What it does

- ➕ **Add players** one at a time, or paste a bunch separated by commas / new lines.
- 🧮 **Combined scoreboard** that sums every stat across the group and updates live.
- 🟩 **Player cards** with a cube drawn in each player's real in-game colors, their
  global rank, and their individual stats.
- 💾 **Remembers your group** across reloads and **caches** results in your browser,
  so it's instant and gentle on the GDBrowser API (with a **Refresh** button to force
  fresh data).
- 📱 Responsive, keyboard-friendly, and themed after the game.

## Run it locally

It's just static files — any web server works:

```bash
# from the repo root
cd site
python3 -m http.server 8080
# then open http://localhost:8080
```

Type a username (try `robtop`, `viprin`, `nasgubb`) and press **Enter**.

## Tests

A Playwright smoke test drives the UI against a **mocked** GDBrowser API (it never
touches the live service), verifying add → totals → remove → persistence:

```bash
npm install     # installs playwright (browser is pre-provisioned in CI/dev images)
npm test
```

## Deploy to GitHub Pages

Deployment is automated by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Push to the branch (or merge to your default branch). The workflow enables Pages,
   uploads the `site/` folder, and deploys it.
2. If your organization gates it, enable Pages once under
   **Settings → Pages → Build and deployment → Source: GitHub Actions**. If the
   deploy is blocked by an environment rule, allow the branch under the
   **github-pages** environment.
3. The site publishes at `https://<owner>.github.io/total-star-meetup/`.

All asset links are **relative**, so it works from the project subpath.

## How it works

```
site/
├── index.html      # markup + inline SVG stat icons
├── css/styles.css  # the Geometry Dash theme
└── js/
    ├── config.js   # API base, cache TTL, the stat definitions
    ├── gd-api.js   # GDBrowser fetch + localStorage cache
    └── app.js      # roster state, totals, rendering, events
```

The app calls `GET https://gdbrowser.com/api/profile/{username}` for each player,
caches the JSON in `localStorage` (15-minute TTL), and sums the countable stats.
Global **rank** is shown per player but not summed (it's a ranking, not an amount).

## Credits

- **[GDBrowser](https://gdbrowser.com)** and its public API — by **GDColon**.
- **Geometry Dash** © **RobTop Games**.

This is an unofficial, non-commercial fan project with no affiliation to RobTop
Games or GDColon.

## License

[MIT](LICENSE) — for the code in this repo. Geometry Dash assets, names, and the
GDBrowser service belong to their respective owners.
