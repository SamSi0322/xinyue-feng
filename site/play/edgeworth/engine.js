// Game rules for The Adventures of Edgeworth — no DOM, no rendering.
//
// Ported from the Java/Swing original by Xinyue (Lily) Feng (CPS 2231,
// Wenzhou-Kean University, 2024). Speeds, jump timing, collision checks, enemy
// behavior and the level layouts follow the Java classes of the same names
// (Edgeworth, Enemy, Obstruction, NPC, BackGround, and the loop in MyFrame).
// In Java each object ran on its own thread; here one World.step() is one
// 50 ms tick, and enemies move on every second tick (their threads slept 100 ms).
//
// Sprites are referenced by [group, index] so a renderer can map them to
// images; see game.js.

import { SCENES } from './levels.js';

export const W = 900;
export const H = 600;
export const TICK_MS = 50;
export const ENEMY_EVERY = 2;
export const LIVES = 3;

const noop = () => {};
const NO_EVENTS = { sound: noop, points: noop, broke: noop, stomped: noop, died: noop };

function removeFrom(list, item) {
  const i = list.indexOf(item);
  if (i !== -1) list.splice(i, 1);
}

export class Obstruction {
  constructor(x, y, type, bg) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.type = type;
    this.startType = type;
    this.bg = bg;
  }

  // When Edgeworth dies, broken or hit blocks go back to their original type.
  reset() {
    this.type = this.startType;
  }

  // Only the heart flag (type 11) runs a thread in the Java version:
  // it drops 5 px per tick once the last scene is over, then raises isDown.
  tick() {
    this.px = this.x;
    this.py = this.y;
    if (this.bg.isOver) {
      if (this.y < 420) this.y += 5;
      else this.bg.isDown = true;
    }
  }
}

export class Enemy {
  constructor(x, y, isLeftOrUp, type, bg, upMax = 0, downMax = 0) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.startX = x;
    this.startY = y;
    this.isLeftOrUp = isLeftOrUp;
    this.startLeftOrUp = isLeftOrUp;
    this.type = type;
    this.bg = bg;
    this.upMax = upMax;
    this.downMax = downMax;
    this.imageType = 0;
    // Java started each enemy thread suspended until enemyStartMove().
    this.moving = false;
    this.sprite = this.firstSprite();
  }

  get group() {
    if (this.type === 1) return 'winston';
    if (this.type === 3) return 'karma';
    return 'oldbag';
  }

  firstSprite() {
    return [this.group, 0];
  }

  tick() {
    this.px = this.x;
    this.py = this.y;
    if (!this.moving) return;

    // Type 1 (Winston) and type 3 (Karma) walk left and right and turn around
    // at blocks and at the edges of the screen.
    if (this.type === 1 || this.type === 3) {
      this.x += this.isLeftOrUp ? -5 : 5;
      this.imageType = this.imageType === 0 ? 1 : 0;

      let canLeft = true;
      let canRight = true;
      for (const ob of this.bg.allObstruction) {
        if (ob.x === this.x + 60 && ob.y + 50 > this.y && ob.y - 50 < this.y) canRight = false;
        if (ob.x === this.x - 60 && ob.y + 50 > this.y && ob.y - 50 < this.y) canLeft = false;
      }
      if ((!canLeft && this.isLeftOrUp) || this.x === 0) this.isLeftOrUp = false;
      else if ((!canRight && !this.isLeftOrUp) || this.x === 840) this.isLeftOrUp = true;

      this.sprite = [this.group, this.imageType];
    }

    // Type 2 (Oldbag) moves up and down between upMax and downMax.
    if (this.type === 2) {
      this.y += this.isLeftOrUp ? -5 : 5;
      this.imageType = this.imageType === 0 ? 1 : 0;
      if (this.isLeftOrUp && this.y === this.upMax) this.isLeftOrUp = false;
      if (!this.isLeftOrUp && this.y === this.downMax) this.isLeftOrUp = true;
      this.sprite = ['oldbag', this.imageType];
    }
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.px = this.x;
    this.py = this.y;
    // The Java version kept the last direction here, so an Oldbag on her way down
    // when Edgeworth died sank through the floor for good. Direction resets too.
    this.isLeftOrUp = this.startLeftOrUp;
    // Java also restored an Oldbag image for Karma here; he keeps his own sprite now.
    this.sprite = this.firstSprite();
  }

  // A stomped Winston leaves the scene's enemy list.
  dead() {
    removeFrom(this.bg.allEnemy, this);
    this.bg.removeEnemy.push(this);
  }
}

export class NPC {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.imageType = 0;
  }

  tick() {
    this.imageType = (this.imageType + 1) % 2;
  }
}

export class BackGround {
  constructor(index, def = SCENES[index]) {
    this.sort = index + 1;
    this.flag = Boolean(def.final);
    this.isOver = false;
    this.isDown = false;
    this.allObstruction = def.obstructions.map(([x, y, type]) => new Obstruction(x, y, type, this));
    this.removeObstruction = [];
    this.allEnemy = def.enemies.map(([x, y, isLeftOrUp, type, upMax, downMax]) =>
      new Enemy(x, y, isLeftOrUp, type, this, upMax, downMax));
    this.removeEnemy = [];
    this.allNPC = def.npcs.map(([x, y]) => new NPC(x, y));
    this.flags = this.allObstruction.filter((ob) => ob.type === 11);
  }

  enemyStartMove() {
    for (const e of this.allEnemy) e.moving = true;
  }

  // After a death the scene returns to its initial state. The Java version never
  // emptied the "removed" lists, so every later death added duplicates of the
  // same enemies and blocks; they are cleared here.
  reset() {
    this.allEnemy.push(...this.removeEnemy);
    this.allObstruction.push(...this.removeObstruction);
    this.removeEnemy.length = 0;
    this.removeObstruction.length = 0;
    for (const e of this.allEnemy) e.reset();
    for (const ob of this.allObstruction) ob.reset();
  }
}

export class Edgeworth {
  constructor(x, y, events = NO_EVENTS) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.bg = null;
    this.xmove = 0;
    this.ymove = 0;
    this.status = 'right-standing';
    this.frame = 0; // index into 1.png … 10.png
    this.score = 0;
    this.life = LIVES;
    this.moving = 0;
    this.upTime = 0;
    this.isDead = false;
    this.isClear = false;
    this.events = events;
  }

  snap() {
    this.px = this.x;
    this.py = this.y;
  }

  leftMove() {
    this.xmove = -5;
    this.status = this.status.includes('jumping') ? 'left-jumping' : 'left-moving';
  }

  rightMove() {
    this.xmove = 5;
    this.status = this.status.includes('jumping') ? 'right-jumping' : 'right-moving';
  }

  leftStop() {
    this.xmove = 0;
    this.status = this.status.includes('jumping') ? 'left-jumping' : 'left-standing';
  }

  rightStop() {
    this.xmove = 0;
    this.status = this.status.includes('jumping') ? 'right-jumping' : 'right-standing';
  }

  // Edgeworth can only jump from the ground or from on top of a block.
  jump() {
    if (!this.status.includes('jumping')) {
      this.status = this.status.includes('left') ? 'left-jumping' : 'right-jumping';
      this.ymove = -10;
      this.upTime = 18;
    }
  }

  down() {
    this.status = this.status.includes('left') ? 'left-jumping' : 'right-jumping';
    this.ymove = 10;
  }

  dead() {
    if (this.isDead) return;
    this.events.sound('yuyu');
    this.events.died(this.x, this.y, this.life === 1);
    this.life--;
    if (this.life === 0) {
      this.isDead = true;
    } else {
      this.bg.reset();
      this.x = 0;
      this.y = 480;
      // Respawn standing still instead of finishing a jump that started before the hit.
      this.upTime = 0;
      this.ymove = 0;
      this.status = 'right-standing';
      this.snap();
    }
  }

  tick() {
    this.px = this.x;
    this.py = this.y;
    const bg = this.bg;

    if (bg.flag && this.x >= 520) {
      // End of the last scene: the heart drops, Edgeworth settles, the game is clear.
      bg.isOver = true;
      if (bg.isDown) this.isClear = true;
      if (this.y < 420) this.y += 5;
      if (this.y >= 420) {
        this.y = 420;
        this.status = 'right-standing';
      }
    } else {
      let canLeft = true;
      let canRight = true;
      let onLand = false;

      const obs = bg.allObstruction;
      for (let i = 0; i < obs.length; i++) {
        const ob = obs[i];
        // blocked on the right / left
        if (ob.x === this.x + 60 && ob.y + 50 > this.y && ob.y - 50 < this.y && ob.type !== 3) canRight = false;
        if (ob.x === this.x - 60 && ob.y + 50 > this.y && ob.y - 50 < this.y && ob.type !== 3) canLeft = false;
        // standing on something
        if (ob.y === this.y + 60 && ob.x + 60 > this.x && ob.x - 60 < this.x && ob.type !== 3) onLand = true;
        // hitting a block from below
        if (ob.y === this.y - 60 && ob.x + 50 > this.x && ob.x - 50 < this.x) {
          if (ob.type === 0) {
            removeFrom(obs, ob);
            bg.removeObstruction.push(ob);
            this.events.broke(ob);
          }
          if ((ob.type === 4 || ob.type === 3) && this.upTime > 0) {
            this.score += 10;
            this.events.sound('cbt');
            this.events.points(ob.x + 30, ob.y);
            ob.type = 2;
          }
          this.upTime = 0;
        }
      }

      const enemies = bg.allEnemy;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        // touching any enemy is fatal…
        if (e.y + 60 > this.y && e.y - 60 < this.y && e.x + 50 > this.x && e.x - 50 < this.x) {
          this.dead();
        }
        // …except landing on top of one
        if (e.y === this.y + 60 && e.x + 60 > this.x && e.x - 60 < this.x) {
          if (e.type === 1) {
            this.events.sound('yanei');
            this.events.stomped(e);
            e.dead();
            this.upTime = 5;
            this.ymove = -10;
            this.score += 10;
            this.events.points(e.x + 30, e.y);
          } else if (e.type === 2) {
            this.dead();
          }
        }
        if (this.isDead) break;
      }

      if (onLand && this.upTime === 0) {
        if (this.status.includes('left')) this.status = this.xmove !== 0 ? 'left-moving' : 'left-standing';
        else this.status = this.xmove !== 0 ? 'right-moving' : 'right-standing';
      } else {
        if (this.upTime !== 0) this.upTime--;
        else this.down();
        this.y += this.ymove;
      }

      if (this.y > 600) this.dead();

      if ((canLeft && this.xmove < 0) || (canRight && this.xmove > 0)) {
        this.x += this.xmove;
        if (this.x < 0) this.x = 0;
      }
    }

    // Pick the sprite: 0–4 face right (standing, walking ×3, jumping), 5–9 face left.
    let frame = 0;
    if (this.status.includes('left')) frame += 5;
    if (this.status.includes('moving')) {
      frame += this.moving;
      this.moving++;
      if (this.moving === 4) this.moving = 0;
    }
    if (this.status.includes('jumping')) frame += 4;
    this.frame = frame;
  }
}

// The whole game state plus the per-tick update from MyFrame.run().
export class World {
  constructor({ startScene = 1, events = NO_EVENTS, scenes = SCENES } = {}) {
    this.scenes = scenes.map((def, i) => new BackGround(i, def));
    this.scene = this.scenes[startScene - 1];
    this.hero = new Edgeworth(0, 480, events);
    this.hero.bg = this.scene;
    this.tickCount = 0;
  }

  // Space on the title screen (MyFrame.keyPressed).
  start() {
    this.scene.enemyStartMove();
    this.hero.score = 0;
    this.hero.life = LIVES;
  }

  // One 50 ms tick. control = { dir: 'left' | 'right' | null, jump: boolean }.
  step(control = {}) {
    const hero = this.hero;
    if (control.dir === 'right') hero.rightMove();
    else if (control.dir === 'left') hero.leftMove();
    else if (hero.xmove > 0) hero.rightStop();
    else if (hero.xmove < 0) hero.leftStop();
    if (control.jump) hero.jump();

    hero.tick();
    for (const flag of this.scene.flags) flag.tick();

    this.tickCount++;
    if (this.tickCount % ENEMY_EVERY === 0) {
      for (const e of this.scene.allEnemy) e.tick();
      for (const e of this.scene.removeEnemy) e.tick();
      for (const npc of this.scene.allNPC) npc.tick();
    }

    let sceneChanged = false;
    if (hero.x >= 840 && !this.scene.flag) {
      this.scene = this.scenes[this.scene.sort];
      hero.bg = this.scene;
      this.scene.enemyStartMove();
      hero.x = 0;
      hero.snap();
      sceneChanged = true;
    }
    return { sceneChanged, dead: hero.isDead, clear: hero.isClear };
  }
}
