# These are notes for Codex

## Purpose of this doc

This doc is for Codex to read at the beginning of every session - for guidelines of how I want to work with it.

## App Background

* This is a single developer / single user app. I am the only developer and the only user. It is only deployed on MY devices.

* So, there is no need to worry about waiting till all users... or, rollout / deployment issues, other than whatever I need it to do, for me.

## Rules

* Assume that I want to DISCUSS things with you before you just go off an start coding. I like to be part of the planning, design, etc.
* If I ask you to do a commit - reference the current version number that the commit relates to - like: 2.12.4 - changes related to....
* If we make a lot of changes - and it seems like we are done with them, ask if we should increment the version number.  If I says yes
  * Modify the version number of the app
  * Add notes to NOTES.md of what was included in the version that we were working on

## Background info that YOU SHOULD READ (under docs)
  * NOTES.md
  * ARCHITECTURE_PLAN.md
  * CHANGELOG.md
  * HANDOVER.md - if one exists

## Working Agreements

* Use Playwright to **see** the UI before claiming a visual fix works. Launch the dev server with `npm run dev -- --host 127.0.0.1 --port 4173`, then capture `desktop.png` and `mobile.png`:
  * `npx playwright screenshot http://127.0.0.1:4173/language-vocab/ desktop.png --wait-for-timeout=4000`
  * `npx playwright screenshot --viewport-size="400,844" http://127.0.0.1:4173/language-vocab/ mobile.png --wait-for-timeout=4000`
  Review the screenshots locally; only then describe layout status or call a task complete.
* If the user shares a screenshot, treat it as ground truth. Use it plus the Playwright captures to triangulate problems—avoid “blind” CSS tweaks.
* Keep the user involved in planning. Summarize the intended change, wait for acknowledgment, and only then code. When stuck, pause and ask instead of iterating blindly.
