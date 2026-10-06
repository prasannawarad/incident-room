# What I verify myself (evidence goes in README.md)

## Live URL, two browsers (normal + incognito), two accounts
- [ ] A creates incident; B opens link → B shows in presence
- [ ] A adds entry → appears in B without reload (and reverse)
- [ ] B has no editable status control; B sees read-only locked status; forcing an update via devtools is denied (RBAC, not just UI)
- [ ] Postmortem with <3 entries → clear error
- [ ] Generate → appears for both; every claim cites real entry ids; nothing invented
- [ ] 4th generation blocked by cap
- [ ] Demo button works for a fresh account
- [ ] Refresh mid-session: state survives
- [ ] Signed-out user can't reach /incidents

## Code
- [ ] Read every RBAC rule myself; matches SPEC.md
- [ ] Read the postmortem prompt; grounding rule present
- [ ] No secrets: `git grep -nE "(sk-|api[_-]?key|secret)"`, `.dev.vars` ignored
- [ ] No hardcoded model allowlist
- [ ] `npx deepspace test run all` green
- [ ] `npx deepspace logs --json`: no exceptions on core path
- [ ] `npx deepspace app usage`: AI spend sane

## Log what I changed by hand (for writeup + live session)
- 

## Live production verification — 2026-10-05

One-time exception to "never call generate on production," capped at 3 real generations total (confirmed: `app usage` anthropic count went 4→10, i.e. 6 ledger entries = 3 calls × the hold+reconciliation pair seen in every other generation this build has made — no extras). Run via a throwaway Node/Playwright script using `deepspace/testing`'s `pickTestAccounts`/`newSignedInContext` (not `deepspace test run`, which is hardcoded to localhost — see finding below), against `https://incident-room-pw.app.space` with the existing `a@deepspace.test`/`b@deepspace.test` pool. Script written at repo root, deleted after use; not committed.

**Capability check:** `npx deepspace test run` cannot target a deployed app — `tests/playwright.config.ts` hardcodes `baseURL` to `http://localhost:${port}` and always spins up its own local dev server (`reuseExistingServer: false`); `test run --help` has no remote-URL flag. But `deepspace/testing`'s lower-level exports (`newSignedInContext(browser, account, baseURL)`) accept an arbitrary origin and do a real sign-in against that origin's own auth flow, with credentials read internally from `~/.deepspace/test-accounts.json` — never typed or printed by me. That's the documented, exported testing API used as designed, not an invented login mechanism.

### Results

| # | Check | Result |
|---|---|---|
| 1 | Demo incident seeds exactly 8 entries, in order | **PASS** — confirmed first entry (`sales_daily DAG failed: task extract_orders timed out after 45m.`) and last (`Root cause: the new partitioning change...`) match the seed script exactly. First live attempt misread this as `count=0`/`FAIL` — a timing bug in my script (read the DOM before the fire-and-forget entry creates had synced), not an app bug; re-verified read-only, no extra generations. |
| 2 | Generate postmortem #1: success, non-empty root cause | **PASS** — `rootCause`: "A partitioning change increased shuffle size past executor memory limits, causing OOM-kills in the Spark executor during the transform_orders step." |
| 3 | Every cited `sourceEntryId` exists among the incident's real entries (`data-record-id`) | **PASS** — all 7 cited ids confirmed present in the real 8-entry set. |
| 4 | B opens A's link; postmortem appears with no reload | **PASS** |
| 5 | B has no editable status control rendered | **PASS** — `data-testid="status-control"` count = 0 on B's page; current local UI now also renders a read-only locked status chip for non-creators so the header does not look incomplete. |
| 6 | A adds `[e2e] production live-sync check <ts>`; B sees it with no reload | **PASS** |
| 7–8 | Regenerate #2, #3 (genCount → 2, then 3) | **PASS** both |
| 9 | UI shows "3 of 3" after the 3rd generation | **PASS** |
| 10 | Regenerate button disabled at cap | **PASS** |
| 11 | 4th attempt, via a direct call bypassing the disabled button | **PASS** — `{"success":false,"error":"Generation limit reached (0 of 3 remaining).","code":"generation_cap"}`. Rejected before any model call, so this cost zero additional credits — confirmed server-side enforcement, not just a disabled button. |
| 12 | Signed-out `/incidents` gates to sign-in | **PASS** — body text: "Sign in to continue / This page is only available to signed-in users." URL stays `/incidents`; this is an in-place `AuthGate` fallback, **not** a redirect to a different route. First attempt's strict-locator check gave a false negative; confirmed via a plain body-text dump. |
| 13 | B attempts a status change via a direct call | **Not run as a live bypass.** Forging the RecordRoom's WebSocket mutation protocol against production, without certainty of its exact wire format, is exactly the kind of improvised attack I was told not to invent. Verified instead via the equivalent, already-covered path: the Phase 1 RBAC unit test (`canUpdate(incidentsSchema, 'member', record, otherUserId)` → `false`, unchanged code) plus this session's own confirmation that B's rendered page has zero editable status-control elements (check #5). |

**Minor finding, not a bug:** the cap-reached message differs in wording between the UI (`"Generation limit reached (3 of 3 used)."`) and the server action (`"Generation limit reached (0 of 3 remaining)."`) — same fact, two phrasings, never unified across Phase 4/5.

**Logs:** `npx deepspace logs --json --since 20m`, and separately filtered `--level error` / `--level warn` / `--search exception` — all **zero matches**. One `POST /api/tools/execute` returned HTTP 404 with `outcome:"ok"`; that's the expected "no postmortem exists yet" lookup on the first generation (`tools.get('postmortems', incidentId)` before it's ever been created), not an error.

### Incidents created on production

Exactly **one**: *sales_daily DAG failing* (via the demo button, not `[e2e]`-prefixed — it's fixed demo content; retitling it would mean editing app code, which this task excluded), now carrying 9 entries (the original 8 plus the one `[e2e]`-titled entry this verification added), `genCount: 3` (at cap).

- `recordId`: `1791241157153-g4uc3z3t2`
- URL: https://incident-room-pw.app.space/incidents/1791241157153-g4uc3z3t2

**To delete it:** no delete-incident control exists in the UI yet. RBAC (`delete: 'own'`) would let account `a@deepspace.test` (the creator) delete it if such a control existed. Short of adding one, the only paths are direct platform/debug access — `ALLOW_DEBUG_ROUTES` is not something I verified or assume is enabled in production, and I didn't attempt to check or use it in this task since it would mean touching things beyond what was asked. Flagging for a deliberate decision rather than guessing.
