import './style.css';

const section = document.querySelector('.sequence-section');
const canvas = document.querySelector('#sequence-canvas');
const loader = document.querySelector('#loader');
const loaderText = document.querySelector('#loader-text');
const frameLabel = document.querySelector('#frame-label');
const frameProgress = document.querySelector('#frame-progress');
const scrollHint = document.querySelector('.scroll-hint');
const panels = [...document.querySelectorAll('.story-panel')].map((panel) => ({
  el: panel,
  start: Number(panel.dataset.start),
  end: Number(panel.dataset.end),
}));

const ctx = canvas.getContext('2d', { alpha: false });
const frameCount = Number(section.dataset.frameCount);
const framePath = (index) => `/frames/frame_${String(index + 1).padStart(5, '0')}.jpg`;
const images = new Array(frameCount);
const loadedFrames = new Set();

let currentFrame = 0;
let animatedFrame = 0;
let targetFrame = 0;
let lastDrawnFrame = -1;
let rafId = null;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

// More pixels per frame = slower, more premium scroll scrub.
const scrollPixelsPerFrame = 40;
const frameEase = 0.16;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

function updateSectionHeight() {
  section.style.height = `${window.innerHeight + frameCount * scrollPixelsPerFrame}px`;
}

function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateSectionHeight();
  drawFrame(currentFrame, true);
  updateInterface(currentFrame);
}

function drawImageCover(image) {
  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth;
  let drawHeight;
  let offsetX;
  let offsetY;

  if (imageRatio > canvasRatio) {
    drawHeight = canvasHeight;
    drawWidth = drawHeight * imageRatio;
    offsetX = (canvasWidth - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = canvasWidth;
    drawHeight = drawWidth / imageRatio;
    offsetX = 0;
    offsetY = (canvasHeight - drawHeight) / 2;
  }

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function nearestLoadedFrame(index) {
  if (loadedFrames.has(index)) return index;

  for (let offset = 1; offset < frameCount; offset += 1) {
    const previous = index - offset;
    const next = index + offset;

    if (previous >= 0 && loadedFrames.has(previous)) return previous;
    if (next < frameCount && loadedFrames.has(next)) return next;
  }

  return -1;
}

function drawFrame(index, force = false) {
  const safeIndex = Math.max(0, Math.min(frameCount - 1, Math.round(index)));
  const drawableIndex = nearestLoadedFrame(safeIndex);

  if (drawableIndex === -1) return;
  if (!force && drawableIndex === lastDrawnFrame) return;

  const image = images[drawableIndex];
  if (!image || !image.complete) return;

  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  drawImageCover(image);

  currentFrame = drawableIndex;
  lastDrawnFrame = drawableIndex;
}

function updateInterface(frame) {
  const progress = clamp(frame / (frameCount - 1));

  frameProgress?.style.setProperty('--progress', progress.toFixed(4));

  if (frameLabel) {
    frameLabel.textContent = `Frame ${String(Math.round(frame)).padStart(3, '0')}`;
  }

  if (scrollHint) {
    scrollHint.classList.toggle('is-hidden', frame > 20);
  }

  panels.forEach(({ el, start, end }) => {
    const fade = Math.min(34, Math.max(18, (end - start) * 0.22));
    const inOpacity = smoothstep(start, start + fade, frame);
    const outOpacity = 1 - smoothstep(end - fade, end, frame);
    const opacity = clamp(Math.min(inOpacity, outOpacity));
    const blur = 18 - opacity * 18;
    const y = (1 - opacity) * 26;

    el.style.setProperty('--panel-opacity', opacity.toFixed(3));
    el.style.setProperty('--panel-blur', `${blur.toFixed(2)}px`);
    el.style.setProperty('--panel-y', `${y.toFixed(2)}px`);
  });
}

function updateTargetFrame() {
  const rect = section.getBoundingClientRect();
  const scrollableDistance = Math.max(1, rect.height - window.innerHeight);
  const progress = clamp(-rect.top / scrollableDistance);
  targetFrame = progress * (frameCount - 1);

  if (!rafId) {
    rafId = requestAnimationFrame(renderLoop);
  }
}

function renderLoop() {
  const delta = targetFrame - animatedFrame;
  animatedFrame += delta * frameEase;

  if (Math.abs(delta) < 0.08) {
    animatedFrame = targetFrame;
  }

  drawFrame(animatedFrame);
  updateInterface(animatedFrame);

  if (Math.abs(targetFrame - animatedFrame) > 0.08) {
    rafId = requestAnimationFrame(renderLoop);
  } else {
    rafId = null;
  }
}

function loadFrame(index) {
  return new Promise((resolve, reject) => {
    if (images[index]) {
      resolve(images[index]);
      return;
    }

    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      loadedFrames.add(index);
      resolve(image);
    };
    image.onerror = reject;
    image.src = framePath(index);
    images[index] = image;
  });
}

async function preloadFrames() {
  let loaded = 0;

  const updateProgress = () => {
    loaded += 1;
    const progress = Math.round((loaded / frameCount) * 100);
    loaderText.textContent = `Loading frames ${progress}%`;

    if (loaded === 1) {
      drawFrame(0, true);
      updateInterface(0);
    }

    if (loaded >= frameCount) {
      loader.classList.add('is-hidden');
      window.setTimeout(() => loader.remove(), 850);
    }
  };

  await loadFrame(0).then(updateProgress);
  updateTargetFrame();

  const concurrency = 14;
  let cursor = 1;

  async function worker() {
    while (cursor < frameCount) {
      const index = cursor;
      cursor += 1;

      try {
        await loadFrame(index);
      } catch (error) {
        console.warn(`Frame ${index + 1} failed to load`, error);
      } finally {
        updateProgress();
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function initSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    const { default: Lenis } = await import('lenis');
    const lenis = new Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.86,
      touchMultiplier: 1.12,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
  } catch (error) {
    console.info('Lenis is not available; native scrolling is used instead.', error);
  }
}

window.addEventListener('resize', resizeCanvas, { passive: true });
window.addEventListener('scroll', updateTargetFrame, { passive: true });

resizeCanvas();
initSmoothScroll();
preloadFrames();
