# Feature Specification: Total Star Meetup

**Feature Branch**: `claude/geometry-dash-stats-site-km709f`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Create a website for Geometry Dash that takes a list
of players (you type their username) and loads the total stats (total number of
coins, stars, ...). Use speckit. Keep it simple and themed like the game. Use the
work of gdcolon. Release on GitHub Pages."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tally a group's combined stats (Priority: P1)

A player organizing a "meetup" types in several Geometry Dash usernames, one after
another. For each name the site looks up that player on GDBrowser and adds their
stats to a running group total. A big scoreboard shows the combined Stars, Moons,
Diamonds, Secret Coins, User Coins, Demons, and Creator Points of everyone entered.

**Why this priority**: This is the entire point of the product — the combined total
is the value. Without it there is no app.

**Independent Test**: Enter two or more known usernames and confirm the totals equal
the sum of each player's individual stats (verifiable against gdbrowser.com).

**Acceptance Scenarios**:

1. **Given** an empty roster, **When** I type a valid username and press Add/Enter,
   **Then** that player's stats load and the group totals update to that player's stats.
2. **Given** one player is loaded, **When** I add a second valid username,
   **Then** the group totals become the sum of both players across every stat.
3. **Given** several players are loaded, **When** I remove one,
   **Then** the totals recompute without that player.

### User Story 2 - Recognize and inspect each player (Priority: P2)

The organizer wants to see who is in the group and what each contributes, in a
layout that feels like Geometry Dash.

**Why this priority**: Trust and delight — people want to confirm the right players
were found and enjoy a game-authentic look.

**Independent Test**: Add a username and confirm a themed player card appears showing
their name, global rank, a cube drawn in their in-game colors, and their per-stat
numbers.

**Acceptance Scenarios**:

1. **Given** I add a valid username, **When** the profile loads, **Then** a card shows
   the player's name, global rank, a colored cube, and each stat with an icon.
2. **Given** a username that does not exist, **When** the lookup fails, **Then** the
   card shows a clear "player not found" state and does not corrupt the totals.

### User Story 3 - Fast, persistent, and gentle on the API (Priority: P3)

The roster survives page reloads, repeated lookups are instant, and the app does not
hammer GDBrowser.

**Why this priority**: Quality-of-life and good API citizenship; not required for a
one-shot demo but expected of a real tool.

**Independent Test**: Add players, reload the page, and confirm the same group returns
without re-fetching (served from cache); use a Refresh action to force fresh data.

**Acceptance Scenarios**:

1. **Given** players are loaded, **When** I reload the page, **Then** the same roster
   is restored from local storage.
2. **Given** a player was fetched recently, **When** they are re-added or the page
   reloads, **Then** their stats come from cache instead of a new network request.
3. **Given** cached players, **When** I press Refresh, **Then** the cache is bypassed
   and fresh stats are fetched.

### Edge Cases

- **Duplicate entry**: adding a username already in the roster does not double-count it.
- **Case / alias**: `RobTop` and `robtop` resolve to the same player and are not duplicated.
- **Not found**: an unknown username shows an error card and is excluded from totals.
- **Rate limited (HTTP 429)**: the app shows a "slow down" message and keeps existing data.
- **Network offline**: adding a player shows an error state; already-loaded players remain.
- **Empty roster**: a friendly, on-theme empty state invites the first username (with examples).
- **Missing stat**: if the API omits a stat for a player, that stat contributes 0 and is not shown as a false value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to add a Geometry Dash player to the group by typing a
  username and pressing Enter or an Add button.
- **FR-002**: The system MUST fetch each player's profile from the GDBrowser API
  (`/api/profile/{username}`) at runtime, in the browser.
- **FR-003**: The system MUST display a group total for each supported stat: Stars,
  Moons, Diamonds, Secret Coins, User Coins, Demons, and Creator Points.
- **FR-004**: The system MUST display, for each added player, a card with their username,
  global rank, in-game colors (as a cube), and their individual stat values.
- **FR-005**: Users MUST be able to remove an individual player and clear the whole group.
- **FR-006**: The system MUST recompute totals immediately whenever players are added or removed.
- **FR-007**: The system MUST prevent duplicate players (case-insensitive, and by resolved account).
- **FR-008**: The system MUST cache fetched profiles in `localStorage` with a time-to-live
  and reuse them instead of re-requesting, and MUST offer a Refresh action to bypass the cache.
- **FR-009**: The system MUST persist the current roster in `localStorage` and restore it on load.
- **FR-010**: The system MUST show distinct loading, success, not-found, and rate-limited/error
  states per player without breaking the rest of the page.
- **FR-011**: The system MUST support bulk entry (multiple names separated by commas or new lines).
- **FR-012**: The interface MUST be visually themed after Geometry Dash and be responsive
  from mobile to desktop.
- **FR-013**: The system MUST visibly credit GDColon / GDBrowser as the data source and link to it.
- **FR-014**: The system MUST be deployable as static files to GitHub Pages with no backend.

### Key Entities

- **Player (roster entry)**: a username the user typed, plus its lookup status
  (loading / ok / not-found / error) and, when ok, the fetched profile.
- **Profile**: the stats returned by GDBrowser for one account — username, playerID,
  accountID, global rank, stars, moons, diamonds, coins (secret), userCoins, demons,
  cp (creator points), and the two icon colors (`col1RGB`, `col2RGB`).
- **Group total**: the per-stat sum across all roster entries whose status is ok.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can add three usernames and read the combined totals in
  under 30 seconds, with no instructions.
- **SC-002**: For any set of players, each group total equals the exact arithmetic sum of the
  members' corresponding stat as reported by GDBrowser (0 discrepancy).
- **SC-003**: Re-adding a recently fetched player or reloading the page issues **zero** new
  network requests for that player (served from cache within the TTL).
- **SC-004**: A not-found or errored username never removes, alters, or blocks the totals of
  the valid players.
- **SC-005**: The site loads and is fully usable as static files served from a GitHub Pages
  subpath (e.g. `https://<user>.github.io/total-star-meetup/`).

## Assumptions

- The GDColon **GDBrowser** public API (`https://gdbrowser.com/api/profile/{username}`) is
  reachable from the visitor's browser and returns permissive CORS headers (it is designed
  as a public API). The tool degrades gracefully if it is temporarily unavailable.
- "Total stats" means the arithmetic sum of countable stats. Global **rank** is a ranking,
  not a countable quantity, so it is shown per player but not summed.
- Icon rendering is approximated with a colored cube built from the player's returned colors;
  pixel-accurate in-game icon sprites are out of scope for v1.
- Modern evergreen browsers (Chromium, Firefox, Safari) with `fetch` and `localStorage`.
- The roster is a modest size (a "meetup" — up to a few dozen players), fetched sequentially
  to stay gentle on the API.
