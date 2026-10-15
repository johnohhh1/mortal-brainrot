# MORTAL BRAINROT

An absurdly serious single-file browser fighting game. Mortal Kombat-style mechanics, brainrot aesthetic, zero dependencies. One HTML file, everything drawn procedurally on canvas — no sprites, no assets, no build step.

## Play

Open `public/index.html` in any modern browser. That's it. Or serve it locally:

```bash
python3 -m http.server 8471 -d public
# → http://localhost:8471/
```

**1 Player** (press F or gamepad A) fights a CPU opponent. **2 Players** (press G) share one keyboard or use two gamepads.

## Controls

| Action | P1 keyboard | P2 keyboard | Gamepad |
|---|---|---|---|
| Move / jump / crouch | WASD | Arrow keys | Left stick or D-pad |
| Light attack | F | Numpad1 or `,` | A / X (Cross/Square) |
| Heavy attack | G | Numpad2 or `.` | B / Y (Circle/Triangle) |
| Block (hold) | H | Numpad3 or `/` | Any shoulder/trigger |
| Pause | Esc | Esc | Start |

In 1-player mode, **both** keyboard sets and **any** gamepad control you. Gamepad 1 = P1, gamepad 2 = P2. Browsers hide controllers until you press a button on one — tap any button and the title screen shows a green 🎮 line when it's detected.

**Universal mechanics:** ↓ + heavy = launcher (starts juggle combos) · double-tap toward/away = dash/backdash · ↓ ↘ → (or ← ↙ ↓, or ↓ ↓) + attack = special · both attack buttons together on a special = EX version (costs ⅓ meter) · ↓ ↘ → ↓ ↘ → + attack with full meter = super. Lights chain into heavies into specials into supers. Blocking high/low matters: crouch-block lows, stand-block jump-ins and overheads. Chip damage is recoverable (the lighter shade on your health bar regenerates if you avoid getting hit).

**Finishers:** win the match point round and the loser staggers for ~4 seconds while the screen shows your finisher input. Land it. You've earned it.

## Roster

| Fighter | Archetype | Gimmick |
|---|---|---|
| Strawberry Elephant | Grappler | Command grab (← ↙ ↓ + H), armored EX Trunk Cannon |
| Cappuccino Assassino | Rushdown | Dash-cancels everything, Caffeine Overdose speed install |
| Pipi Watermelon | Zoner | Seed projectiles, melon mortars, melon monsoon |
| Frigo Camelo | Weirdo | Fridge spawns pickups (heal/meter/speed), frost breath slows |
| Tung Tung Sahur | Mixup | TUNG TUNG TUNG rekka, megaphone shockwave |
| Bombardiro Crocodilo | Bomber | 1200 HP tank, armored chomp run, carpet bombs |
| Ballerina Cappuccina | Tempo | Fastest fighter, traveling spin multi-hits, overhead Grand Jeté |
| Brainrot God | Boss | Full-screen eye laser, targeted lightning, teleport dash |

## Extras

`` ` `` (backquote) toggles **debug view**: hitboxes (red), hurtboxes (green), pushboxes (blue), state machine readouts, input history, frame counter. `M` mutes the synthesized music/announcer.

## Tech (for the curious)

Fixed-timestep 60Hz logic decoupled from render with interpolation — identical gameplay at any refresh rate. Every move is frame data (startup/active/recovery, hitboxes, cancels); the engine contains no per-move logic. Input ring buffer with motion parsing and a buffer clock that freezes during hitstop. All audio (hits, announcer voice, music) synthesized live via WebAudio. See `AGENTS.md` for the full architecture.

```bash
node test/smoke.js   # headless engine test suite (no browser needed)
```

## Deploy (optional)

The game is plain static files, so any static host works. `wrangler.toml` is set up for Cloudflare Workers static assets:

```bash
npx wrangler deploy
```

## Contributing

New fighters, moves and bug fixes are welcome. Read `AGENTS.md` first (it covers the architecture rules and how to add a character), make your change in `public/index.html`, and make sure `node test/smoke.js` still ends with `ALL PASS` before opening a pull request.

## License

MIT, see [LICENSE](LICENSE).
