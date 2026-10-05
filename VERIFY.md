# What I verify myself (evidence goes in WRITEUP.md)

## Live URL, two browsers (normal + incognito), two accounts
- [ ] A creates incident; B opens link → B shows in presence
- [ ] A adds entry → appears in B without reload (and reverse)
- [ ] B has no status control; forcing an update via devtools is denied (RBAC, not just hidden UI)
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
