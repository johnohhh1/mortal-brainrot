# AGENTS.md — engineering guide for Mortal Brainrot

Read this before changing anything. `public/index.html` is the **entire source** — one HTML file, one `<script>` block, ~2,600 lines of vanilla JS. There is no build step, no bundler, no package.json. You edit the file, you run the test, you're done.

## Verify every change

```bash
node test/smoke.js        # must end with "ALL PASS"
```

The test extracts the `<script>` block from the HTML, stubs `document`/`window`/canvas/`navigator`, and drives the real engine headlessly: movement, motion parsing, combos, grabs, projectiles, blocking, KO/round flow, all 8 finisher cinematics, the CPU opponent, gamepad input, and a 14,000-tick input fuzz. A quick `node --check` on the extracted JS catches syntax errors, but always run the full suite — most bugs here are behavioral, not syntactic.

For visual changes, open the file in a browser and use the debug view (backquote key) — it renders hitboxes, hurtboxes, pushboxes, per-fighter state readouts, and the frame counter. `window.MB` exposes test hooks in the live page: `MB.startFight(id1,id2)`, `MB.start1p(id1,id2)`, `MB.tick()`, `MB.render(alpha)`, `MB.injectKey(code,down)`, plus `MB.GAME`, `MB.PROJS`, `MB.ITEMS`, `MB.FINSCRIPTS`, `MB.ROSTER`. Note: `requestAnimationFrame` throttles hard in occluded windows — drive `MB.tick()` manually when automating.

## Architecture invariants — do not break these

1. **Fixed timestep.** Logic runs at exactly 60Hz via an accumulator; render interpolates between ticks using `px/py` previous positions. Never scale physics by frame delta. Never read wall-clock time in game logic.
2. **The engine is data-driven.** Combat code reads frame-data objects and must never branch on a move or character name. Behavior lives in data flags: `launcher`, `knockdown`, `armor`, `grab`, `spawn`, `install`, `slow`, `freeze`, `vel`, `cancel`. If a new move needs new behavior, add a new *generic* flag the engine interprets, then set it in data.
3. **Gameplay randomness uses `grand()`** (seeded LCG), cosmetic randomness uses `rand()`/`Math.random()`. Item drops and CPU decisions must stay on `grand()`.
4. **All input flows through the `KEY` sets + `Pad` class.** Gamepads synthesize virtual key codes (`GP0L`, `GP1Left`, …) through the same edge-latched pipeline — never read `navigator.getGamepads()` outside `pollGamepads()`. The buffer clock freezes during hitstop (`f.buf.t++` while `FXS.hitstop>0`); keep that behavior, it's what makes cancels feel right.
5. **State transitions happen only inside `STATES` handlers** via `setState`. States own their enter/update logic; don't mutate `f.state` directly from combat code (use the helpers: `applyHitEvent`, `koCheck`, etc.).
6. **Audio is synthesized.** No files, no fetches, no CDNs. The whole game must keep working offline from a `file://` URL. Audio must also fail silent when `AudioContext` is unavailable (that's what keeps the headless tests running) — guard every sound path on `A.ok`.

## File layout (single file, banner-commented sections in order)

1. Constants, utils, seeded RNG, **audio** (SFX + announcer voice + music), **input** (KEY, Pad, gamepads)
2. FX (particles, shake, hitstop), camera
3. **CHARS** — all character frame data (`mkHit` helper), `PROJSPECS`, `ROSTER`
4. **Engine** — Fighter class, `STATES` table, `detectCommand` (motion parser priority: super > EX > special > command normal > normal), `applyHitEvent`/`resolveCombat`, projectiles/items, `GAME` match flow
5. **Presentation** — per-character `draw` functions, `FINSCRIPTS` finisher cinematics, background, HUD, menu screens, main loop, debug overlays
6. Roster expansion block (`Object.assign(CHARS,…)`), CPU (`AIPAD` + `aiThink`), `MB` test hooks

## How to add a character (the most common request)

No engine changes needed. Four additions:

1. **Data:** an entry in `CHARS` (copy an existing one) — stats, two palettes, `finisher:{seq,btn,hint,name}`, and moves `L H cL cH jL jH sp1 sp2 super` with frame data. Hits use feet-local coords: `fx` = forward offset, `fy` = height above feet. Keep the finisher input unique across the roster.
2. **Renderer:** `CHARS.<id>.draw=function(c,f,P){…}` — layered shapes, feet at origin, facing right (+x forward, −y up). `P.ext`/`P.tx`/`P.ty`/`P.limb` animate attacks (use `limbTo`); `P.mood` drives `face()`. Squash/stretch is applied by `drawFighter` — don't duplicate it.
3. **Finisher:** `FINSCRIPTS.<id>={dur,update(F),draw(c,F)}` — puppet the victim via `F.d.x/y` and `F.d.cine` (`sx sy rot alpha`). Absurd, not gore: cartoon physics, confetti, escalation.
4. **Register:** `ROSTER.push('<id>')`. Menus, select grid, CPU, and tests pick it up automatically.

Then extend `test/smoke.js`'s roster loops if the character has a new spawn type, and run the suite.

## Tuning guidance

Frame data convention: `s`/`e` are absolute ticks within the move (state tick starts at 1), `total` is full duration. Lights are +hit on frame advantage so they chain; hitstun must exceed the next move's startup for links. Combo damage scales `1 − 0.08×(hits−1)` floored at 0.35; juggle gravity scales `1 + 0.18×juggleN` so juggles self-terminate. If a combo loops infinitely, raise the victim's `gravScale` growth or the move's pushback rather than special-casing.

The CPU lives in `aiThink` — intent-based with `intentT` hold timers. Its reactive block chance (0.12/tick) is the difficulty dial. Set `MB.AIPAD.intentT=1e9` to freeze it during manual testing.

## Pitfalls seen before (don't reintroduce)

Canvas font families need fallbacks (`"Arial Black","Archivo Black","DejaVu Sans",sans-serif` with `900` weight) — bare `Arial Black` silently falls back to serif on Linux. Double-tap motions (`22`, `44`, `66`) must match strictly, not via diagonal containment, or crouch-walking fake-triggers them. Chrome caches the page — hard-reload (Ctrl+Shift+R) after editing before concluding a change "didn't work". And when play-testing input claims, remember the CPU rushdown eats buffered inputs via hitstun — freeze the AI first.
