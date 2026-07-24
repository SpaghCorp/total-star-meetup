# Quickstart: Total Star Meetup

## Run it locally

It's static — any web server works. From the repo root:

```bash
cd site
python3 -m http.server 8080
# open http://localhost:8080
```

Then type a Geometry Dash username (try `robtop`, `viprin`, `nasgubb`) and press Enter.
Add a few and watch the group totals add up.

> Opening `site/index.html` directly with `file://` also works (scripts are plain, not
> modules), but a local server better mirrors GitHub Pages.

## Run the smoke test (mocked API)

The test uses the pre-installed Chromium via Playwright and never calls the live API.

```bash
node tests/smoke.mjs
```

It serves `site/`, intercepts the GDBrowser request with fixtures, and asserts that
adding players updates the totals, removing recomputes them, and the roster persists.

## Deploy to GitHub Pages

Deployment is automated by `.github/workflows/deploy.yml`:

1. Push the branch (or merge to the default branch). The workflow runs `configure-pages`
   (with `enablement: true`), uploads the `site/` folder as the Pages artifact, and
   deploys it.
2. If your org requires it, enable Pages once under **Settings → Pages → Build and
   deployment → Source: GitHub Actions**, and (if the branch is gated) allow this branch
   in the **github-pages** environment.
3. The site publishes at `https://<owner>.github.io/total-star-meetup/`.

Because Pages serves the project from a subpath, all asset links are **relative** — keep
them that way.

## Credits

Player data comes from **GDBrowser** by **GDColon** — <https://gdbrowser.com>. Geometry
Dash is by RobTop Games. This project is an unofficial fan tool.
