# TXT — Part 2: Angel Bite

Landing page with the animated Angel Bite pixel scene pinned to the bottom of the screen.

## Run it
Open `index.html` in a browser, or in VS Code use the **Live Server** extension (right-click `index.html` → *Open with Live Server*).

## Files
- `index.html` — both views: login (`#`) and character selection (`#select`). **skip** pans the camera right along the wall to an empty stretch; **back** (or the browser back button) pans back
- `css/style.css` — layout, Pixelify Sans, button styles
- `js/main.js` — the scene engine (24 s loop): walkers, beomgyu's stumble, clouds, falling leaves, balloon, station tree, sky clouds, wide-screen and mobile layouts
- `assets/` — sprites
  - `scene-plate.png` — the static 504×324 scene (power lines, buildings, station, wall, floor); the sky is transparent, so the page background (`--sky` in `css/style.css`) shows through everywhere
  - `mask-clouds.png`, `mask-leaves.png` — where moving clouds / leaves are visible inside the plate
  - `wall.png`, `power-lines.png` — wall artwork and power lines, repeated sideways on wide screens
  - `station-mobile.png` — compact station used on narrow screens

## Tweaking
Timings, speeds and positions are the constants at the top of `js/main.js` (`CLOUDS`, `LEAVES`, `WALKERS`, `WALK_Y`).
Camera: the station spans world x 0..504; `applyView(mix)` blends between the login framing (mix 0: scene ~60% tall, station centred) and the select framing (mix 1: zoomed so the wall top sits one third down the screen, camera at `selectCam()`). Transition length is `dur: 2200` in `goTo()`.
Character cards: the five `<button class="card">` elements inside `#viewSelect` (images in `assets/cards/`). Tap/click or use ← → to move the Select marker. **Next** (on the pavement) calls `onNext(selected)` in `js/main.js` — that is the place to hook up the next screen.
The Spotify / Apple Music / skip links are `href="#"` placeholders in `index.html`.
