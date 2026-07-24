# Implementation Plan: Total Star Meetup

**Branch**: `claude/geometry-dash-stats-site-km709f` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-gd-total-stats/spec.md`

## Summary

Build a single-page, static website that lets a user type Geometry Dash usernames and
shows the **combined** stats of the group (Stars, Moons, Diamonds, Secret Coins, User
Coins, Demons, Creator Points) plus a card per player. Data comes from the public
GDColon **GDBrowser** API at runtime; results and roster are cached in `localStorage`.
The whole thing is vanilla HTML/CSS/JS in a `site/` folder and is published to GitHub
Pages by a GitHub Actions workflow.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES2019), no build step.

**Primary Dependencies**: None at runtime. Data from GDBrowser (`gdbrowser.com/api`).
Google Fonts (Lilita One) with a system-font fallback. Dev-only: Playwright for a mocked smoke test.

**Storage**: Browser `localStorage` — cached profiles (`gdtsm:profile:*`) and roster (`gdtsm:roster`).

**Testing**: Playwright script that intercepts the GDBrowser request and returns fixtures,
verifying add / totals / remove / persistence without touching the live API.

**Target Platform**: Static hosting on GitHub Pages (project subpath). Evergreen browsers.

**Project Type**: Static web front-end (single page).

**Performance Goals**: First render < 1s on a cold load; cached re-add is instant (no network).

**Constraints**: No backend, no secrets, offline-tolerant for already-loaded players, one
in-flight request at a time per added player (sequential, gentle on the API).

**Scale/Scope**: A meetup-sized roster (up to a few dozen players); one screen.

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Static & Serverless | PASS | Flat files in `site/`, no backend; API called from the browser. |
| II. Simplicity First | PASS | Vanilla JS, three small scripts, zero runtime deps. |
| III. Faithful to the Game | PASS | GD palette, chunky display font, glow, cube icons, GD stat names. |
| IV. Kind to the API | PASS | `localStorage` cache + TTL, sequential fetch, error/rate-limit handling, visible credit. |
| V. Accessible & Resilient | PASS | Keyboard add/remove, ARIA live regions, persisted roster, per-player error states. |

No violations — Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-gd-total-stats/
├── plan.md              # This file
├── spec.md              # Feature specification
├── data-model.md        # Entities + API field mapping
├── quickstart.md        # How to run / deploy
├── contracts/
│   └── gdbrowser-profile.md   # The one external API contract we depend on
└── tasks.md             # Ordered task list
```

### Source Code (repository root)

```text
site/                      # <- the deployable GitHub Pages artifact
├── index.html             # Markup, inline SVG icon sprite, script includes
├── .nojekyll              # Serve assets verbatim
├── css/
│   └── styles.css         # Geometry Dash theme
└── js/
    ├── config.js          # API base URL, cache TTL, STAT definitions, examples
    ├── gd-api.js          # GDBrowser client + localStorage cache
    └── app.js             # State, rendering, events (the UI controller)

tests/
└── smoke.mjs              # Playwright smoke test against a mocked API

.github/workflows/
└── deploy.yml             # Build-free Pages deployment (configure/upload/deploy)

README.md                  # What it is, how to run, how Pages is wired, credits
```

**Structure Decision**: A single static page. The publishable site is isolated in
`site/` so the Pages artifact contains only the app (not specs or tooling). JS is split
into three files by responsibility (config / data / UI) so each is small and readable,
loaded as plain scripts (no modules) for maximum robustness on Pages and `file://`.

## Complexity Tracking

> No constitution violations — nothing to justify.
