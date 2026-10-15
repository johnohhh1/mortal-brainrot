# CLAUDE.md — Mortal Brainrot

Single-file browser fighting game. **`public/index.html` is the only source file** — edit it directly; there is no build step, no fragments, no bundler. `AGENTS.md` is the full engineering guide (architecture, invariants, how to add characters); read it before nontrivial changes. `README.md` is player-facing.

## Non-negotiables

- After **any** change to the HTML: run `node test/smoke.js` and require `ALL PASS` before telling the user it works.
- The engine never branches on move or character names — behavior is expressed as data flags read generically. Adding content means adding data + a draw function + a finisher script, not engine code.
- 60Hz fixed-timestep logic: no delta-scaled physics, no wall-clock reads in game logic. Gameplay randomness via seeded `grand()` only.
- Everything stays self-contained and offline: no external assets, fonts, fetches, or CDNs; audio is WebAudio-synthesized and must no-op cleanly when `AudioContext` is missing.
- Finishers are absurd, never gore — cartoon physics and confetti, per the original design brief.

## Working practices for this repo

- Browser testing: `python3 -m http.server 8471` in this directory, then hard-reload (Ctrl+Shift+R — Chrome caches the file). In the page, `window.MB` gives you `startFight`/`start1p`/`tick`/`render`/`injectKey`; drive ticks manually because occluded windows throttle `requestAnimationFrame`. Backquote toggles the debug overlay (hitboxes/state/frames).
- To pin down input or combo issues, freeze the CPU first: `MB.AIPAD.intentT=1e9`.
- Keep canvas fonts as the existing fallback stacks (`900 …px "Arial Black","Archivo Black","DejaVu Sans",sans-serif`) — bare font names silently serif-fallback on Linux.
- New roster characters need a unique finisher input and a `ROSTER.push`; everything else (menus, CPU, select grid) picks them up automatically. Extend `test/smoke.js` loops when adding new spawn types or mechanics.

## Owner context

The owner cares most about game *feel* (hitstop, screenshake, big readable characters), a playable 1P mode, and the roster growing toward their full brainrot character list — when in doubt, bias toward juice and shipping playable over engine purity debates.
