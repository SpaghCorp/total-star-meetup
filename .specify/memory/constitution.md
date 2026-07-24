# Total Star Meetup Constitution

A small, joyful web app that tallies the combined Geometry Dash stats of a group
of players. These principles keep it simple, honest, and fun.

## Core Principles

### I. Static & Serverless
The product ships as pure static assets (HTML, CSS, vanilla JS) that run entirely
in the visitor's browser and deploy to GitHub Pages. There is no backend, no build
server, and no database. All player data is fetched at runtime from the public
GDColon **GDBrowser** API. If it cannot be hosted as flat files on GitHub Pages,
it does not belong in this project.

### II. Simplicity First (YAGNI)
No frameworks, no bundlers, no npm runtime dependencies. Plain HTML/CSS/JS loaded
with `<script>` tags. Every addition must earn its place; when two designs work,
choose the one with less code and fewer moving parts. Optimize for a contributor
being able to read the whole app in one sitting.

### III. Faithful to the Game
The interface should feel like Geometry Dash: bold chunky type, saturated neon
gradients, glow, and geometric blocks. Terminology and stats mirror the game
exactly — Stars, Moons, Diamonds, Secret Coins, User Coins, Demons, Creator
Points. When in doubt, match what a GD player already expects.

### IV. Kind to the API
GDBrowser is a free community service. The app MUST cache results in the browser,
MUST NOT poll or spam, MUST handle "not found", rate-limit, and network errors
gracefully, and MUST visibly credit GDColon / GDBrowser as the data source.

### V. Accessible & Resilient
Usable by keyboard, readable on mobile and desktop, and never a blank screen: the
group of players persists across reloads, individual failures never break the page,
and the UI always communicates loading, empty, and error states.

## Technical Constraints

- **Stack**: HTML5 + CSS3 + ES2019 vanilla JavaScript. No transpilation.
- **Data source**: `https://gdbrowser.com/api/profile/{username}` (read-only, no auth).
- **Storage**: `localStorage` only (group roster + cached profiles). No cookies, no secrets.
- **Hosting**: GitHub Pages via GitHub Actions (`actions/deploy-pages`).
- **Assets**: self-contained; icons are inline SVG, player cubes are drawn from the
  colors returned by the API. No tracking, no analytics.

## Development Workflow

Work follows the Spec Kit flow: constitution → spec → plan → tasks → implement.
Specs live under `specs/`. Changes should keep the published `site/` directory
deployable at every commit. Manual verification (load the page, add players, read
the totals) is the acceptance gate; automated UI smoke tests run against a mocked
API so they never depend on the live service.

## Governance

This constitution supersedes ad-hoc preferences. Any change that violates a
principle must either be reworked or recorded with a justification in the plan's
Complexity Tracking table. Amendments are made by editing this file and bumping
the version below.

**Version**: 1.0.0 | **Ratified**: 2026-07-24 | **Last Amended**: 2026-07-24
