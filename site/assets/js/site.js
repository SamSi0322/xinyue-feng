// Small enhancements for the portfolio. Everything works without this file.
window.__siteReady = true;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Dark by default; the header toggle switches to the light theme and remembers it.
// (An inline script in <head> applies a saved choice before the first paint.)
const themeButton = document.querySelector('.theme-toggle');
const themeColor = document.querySelector('meta[name="theme-color"]');
function setTheme(theme, save) {
  const light = theme === 'light';
  if (light) document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  if (themeColor) themeColor.content = light ? '#f7f3ec' : '#121212';
  if (themeButton) {
    const label = light ? 'Switch to dark theme' : 'Switch to light theme';
    themeButton.setAttribute('aria-label', label);
    themeButton.title = label;
  }
  if (save) {
    try { localStorage.setItem('theme', theme); } catch { /* private mode: not remembered */ }
  }
}
setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
if (themeButton) {
  themeButton.addEventListener('click', () => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
  });
}
// Another tab (or an embedded page) changed the theme.
window.addEventListener('storage', (event) => {
  if (event.key === 'theme') setTheme(event.newValue === 'light' ? 'light' : 'dark', false);
});

// Header gets a hairline once the page scrolls.
const header = document.querySelector('.site-header');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Fade sections in as they enter the viewport.
const revealables = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealables.length) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add('is-in'));
}

// Gameplay clips play only while on screen, and never with reduced motion.
const clips = document.querySelectorAll('video[data-autoplay]');
if (clips.length && 'IntersectionObserver' in window) {
  const watcher = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting && !reduceMotion.matches) target.play().catch(() => {});
      else target.pause();
    }
  }, { threshold: 0.35 });
  clips.forEach((clip) => watcher.observe(clip));
}

// Embedded demos load only when asked for, so the page stays light.
for (const poster of document.querySelectorAll('.embed__poster')) {
  poster.addEventListener('click', () => {
    // Phones and touch tablets get the full-page game, with room for its touch controls.
    const small = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
    if (small && poster.dataset.smallHref) {
      window.location.href = poster.dataset.smallHref;
      return;
    }
    const frame = document.createElement('iframe');
    frame.src = poster.dataset.src;
    frame.title = poster.dataset.title || 'Embedded demo';
    frame.allow = 'fullscreen';
    poster.replaceWith(frame);
    frame.addEventListener('load', () => frame.focus(), { once: true });
  });
}

// Embedded demos report their height, so their frame never needs a scrollbar.
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || typeof data.type !== 'string' || !data.type.endsWith(':height')) return;
  const height = Math.ceil(Number(data.height));
  if (!(height > 0)) return;
  for (const frame of document.querySelectorAll('.embed iframe')) {
    if (frame.contentWindow !== event.source) continue;
    const box = frame.parentElement;
    const border = box.offsetHeight - box.clientHeight;
    box.style.height = `${height + border}px`;
  }
});

// ---------------------------------------------------------------------------
// The hero parade: Edgeworth walks along a row of hearts, hopping over Winston.
// Sprites are Lily's own, from The Adventures of Edgeworth.

const parade = document.querySelector('.parade canvas');
if (parade) runParade(parade);

function runParade(canvas) {
  const base = canvas.dataset.sprites;
  const names = ['1', '2', '3', '4', '5', 'Winston1', 'Winston2', 'ob10'];
  const img = {};
  let loaded = 0;
  names.forEach((name) => {
    const im = new Image();
    im.onload = () => {
      loaded++;
      if (loaded === names.length) start();
    };
    im.src = `${base}${name}.png`;
    img[name] = im;
  });

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = 1;

  let lastTime = 0;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Resizing a canvas clears it, so draw the current frame again straight away
    // (with reduced motion there is no animation loop to do it).
    if (loaded === names.length) draw(lastTime);
  };

  const hero = { x: -60, jumpAt: -1, frame: 0 };
  const winston = { x: 0, frame: 0 };
  let visible = true;
  let last = 0;
  let raf = 0;

  function start() {
    resize();
    winston.x = width * 0.72;
    hero.x = width * 0.18;
    new ResizeObserver(resize).observe(canvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf && !reduceMotion.matches) raf = requestAnimationFrame(tick);
      }).observe(canvas);
    }
    if (reduceMotion.matches) draw(0);
    else raf = requestAnimationFrame(tick);
    reduceMotion.addEventListener?.('change', () => {
      if (!reduceMotion.matches && !raf) raf = requestAnimationFrame(tick);
    });
  }

  function tick(time) {
    raf = 0;
    if (!visible || reduceMotion.matches) {
      draw(time);
      return;
    }
    const dt = last ? Math.min(time - last, 50) / 1000 : 0;
    last = time;

    hero.x += 64 * dt;
    winston.x -= 38 * dt;
    if (hero.x > width + 80) hero.x = -80;
    if (winston.x < -80) winston.x = width + 40 + Math.random() * 200;

    // hop over Winston when he gets close
    const gap = winston.x - hero.x;
    if (hero.jumpAt < 0 && gap > 0 && gap < 78) hero.jumpAt = time;
    if (hero.jumpAt >= 0 && time - hero.jumpAt > 1000) hero.jumpAt = -1;

    draw(time);
    raf = requestAnimationFrame(tick);
  }

  function draw(time) {
    lastTime = time;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    const ground = height - 60;

    for (let x = 0; x < width; x += 60) ctx.drawImage(img.ob10, x, ground);

    const wFrame = Math.floor(time / 220) % 2 ? img.Winston2 : img.Winston1;
    ctx.drawImage(wFrame, Math.round(winston.x), ground - 60);

    let y = ground - 60;
    let sprite;
    if (hero.jumpAt >= 0) {
      const t = (time - hero.jumpAt) / 1000;
      y -= Math.sin(Math.PI * Math.min(t, 1)) * 66;
      sprite = img['5'];
    } else {
      sprite = img[String((Math.floor(time / 150) % 4) + 1)];
    }
    ctx.drawImage(sprite, Math.round(hero.x), Math.round(y));
  }
}
