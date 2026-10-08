// The Adventures of Edgeworth — web edition: rendering, input, sound and screens.
//
// The game rules live in engine.js (ported from the Java original). This file
// adds what a browser game needs on top: smooth drawing between the 50 ms logic
// ticks, keyboard and touch controls, pause and mute, sound effects that play
// once (in the Java version every effect kept looping), the animated forest
// background the Java version could not show, game-over and ending screens
// instead of a dialog box and System.exit, and the "knocked out" and death
// sprites that were drawn for the original but never displayed.

import { World, W, H, TICK_MS, ENEMY_EVERY, LIVES } from './engine.js';
import { SCENES } from './levels.js';

const params = new URLSearchParams(location.search);
const EMBED = params.has('embed');
const START_SCENE = Math.min(Math.max(parseInt(params.get('scene') || '1', 10) || 1, 1), SCENES.length);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = window.matchMedia('(pointer: coarse)');

// ---------------------------------------------------------------------------
// Images (StaticValue.java)

const SPRITES = {
  edgeworth: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'over'],
  oldbag: ['Oldbag1', 'Oldbag2'],
  winston: ['Winston1', 'Winston2', 'Winston3'],
  karma: ['Karma4', 'Karma5'], // StaticValue.init() loads Karma4 and Karma5 only
  npc: ['npc1', 'npc2'],
  ob: ['ob1', 'ob2', 'ob3', 'ob4', 'ob5', 'ob6', 'ob7', 'ob8', 'ob9', 'ob10', 'ob11', 'ob12'],
};
const DEAD_FRAME = 10; // over.png
const IMG = {};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

async function loadAssets(onProgress) {
  const jobs = [];
  for (const [group, names] of Object.entries(SPRITES)) {
    IMG[group] = [];
    names.forEach((name, i) => {
      jobs.push(loadImage(`assets/img/${name}.png`).then((img) => { IMG[group][i] = img; }));
    });
  }
  jobs.push(loadImage('assets/img/start.webp'));
  let done = 0;
  await Promise.all(jobs.map((job) => job.then(() => onProgress(++done / jobs.length))));
  if (document.fonts && document.fonts.load) {
    await document.fonts.load('16px "Press Start 2P"').catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Sound (Music.java / Music2.java)

function readPref(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

class Sound {
  constructor() {
    this.muted = readPref('edgeworth.muted') === '1';
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
    this.unlocked = false;
    this.wantMusic = false;
    this.bgm = new Audio('assets/audio/bgm.mp3');
    this.bgm.loop = true;
    this.bgm.preload = 'none';
    this.bgm.volume = 0.4;
  }

  // Browsers only allow audio after a user gesture, so this runs on the first key press or tap.
  unlock() {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    this.unlocked = true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try {
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    for (const name of ['cbt', 'yanei', 'yuyu']) this.load(name);
  }

  async load(name) {
    if (!this.ctx) return;
    try {
      const res = await fetch(`assets/audio/${name}.mp3`);
      const data = await res.arrayBuffer();
      this.buffers.set(name, await this.ctx.decodeAudioData(data));
    } catch {
      // A missing sound effect should never stop the game.
    }
  }

  play(name) {
    if (this.muted || !this.ctx) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master);
    source.start();
  }

  music(on) {
    this.wantMusic = on;
    if (on && !this.muted) this.bgm.play().catch(() => {});
    else this.bgm.pause();
  }

  toggleMute() {
    this.muted = !this.muted;
    writePref('edgeworth.muted', this.muted ? '1' : '0');
    this.music(this.wantMusic);
    return this.muted;
  }
}

// ---------------------------------------------------------------------------
// Input

class Input {
  constructor() {
    this.dirs = []; // held directions, most recent last
    this.jumpHeld = false;
    this.jumpQueued = false;
  }

  press(dir) {
    if (dir === 'jump') {
      if (!this.jumpHeld) this.jumpQueued = true;
      this.jumpHeld = true;
      return;
    }
    const i = this.dirs.indexOf(dir);
    if (i !== -1) this.dirs.splice(i, 1);
    this.dirs.push(dir);
  }

  release(dir) {
    if (dir === 'jump') {
      this.jumpHeld = false;
      return;
    }
    const i = this.dirs.indexOf(dir);
    if (i !== -1) this.dirs.splice(i, 1);
  }

  clear() {
    this.dirs.length = 0;
    this.jumpHeld = false;
    this.jumpQueued = false;
  }

  // Releasing one arrow while the other is still held keeps Edgeworth moving.
  direction() {
    return this.dirs.length ? this.dirs[this.dirs.length - 1] : null;
  }

  // A tap shorter than one tick still counts as a jump.
  takeJump() {
    const jump = this.jumpHeld || this.jumpQueued;
    this.jumpQueued = false;
    return jump;
  }
}

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
};

// ---------------------------------------------------------------------------
// The game screen (MyFrame.java)

class Game {
  constructor(root) {
    this.root = root;
    this.frame = root.querySelector('.frame');
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.bgFull = root.querySelector('.bg-full');
    this.bgForest = root.querySelector('.bg-forest');
    this.status = root.querySelector('[data-status]');
    this.screens = Object.fromEntries(
      [...root.querySelectorAll('[data-screen]')].map((el) => [el.dataset.screen, el]));
    this.muteButton = root.querySelector('[data-action="mute"]');
    this.pauseButton = root.querySelector('[data-action="pause"]');

    this.sound = new Sound();
    this.input = new Input();
    this.world = null;
    this.state = 'loading';
    this.paused = false;
    this.scale = 1;
    this.effects = [];
    this.banner = null;
    this.freezeUntil = 0;
    this.shakeUntil = 0;
    this.flashUntil = 0;
    this.dyingUntil = 0;
    this.acc = 0;
    this.last = performance.now();

    this.events = {
      sound: (name) => this.sound.play(name),
      points: (x, y) => this.addEffect({ kind: 'points', x, y, life: 800 }),
      broke: (ob) => this.addEffect({ kind: 'debris', x: ob.x, y: ob.y, life: 450 }),
      stomped: (e) => this.addEffect({ kind: 'squash', x: e.x, y: e.y, life: 450 }),
      died: (x, y, final) => this.onDeath(x, y, final),
    };

    this.updateMuteButton();
    this.bindInput();
    this.observeSize();
  }

  get hero() {
    return this.world.hero;
  }

  get scene() {
    return this.world.scene;
  }

  async boot() {
    const bar = this.root.querySelector('[data-progress]');
    try {
      await loadAssets((p) => { if (bar) bar.style.transform = `scaleX(${p})`; });
    } catch (err) {
      this.showScreen('error');
      console.error(err);
      return;
    }
    this.newRun();
    this.setState('title');
    requestAnimationFrame((t) => this.loop(t));
    // Not needed for the title screen (the forest <img> is loading="lazy" and
    // hidden): fetch both while the player reads it.
    new Image().src = this.bgForest.src;
    new Image().src = 'assets/img/ending.webp';
  }

  newRun(startScene = START_SCENE) {
    this.world = new World({ startScene, events: this.events });
    this.effects.length = 0;
    this.acc = 0;
    this.freezeUntil = 0;
    this.input.clear();
  }

  start() {
    this.sound.unlock();
    if (this.state === 'gameover' || this.state === 'cleared') this.newRun();
    if (this.state === 'playing' || this.state === 'dying' || !this.world) return;
    this.world.start();
    this.setState('playing');
    this.showBanner();
    this.sound.music(true);
    this.bringIntoView();
  }

  // On the full page, make sure the whole game and its controls are on screen.
  bringIntoView() {
    if (EMBED || document.fullscreenElement) return;
    const stage = this.root.querySelector('.stage');
    const rect = stage.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      stage.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
  }

  // After a game over: same scene, fresh lives, score from zero.
  retry() {
    this.sound.unlock();
    if (this.state !== 'gameover') return;
    this.newRun(this.scene.sort);
    this.world.start();
    this.setState('playing');
    this.showBanner();
    this.sound.music(true);
  }

  setState(state) {
    this.state = state;
    this.paused = false;
    this.root.dataset.state = state;
    const screen = { loading: 'loading', title: 'title', gameover: 'gameover', cleared: 'cleared' }[state] || null;
    this.showScreen(screen);
    this.updateBackground();
    this.updatePauseButton();
    if (state === 'title') this.announce('Press Space or click to start.');
  }

  showScreen(name) {
    for (const [key, el] of Object.entries(this.screens)) el.hidden = key !== name;
  }

  updateBackground() {
    const onTitle = this.state === 'loading' || this.state === 'title';
    const ending = !onTitle && this.world && this.scene.flag;
    this.bgFull.hidden = !(onTitle || ending);
    const src = onTitle ? 'assets/img/start.webp' : 'assets/img/ending.webp';
    if ((onTitle || ending) && !this.bgFull.src.endsWith(src)) this.bgFull.src = src;
    this.bgForest.hidden = onTitle || ending;
    this.frame.classList.toggle('night', Boolean(ending));
  }

  setPaused(paused) {
    if (this.state !== 'playing' || this.paused === paused) return;
    this.paused = paused;
    this.showScreen(paused ? 'paused' : null);
    this.input.clear();
    this.sound.music(!paused);
    this.updatePauseButton();
    this.announce(paused ? 'Paused.' : 'Resumed.');
  }

  addEffect(effect) {
    this.effects.push({ ...effect, born: performance.now() });
  }

  onDeath(x, y, final) {
    const now = performance.now();
    this.addEffect({ kind: 'ghost', x, y, life: final ? 1400 : 900 });
    this.flashUntil = now + 260;
    if (!reducedMotion.matches) this.shakeUntil = now + 260;
    if (!final) {
      this.freezeUntil = now + 450;
      const left = this.hero.life - 1;
      this.announce(`Ouch! ${left} ${left === 1 ? 'life' : 'lives'} left.`);
    }
  }

  tick() {
    const result = this.world.step({ dir: this.input.direction(), jump: this.input.takeJump() });
    if (result.sceneChanged) {
      this.updateBackground();
      this.showBanner();
    }
    if (result.dead) {
      this.state = 'dying';
      this.root.dataset.state = 'dying';
      this.dyingUntil = performance.now() + 1300;
      this.updatePauseButton();
      this.sound.music(false);
    } else if (result.clear) {
      this.finish();
    }
  }

  finish() {
    this.setState('cleared');
    this.sound.music(false);
    const text = 'In the night, Edgeworth came across Phoenix.';
    this.screens.cleared.querySelector('[data-score]').textContent = String(this.hero.score);
    this.typewrite(this.screens.cleared.querySelector('[data-typewriter]'), text);
    this.announce(`${text} Final score ${this.hero.score}.`);
    this.focusScreenButton('cleared');
  }

  typewrite(el, text) {
    clearInterval(this.typeTimer);
    if (reducedMotion.matches) {
      el.textContent = text;
      return;
    }
    el.textContent = '';
    let i = 0;
    this.typeTimer = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(this.typeTimer);
    }, 45);
  }

  focusScreenButton(name) {
    const button = this.screens[name] && this.screens[name].querySelector('button');
    if (button) setTimeout(() => button.focus({ preventScroll: true }), 50);
  }

  showBanner() {
    const total = this.world.scenes.length;
    this.banner = { text: `SCENE ${this.scene.sort}`, sub: `of ${total}`, born: performance.now() };
    this.announce(`Scene ${this.scene.sort} of ${total}.`);
  }

  announce(text) {
    if (this.status) this.status.textContent = text;
  }

  loop(time) {
    let dt = time - this.last;
    this.last = time;
    if (dt > 250) dt = 250;

    if (this.state === 'playing' && !this.paused && time >= this.freezeUntil) {
      this.acc += dt;
      while (this.acc >= TICK_MS && this.state === 'playing') {
        this.tick();
        this.acc -= TICK_MS;
      }
    }
    if (this.state === 'dying' && time >= this.dyingUntil) {
      this.setState('gameover');
      this.screens.gameover.querySelector('[data-score]').textContent = String(this.hero.score);
      this.screens.gameover.querySelector('[data-retry-scene]').textContent = String(this.scene.sort);
      this.announce(`Game over. Score ${this.hero.score}. Press R to retry scene ${this.scene.sort}.`);
      this.focusScreenButton('gameover');
    }

    this.render(time);
    requestAnimationFrame((t) => this.loop(t));
  }

  // ---- drawing

  observeSize() {
    const resize = () => {
      const rect = this.frame.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.scale = width / W;
    };
    new ResizeObserver(resize).observe(this.frame);
    resize();
  }

  sprite(img, x, y) {
    const s = this.scale;
    this.ctx.drawImage(img, Math.round(x * s) / s, Math.round(y * s) / s);
  }

  render(time) {
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.world || this.state === 'loading' || this.state === 'title') return;

    const s = this.scale;
    let dx = 0;
    let dy = 0;
    if (time < this.shakeUntil) {
      dx = (Math.random() - 0.5) * 8;
      dy = (Math.random() - 0.5) * 8;
    }
    ctx.setTransform(s, 0, 0, s, dx * s, dy * s);
    ctx.imageSmoothingEnabled = false;

    // Interpolate between the last two logic ticks so movement looks smooth at any frame rate.
    const live = this.state === 'playing' && !this.paused && time >= this.freezeUntil;
    const a = live ? this.acc / TICK_MS : 1;
    const ea = live ? ((this.world.tickCount % ENEMY_EVERY) * TICK_MS + this.acc) / (ENEMY_EVERY * TICK_MS) : 1;
    const lerp = (p, c, t) => p + (c - p) * Math.min(t, 1);
    const scene = this.scene;

    // Same order as MyFrame.paint: enemies, NPCs, blocks, then Edgeworth.
    for (const e of scene.allEnemy) {
      this.sprite(IMG[e.sprite[0]][e.sprite[1]], lerp(e.px, e.x, ea), lerp(e.py, e.y, ea));
    }
    for (const npc of scene.allNPC) this.sprite(IMG.npc[npc.imageType], npc.x, npc.y);
    for (const ob of scene.allObstruction) {
      this.sprite(IMG.ob[ob.type], lerp(ob.px, ob.x, a), lerp(ob.py, ob.y, a));
    }

    const hero = this.hero;
    if (this.state === 'dying' || this.state === 'gameover') {
      this.sprite(IMG.edgeworth[DEAD_FRAME], hero.x, hero.y);
    } else if (time >= this.freezeUntil) {
      this.sprite(IMG.edgeworth[hero.frame], lerp(hero.px, hero.x, a), lerp(hero.py, hero.y, a));
    }

    this.drawEffects(time);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    this.drawHud();
    this.drawBanner(time);

    if (time < this.flashUntil) {
      ctx.fillStyle = `rgba(217, 70, 59, ${0.28 * ((this.flashUntil - time) / 260)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawEffects(time) {
    const ctx = this.ctx;
    this.effects = this.effects.filter((fx) => time - fx.born < fx.life);
    for (const fx of this.effects) {
      const t = (time - fx.born) / fx.life;
      ctx.save();
      if (fx.kind === 'points') {
        ctx.globalAlpha = 1 - t * t;
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0, 0, 0, .8)';
        ctx.fillStyle = '#ffd35c';
        const y = fx.y - 8 - t * 34;
        ctx.strokeText('+10', fx.x, y);
        ctx.fillText('+10', fx.x, y);
      } else if (fx.kind === 'squash') {
        ctx.globalAlpha = 1 - t;
        this.sprite(IMG.winston[2], fx.x, fx.y);
      } else if (fx.kind === 'ghost') {
        ctx.globalAlpha = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
        this.sprite(IMG.edgeworth[DEAD_FRAME], fx.x, fx.y - t * 12);
      } else if (fx.kind === 'debris') {
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = '#9cc6ff';
        for (let i = 0; i < 4; i++) {
          const sx = i % 2 ? 1 : -1;
          const sy = i < 2 ? -1 : 0.4;
          ctx.fillRect(fx.x + 26 + sx * (8 + t * 40), fx.y + 26 + sy * 10 + t * t * 90 - t * 30, 9, 9);
        }
      }
      ctx.restore();
    }
  }

  drawHud() {
    const ctx = this.ctx;
    const hero = this.hero;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, .5)';
    roundRect(ctx, 616, 12, 272, 42, 8);
    ctx.fill();
    ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < LIVES; i++) {
      ctx.globalAlpha = i < hero.life ? 1 : 0.2;
      ctx.drawImage(IMG.ob[11], 624 + i * 30, 18, 30, 30);
    }
    ctx.globalAlpha = 1;
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f3efe7';
    ctx.fillText(`SCORE ${String(hero.score).padStart(4, '0')}`, 726, 34);

    ctx.fillStyle = 'rgba(0, 0, 0, .5)';
    roundRect(ctx, 12, 12, 96, 30, 8);
    ctx.fill();
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(243, 239, 231, .85)';
    ctx.fillText(`${this.scene.sort} / ${this.world.scenes.length}`, 30, 28);
    ctx.restore();
  }

  drawBanner(time) {
    if (!this.banner) return;
    const t = (time - this.banner.born) / 1800;
    if (t >= 1) {
      this.banner = null;
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0, 0, 0, .85)';
    ctx.fillStyle = '#f3efe7';
    ctx.strokeText(this.banner.text, W / 2, 150);
    ctx.fillText(this.banner.text, W / 2, 150);
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#e9bd62';
    ctx.strokeText(this.banner.sub, W / 2, 188);
    ctx.fillText(this.banner.sub, W / 2, 188);
    ctx.restore();
  }

  // ---- input wiring

  bindInput() {
    const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

    window.addEventListener('keydown', (e) => {
      if (isTyping(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey) return;
      const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
      const action = KEYS[e.code];

      if (this.state === 'title') {
        if ((e.code === 'Space' || e.code === 'Enter') && !onButton) {
          e.preventDefault();
          this.start();
        }
        return;
      }
      if (this.state === 'gameover') {
        if (e.code === 'KeyR' || ((e.code === 'Enter' || e.code === 'Space') && !onButton)) {
          e.preventDefault();
          this.retry();
        }
        return;
      }
      if (this.state === 'cleared') {
        if (e.code === 'KeyR' || ((e.code === 'Enter' || e.code === 'Space') && !onButton)) {
          e.preventDefault();
          this.start();
        }
        return;
      }
      if (e.code === 'KeyM') {
        this.toggleMute();
        return;
      }
      if (this.state !== 'playing') return;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.setPaused(!this.paused);
        return;
      }
      if (action && !(onButton && (e.code === 'Space' || e.code === 'Enter'))) {
        e.preventDefault();
        if (this.paused) return;
        this.sound.unlock();
        this.input.press(action);
      }
    });

    window.addEventListener('keyup', (e) => {
      const action = KEYS[e.code];
      if (action) this.input.release(action);
    });

    window.addEventListener('blur', () => {
      this.input.clear();
      if (this.state === 'playing') this.setPaused(true);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.setPaused(true);
    });

    this.frame.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      this.frame.focus({ preventScroll: true });
      if (this.state === 'title') this.start();
      else if (this.paused) this.setPaused(false);
    });

    this.root.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'start' || action === 'restart') this.start();
      else if (action === 'retry') this.retry();
      else if (action === 'mute') this.toggleMute();
      else if (action === 'pause') this.setPaused(!this.paused);
      else if (action === 'resume') this.setPaused(false);
      else if (action === 'fullscreen') this.toggleFullscreen();
      if (action === 'start' || action === 'restart' || action === 'retry' || action === 'resume') {
        this.frame.focus({ preventScroll: true });
      }
    });

    // On-screen buttons for touch screens; each can be held, and several at once.
    for (const pad of this.root.querySelectorAll('[data-pad]')) {
      const dir = pad.dataset.pad;
      const down = (e) => {
        e.preventDefault();
        if (pad.setPointerCapture) pad.setPointerCapture(e.pointerId);
        this.sound.unlock();
        if (this.state === 'title' || this.state === 'gameover' || this.state === 'cleared') {
          if (dir === 'jump') {
            if (this.state === 'gameover') this.retry();
            else this.start();
          }
          return;
        }
        if (this.paused) this.setPaused(false);
        pad.classList.add('is-down');
        this.input.press(dir);
      };
      const up = () => {
        pad.classList.remove('is-down');
        this.input.release(dir);
      };
      pad.addEventListener('pointerdown', down);
      pad.addEventListener('pointerup', up);
      pad.addEventListener('pointercancel', up);
      pad.addEventListener('lostpointercapture', up);
      pad.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    const touchMode = () => {
      if (coarsePointer.matches) this.root.classList.add('touch');
    };
    if (coarsePointer.addEventListener) coarsePointer.addEventListener('change', touchMode);
    window.addEventListener('touchstart', () => this.root.classList.add('touch'), { once: true, passive: true });
    touchMode();
  }

  toggleMute() {
    this.sound.unlock();
    this.sound.toggleMute();
    this.updateMuteButton();
  }

  updateMuteButton() {
    if (!this.muteButton) return;
    const muted = this.sound.muted;
    this.muteButton.setAttribute('aria-pressed', String(muted));
    this.muteButton.setAttribute('aria-label', muted ? 'Unmute sound (M)' : 'Mute sound (M)');
    this.muteButton.classList.toggle('is-off', muted);
  }

  updatePauseButton() {
    if (!this.pauseButton) return;
    this.pauseButton.disabled = this.state !== 'playing';
    this.pauseButton.setAttribute('aria-pressed', String(this.paused));
    this.pauseButton.setAttribute('aria-label', this.paused ? 'Resume (P)' : 'Pause (P)');
    this.pauseButton.classList.toggle('is-paused', this.paused);
  }

  toggleFullscreen() {
    const el = this.root.querySelector('.stage') || this.frame;
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------

if (EMBED) document.documentElement.classList.add('embed');
const root = document.querySelector('[data-game]');
const game = new Game(root);
if (params.has('debug')) window.__game = game;
if (!document.fullscreenEnabled) {
  const fullscreen = root.querySelector('[data-action="fullscreen"]');
  if (fullscreen) fullscreen.remove();
}
game.boot();
