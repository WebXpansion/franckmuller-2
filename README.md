# Franck Muller Vanguard — Scroll Canvas Experience

Vite project ready for VS Code and Vercel.

## Included

- Source video extracted with `ffmpeg` at **30fps**.
- 556 JPEG frames in `public/frames`.
- One sticky full-viewport canvas section.
- No useless intro/outro sections.
- Scroll-driven frame-by-frame animation.
- Smooth scrolling with Lenis.
- Luxury UI overlay with blur apparition/disparition synced to frame ranges.
- Responsive rendering for desktop and mobile.

## Local setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Vercel settings

- Framework preset: **Vite**
- Build command: **npm run build**
- Output directory: **dist**

## Edit the UI timings

Open `index.html` and edit the `data-start` / `data-end` values on each `.story-panel`:

```html
<article class="story-panel" data-start="0" data-end="110">
```

Examples:

- `data-start="0" data-end="110"` → text visible around frames 0 to 110.
- `data-start="120" data-end="250"` → next text appears after frame 120.

The blur/fade transition is handled automatically in `src/main.js`.

## Adjust scroll speed

Open `src/main.js` and change:

```js
const scrollPixelsPerFrame = 9.5;
```

- Higher value = longer/slower scroll experience.
- Lower value = faster sequence.

## Re-extract frames manually

From the project root, place the source video at `source.mp4`, then run:

```bash
rm -rf public/frames
mkdir -p public/frames
ffmpeg -i source.mp4 -vf "fps=30" -q:v 4 public/frames/frame_%05d.jpg
```

After changing the number of frames, update `data-frame-count` in `index.html`.

## Main files

- `index.html`: structure, UI text, frame ranges.
- `src/main.js`: canvas rendering, preload, smooth scroll, frame-to-text sync.
- `src/style.css`: luxury UI, sticky full-screen layout, responsive styles.
# franckmuller-2
