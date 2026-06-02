# Witness: UIUX_open-props-stack Signpost Setup

## Purpose

Verify METHOD signpost and backlog files were added for cycle traceability.

## Environment

- Branch: `cycles/UIUX_open-props-stack`
- Time: 2026-05-31
- Repo: `~/git/tadpole`

## Commands

```bash
cd /Users/james/git/tadpole

# Confirm branch
git branch --show-current

# Confirm files exist and contain expected sections
ls -1 BEARING.md CHANGELOG.md README.md
sed -n '1,220p' BEARING.md
sed -n '1,220p' CHANGELOG.md
sed -n '1,220p' README.md

# Confirm METHOD backlog scaffold exists
find docs/method/backlog -maxdepth 2 -type f | sort
sed -n '1,220p' docs/method/backlog/inbox/2026-05-31-initialize-method-signposts.md
```

## Expected observations

- `BEARING.md` and `CHANGELOG.md` exist and include current state, priorities,
  and unreleased notes.
- `README.md` includes branch/PR METHOD process note.
- `docs/method/backlog/inbox/` contains `.gitkeep` and a dated signpost intake
  note.

## Acceptance

If all checks pass, this cycle's ship-surface deliverable is reproducible from
repo state.
