# Tasks: Total Star Meetup

**Feature**: `specs/001-gd-total-stats/` | **Branch**: `claude/geometry-dash-stats-site-km709f`

Tasks are grouped by phase and user story. `[P]` marks tasks that can run in parallel
(different files, no ordering dependency). Story tags map back to `spec.md`.

## Phase 1 — Setup

- [x] T001 Create the publishable `site/` skeleton: `site/index.html`, `site/css/styles.css`,
  `site/js/{config,gd-api,app}.js`, and `site/.nojekyll`.
- [x] T002 [P] Add `config.js`: `API_BASE`, `CACHE_TTL_MS`, cache/roster storage keys,
  the ordered `STATS` definitions (key/label/icon/color), and example usernames.

## Phase 2 — Foundational (blocks all stories)

- [x] T003 Implement `gd-api.js`: `getProfile(name, {force})` with a `localStorage` cache
  (TTL), defensive parsing (`-1`/HTML/empty → not found), and typed errors
  (NotFound / RateLimited / Network). Depends on T002.
- [x] T004 Build the base page shell + Geometry Dash theme in `index.html` + `styles.css`:
  animated background, header, the username input + Add button, roster/empty containers,
  the totals scoreboard container, footer credit, and the inline SVG icon sprite.

## Phase 3 — User Story 1: Tally a group's combined stats (P1) 🎯 MVP

- [x] T005 [US1] Roster state + add flow in `app.js`: parse input (supporting comma/newline
  bulk add — FR-011), dedupe by lowercased name (FR-007), create `loading` entries, fetch
  sequentially via `gd-api`, update entry status.
- [x] T006 [US1] Compute + render `GroupTotals`: sum each summable stat over `ok` entries,
  render the scoreboard tiles (icon + label + formatted number), update on every change (FR-003, FR-006).
- [x] T007 [US1] Remove-player and clear-all controls that recompute totals (FR-005).

## Phase 4 — User Story 2: Recognize and inspect each player (P2)

- [x] T008 [US2] Player card: name, global rank badge, a cube drawn from `col1RGB`/`col2RGB`
  (+ glow), and per-stat values with icons; hide stats the API did not provide (FR-004).
- [x] T009 [US2] Per-entry loading / not-found / error states rendered on the card without
  affecting other players or the totals (FR-010, edge cases).

## Phase 5 — User Story 3: Fast, persistent, gentle on the API (P3)

- [x] T010 [US3] Persist the roster (`gdtsm:roster`) and restore it on load, rehydrating from
  the profile cache (FR-009).
- [x] T011 [US3] Refresh action that bypasses/clears the cache for the roster and refetches;
  dedupe by resolved `accountID` after load (FR-007, FR-008).

## Phase 6 — Release & polish

- [x] T012 [P] `.github/workflows/deploy.yml`: configure-pages (enablement) → upload `site/` →
  deploy-pages, triggered on push + manual dispatch (FR-014).
- [x] T013 [P] `README.md` (what it is, run, deploy, credits) and root `.gitignore`.
- [x] T014 `tests/smoke.mjs`: Playwright smoke test against a mocked GDBrowser API covering
  add → totals → remove → persistence (SC-002, SC-004).
- [x] T015 Responsive + a11y polish: keyboard operable, ARIA live region for totals, mobile
  layout down to ~360px (FR-012).

## Dependencies

- T002 → T003. T001/T004 → everything visual. US1 (T005–T007) is the MVP and must land first.
- US2 (T008–T009) and US3 (T010–T011) build on US1's state but are independent of each other.
- Release tasks (T012–T015) come after the app renders and totals are correct.
