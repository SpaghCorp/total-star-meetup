# External Contract: GDBrowser Profile API

The single external dependency. Provided by **GDColon**'s
[GDBrowser](https://github.com/GDColon/GDBrowser) (`https://gdbrowser.com`). Read-only,
no authentication, community-run — treat it as best-effort and cache aggressively.

## Request

```
GET https://gdbrowser.com/api/profile/{username}
```

- `{username}` is URL-encoded. The endpoint also accepts an account ID.
- No auth, no custom headers required. The endpoint is rate-limited server-side.

## Success response `200 OK` (application/json)

A `Player` object. Example (abridged, RobTop):

```json
{
  "username": "RobTop",
  "playerID": 16,
  "accountID": 71,
  "rank": 0,
  "stars": 1,
  "moons": 0,
  "diamonds": 0,
  "coins": 0,
  "userCoins": 0,
  "demons": 0,
  "cp": 14,
  "col1RGB": [125, 255, 0],
  "col2RGB": [0, 255, 255],
  "glow": false
}
```

Field semantics are documented in [../data-model.md](../data-model.md). Absent numeric
stats may be serialized as `null`.

## Error responses

| Condition           | Observed                                   | Client behavior                         |
|---------------------|--------------------------------------------|-----------------------------------------|
| Unknown player      | non-2xx status, or body `-1`, or HTML body | `status: "notfound"` card, excluded from totals |
| Rate limited        | HTTP `429`                                 | `status: "error"`, "slow down" message, existing data kept |
| Network / CORS fail | fetch rejects                              | `status: "error"`, network message, existing data kept |

## Client rules (see `site/js/gd-api.js`)

1. Check `localStorage` cache first; only hit the network on a miss or when forced (Refresh).
2. One request per added player; the roster is fetched sequentially, not in a burst.
3. Parse defensively: read as text, reject `-1`/HTML/empty, then `JSON.parse`.
4. Never send anything but the username; store nothing but public profile data.
5. Credit GDBrowser/GDColon visibly in the UI and link back to `gdbrowser.com`.
