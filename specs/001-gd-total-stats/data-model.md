# Data Model: Total Star Meetup

All data lives in the browser. There are three shapes: the external **Profile** we get
from GDBrowser, the **RosterEntry** we keep in memory + `localStorage`, and the derived
**GroupTotals**.

## Profile (from GDBrowser `/api/profile/{username}`)

The GDBrowser `Player` object. Fields this app reads:

| Field        | Type       | Meaning                        | Used for            |
|--------------|------------|--------------------------------|---------------------|
| `username`   | string     | Display name                   | Card title, dedupe  |
| `playerID`   | number     | GD player id                   | (reference)         |
| `accountID`  | number     | GD account id                  | Dedupe key          |
| `rank`       | number     | Global leaderboard rank        | Card badge (not summed) |
| `stars`      | number     | Stars                          | Total + card        |
| `moons`      | number     | Moons (2.2)                    | Total + card (if present) |
| `diamonds`   | number     | Diamonds                       | Total + card        |
| `coins`      | number     | Secret coins                   | Total + card        |
| `userCoins`  | number     | User (silver) coins            | Total + card        |
| `demons`     | number     | Demons beaten                  | Total + card        |
| `cp`         | number     | Creator Points                 | Total + card        |
| `col1RGB`    | [r,g,b]    | Primary icon color             | Cube body           |
| `col2RGB`    | [r,g,b]    | Secondary icon color           | Cube accent + glow  |
| `glow`       | boolean    | Icon glow enabled              | Cube glow           |

Notes:
- GDBrowser serializes absent numeric fields as `null` (a missing stat becomes `null`,
  distinct from a real `0`). The app treats non-finite stat values as "not available":
  they contribute `0` to totals and are hidden on the card rather than shown as a value.
- A failed lookup returns HTTP 4xx/5xx or the body `-1`; the client maps this to a
  not-found error rather than a Profile.

## Summable stats (the "total")

Only countable quantities are summed. Order and presentation:

| key         | Label          | Color family | Icon (svg symbol) |
|-------------|----------------|--------------|-------------------|
| `stars`     | Stars          | gold         | `#i-star`         |
| `moons`     | Moons          | ice blue     | `#i-moon`         |
| `diamonds`  | Diamonds       | cyan         | `#i-diamond`      |
| `coins`     | Secret Coins   | amber        | `#i-scoin`        |
| `userCoins` | User Coins     | silver       | `#i-ucoin`        |
| `demons`    | Demons         | red          | `#i-demon`        |
| `cp`        | Creator Points | orange       | `#i-cp`           |

`rank` is intentionally **not** in this list — it is a ranking, not a countable amount.

## RosterEntry (in memory + persisted)

```text
RosterEntry {
  key:    string        // canonical dedupe key = lowercased input, later the accountID
  input:  string        // exactly what the user typed
  status: "loading" | "ok" | "notfound" | "error"
  error?: string        // human message when status is "error"/"notfound"
  profile?: Profile     // present when status === "ok"
}
```

Persistence: only the list of `input` strings is stored under `gdtsm:roster`; profiles
are restored from the profile cache (or refetched if stale). This keeps stored state tiny
and always reconcilable with the cache.

## Profile cache

```text
localStorage["gdtsm:profile:" + lowercasedName] = {
  ts:   number     // Date.now() at fetch
  data: Profile
}
```

Entries older than `CACHE_TTL_MS` (default 15 min) are ignored and refetched. The Refresh
action clears cache entries for the current roster and refetches.

## GroupTotals (derived, never stored)

For each summable stat key: `sum of entry.profile[key] over entries where status==="ok"
and Number.isFinite(entry.profile[key])`. Also derived: `playerCount` (ok entries).
Recomputed on every roster change; there is no separate stored copy.
