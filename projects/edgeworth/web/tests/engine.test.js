// Run with: npm test   (Node 18+)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, BackGround, Edgeworth, LIVES } from '../engine.js';
import { SCENES } from '../levels.js';

const run = (world, ticks, control = {}) => {
  for (let i = 0; i < ticks; i++) world.step(control);
};

const freeze = (scene) => {
  for (const e of scene.allEnemy) e.moving = false;
};

test('scenes contain the same objects as BackGround.java', () => {
  // [obstructions, enemies, NPCs] per scene, counted from the Java constructor
  const expected = [[25, 3, 0], [28, 4, 0], [22, 4, 0], [28, 0, 1], [31, 11, 0], [16, 10, 0]];
  SCENES.forEach((def, i) => {
    const bg = new BackGround(i, def);
    assert.deepEqual(
      [bg.allObstruction.length, bg.allEnemy.length, bg.allNPC.length],
      expected[i],
      `scene ${i + 1}`,
    );
  });
  assert.equal(new BackGround(5).flag, true);
  assert.equal(new BackGround(0).flag, false);
});

test('enemies stay frozen until the game starts', () => {
  const world = new World();
  const before = world.scene.allEnemy.map((e) => [e.x, e.y]);
  run(world, 10);
  assert.deepEqual(world.scene.allEnemy.map((e) => [e.x, e.y]), before);
  world.start();
  run(world, 2);
  assert.notDeepEqual(world.scene.allEnemy.map((e) => [e.x, e.y]), before);
});

test('a jump rises 180 px and lands back on the ground', () => {
  const world = new World();
  world.start();
  freeze(world.scene);
  let top = 480;
  world.step({ jump: true });
  for (let i = 0; i < 60; i++) {
    world.step();
    top = Math.min(top, world.hero.y);
  }
  assert.equal(top, 300);
  assert.equal(world.hero.y, 480);
  assert.match(world.hero.status, /standing/);
});

test('walking moves 5 px per tick', () => {
  const world = new World();
  world.start();
  freeze(world.scene);
  run(world, 10, { dir: 'right' });
  assert.equal(world.hero.x, 50);
  run(world, 4, { dir: 'left' });
  assert.equal(world.hero.x, 30);
});

test('stomping Winston scores 10 and removes him', () => {
  const world = new World();
  world.start();
  freeze(world.scene);
  const winston = world.scene.allEnemy.find((e) => e.type === 1);
  Object.assign(world.hero, { x: winston.x, y: winston.y - 120, status: 'right-jumping' });
  run(world, 8);
  assert.equal(world.hero.score, 10);
  assert.ok(!world.scene.allEnemy.includes(winston));
  assert.equal(world.hero.life, LIVES);
});

test('hitting a Phoenix block from below scores 10 and turns it into an Objection block', () => {
  const world = new World();
  world.start();
  freeze(world.scene);
  world.hero.x = 180;
  world.step({ jump: true });
  run(world, 40);
  const block = world.scene.allObstruction.find((o) => o.x === 180 && o.y === 360);
  assert.equal(block.type, 2);
  assert.equal(world.hero.score, 10);
});

test('a death costs a life and fully resets the scene', () => {
  const world = new World();
  world.start();
  freeze(world.scene);
  // break the badger block at (240, 360)
  world.hero.x = 240;
  world.step({ jump: true });
  run(world, 40);
  assert.ok(!world.scene.allObstruction.some((o) => o.x === 240 && o.y === 360));
  // stomp Winston, then walk into Karma
  const winston = world.scene.allEnemy.find((e) => e.type === 1);
  Object.assign(world.hero, { x: winston.x, y: winston.y - 120, status: 'right-jumping' });
  run(world, 8);
  const karma = world.scene.allEnemy.find((e) => e.type === 3);
  Object.assign(world.hero, { x: karma.x - 30, y: karma.y });
  world.step();

  assert.equal(world.hero.life, LIVES - 1);
  assert.deepEqual([world.hero.x, world.hero.y], [0, 480]);
  assert.ok(world.scene.allObstruction.some((o) => o.x === 240 && o.y === 360), 'badger block restored');
  assert.ok(world.scene.allEnemy.includes(winston), 'Winston restored');
  assert.equal(world.scene.removeEnemy.length, 0);
  assert.equal(world.scene.removeObstruction.length, 0);
  // no duplicates after a second death (the Java version duplicated them)
  world.hero.y = 700;
  world.step();
  assert.equal(new Set(world.scene.allEnemy).size, world.scene.allEnemy.length);
  assert.equal(new Set(world.scene.allObstruction).size, world.scene.allObstruction.length);
});

test('an Oldbag that was moving down returns to her pipe after a reset', () => {
  const world = new World();
  world.start();
  const oldbag = world.scene.allEnemy.find((e) => e.type === 2);
  oldbag.isLeftOrUp = false;
  oldbag.y = 455;
  world.hero.y = 700; // fall → reset
  world.step();
  assert.equal(oldbag.isLeftOrUp, true);
  for (let i = 0; i < 200; i++) world.step();
  assert.ok(oldbag.y >= 420 && oldbag.y <= 480, `Oldbag stays in her pipe (y = ${oldbag.y})`);
});

test('three deaths end the game', () => {
  const world = new World();
  world.start();
  for (let i = 0; i < LIVES; i++) {
    world.hero.y = 700;
    world.step();
  }
  assert.equal(world.hero.isDead, true);
  assert.equal(world.hero.life, 0);
});

test('reaching the right edge moves on to the next scene', () => {
  const world = new World();
  world.start();
  freeze(world.scene);
  world.hero.x = 835;
  const result = world.step({ dir: 'right' });
  assert.equal(result.sceneChanged, true);
  assert.equal(world.scene.sort, 2);
  assert.equal(world.hero.x, 0);
});

test('the last scene ends with the heart dropping and the game clear', () => {
  const world = new World({ startScene: 6 });
  world.start();
  freeze(world.scene);
  world.hero.x = 520;
  let result;
  for (let i = 0; i < 200 && !(result && result.clear); i++) result = world.step();
  assert.equal(result.clear, true);
  assert.equal(world.scene.flags[0].y, 420);
});

// Every scene can still be finished: a breadth-first search over all of
// Edgeworth's possible inputs (left / right / none × jump / no jump each tick),
// with enemies left out, must reach the exit of each scene starting from a
// position in which the previous scene can be left.
test('all six scenes can be completed', () => {
  let entries = [{ y: 480, upTime: 0, jumping: false }];
  for (let s = 0; s < SCENES.length; s++) {
    const exits = explore(s, entries);
    assert.ok(exits.length > 0, `scene ${s + 1} has a reachable exit`);
    entries = exits;
  }
});

function explore(sceneIndex, entries) {
  const bg = new BackGround(sceneIndex);
  bg.allEnemy = [];
  const all = bg.allObstruction.slice();
  const mutable = all.map((o, i) => (o.type === 0 || o.type === 3 ? i : -1)).filter((i) => i >= 0);
  const hero = new Edgeworth(0, 480);
  hero.bg = bg;

  const key = (st) => ((((st.mask * 256 + st.x / 5) * 1024 + (st.y + 2000) / 5) * 32 + st.upTime) * 2 + (st.jumping ? 1 : 0));
  const seen = new Set();
  const queue = [];
  const push = (st) => {
    const k = key(st);
    if (!seen.has(k)) {
      seen.add(k);
      queue.push(st);
    }
  };
  for (const e of entries) push({ x: 0, y: e.y, upTime: e.upTime, jumping: e.jumping, mask: 0 });

  const exits = new Map();
  const actions = [];
  for (const dir of ['right', null, 'left']) for (const jump of [true, false]) actions.push({ dir, jump });

  for (let head = 0; head < queue.length; head++) {
    const st = queue[head];
    for (const { dir, jump } of actions) {
      // restore the state
      bg.allObstruction = all.filter((o, i) => {
        const bit = mutable.indexOf(i);
        o.type = o.startType;
        if (bit === -1) return true;
        const set = (st.mask >> bit) & 1;
        if (o.startType === 3 && set) o.type = 2;
        return !(o.startType === 0 && set);
      });
      bg.removeObstruction = [];
      Object.assign(hero, {
        x: st.x, y: st.y, upTime: st.upTime, ymove: st.upTime > 0 ? -10 : 10,
        xmove: 0, life: LIVES, isDead: false, isClear: false,
        status: st.jumping ? 'right-jumping' : 'right-standing',
      });

      if (dir === 'right') hero.rightMove();
      else if (dir === 'left') hero.leftMove();
      if (jump) hero.jump();
      hero.tick();
      if (hero.life < LIVES) continue; // fell off the screen

      if (bg.flag && hero.x >= 520) return [{ y: hero.y, upTime: 0, jumping: false }];
      if (!bg.flag && hero.x >= 840) {
        const exit = { y: hero.y, upTime: hero.upTime, jumping: hero.status.includes('jumping') };
        exits.set(`${exit.y}/${exit.upTime}/${exit.jumping}`, exit);
        continue;
      }
      let mask = 0;
      mutable.forEach((i, bit) => {
        const o = all[i];
        if ((o.startType === 0 && !bg.allObstruction.includes(o)) || (o.startType === 3 && o.type === 2)) mask |= 1 << bit;
      });
      push({ x: hero.x, y: hero.y, upTime: hero.upTime, jumping: hero.status.includes('jumping'), mask });
    }
  }
  return [...exits.values()];
}
