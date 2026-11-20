# gta6-01-entry-v4

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/saifulsidik801-ship-it/gta6-01-entry-v4/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/saifulsidik801-ship-it/gta6-01-entry-v4/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

MARISOL BAY — an original open-world crime story on an island that never existed. Drive a wedge coupe through a dusk beach avenue while a white police heli pins you in its spotlight, fight on foot through the night market, plan jobs on a district map, and tune your ride at Dockside Customs. Keyboard and mouse. No Rockstar assets, names, or music anywhere: every city, character, vehicle, and line of dialogue is original.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — or open `game/index.html` from any static server. The game loads fully offline: three.js is vendored under `game/vendor/`, all art is procedural, no network request is made.

## Play

- **WASD / arrows** — drive (W accelerate, S brake, A/D steer) or move on foot
- **F** — steal / enter a car, or step out on foot
- **Mouse drag + click** — aim and shoot on foot
- **1–6** — switch weapons (Fists, P9, SMG, 12G, AR-9, RPG)
- **M** — district map (click to set a waypoint) · **G** — garage · **ESC** — pause
- **Z / X / C** — crew abilities: Mira swap plates, Lio quick fix, Kiki eyes out

Missions: lose the patrol before the timer runs out, clear the Kerono crew from the market, win street races, and keep the wanted stars down. Wanted level 4 means the heli stays on you — break line of sight to drop it.

## Shots

`shots.json` lists the four staged views the game renders itself (`?shot=cover|foot|map|garage`): the golden-hour police chase, the on-foot market gunfight, the district map, and the garage workshop.

---

<sub>Entered on [make.fun](https://make.fun/?ref=mxhczr02&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
