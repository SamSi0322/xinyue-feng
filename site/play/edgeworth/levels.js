// Level data for the six scenes, transcribed one-to-one from the constructor of
// BackGround.java (the original Java version). Coordinates are in the original
// 900 × 600 window space; tiles are 60 × 60.
//
// Obstruction types (index into the ob1.png … ob12.png images):
//   0 Blue Badger block — breaks when hit from below
//   1 "Hold it!" pillar block
//   2 "Objection!" block — what a ? block turns into after it is hit
//   3 hidden block — invisible and passable until hit from below
//   4 Phoenix ? block — +10 points when hit from below
//   5–8 pipe pieces
//   9 heart — ground
//  11 heart flag — drops when Edgeworth reaches the end of the last scene
//
// Enemy types: 1 Winston Payne (walks, can be stomped), 2 Wendy Oldbag (moves
// up/down between upMax and downMax), 3 Manfred von Karma (walks, cannot be
// stomped).

const ground = (keep) =>
  Array.from({ length: 15 }, (_, i) => i).filter(keep).map((i) => [i * 60, 540, 9]);

// [x, y, type]
// enemies: [x, y, isLeftOrUp, type] or [x, y, isLeftOrUp, type, upMax, downMax]

export const SCENES = [
  {
    // Scene 1
    obstructions: [
      ...ground(() => true),
      // Phoenix-ob5
      [180, 360, 4], [300, 360, 4], [480, 360, 4], [600, 360, 4], [240, 300, 4], [540, 300, 4],
      // Blue Badger-ob1
      [240, 360, 0], [540, 360, 0],
      // ob6&7 (pipe)
      [720, 480, 6], [780, 480, 5],
    ],
    enemies: [
      [600, 480, true, 1],
      [500, 480, true, 3],
      [750, 480, true, 2, 420, 480],
    ],
    npcs: [],
  },
  {
    // Scene 2
    obstructions: [
      ...ground((i) => i !== 9 && i !== 10 && i !== 11),
      // Phoenix-ob5
      [60, 360, 4], [120, 360, 4], [240, 240, 4], [300, 240, 4],
      // Blue Badger-ob1
      [420, 360, 0], [480, 360, 0], [600, 240, 0], [660, 240, 0], [780, 120, 0], [840, 120, 0],
      // ob6-9 (tall pipe)
      [780, 480, 6], [840, 480, 5], [780, 420, 6], [840, 420, 5], [780, 360, 8], [840, 360, 7],
    ],
    enemies: [
      [500, 480, true, 3],
      [700, 480, true, 1],
      [300, 480, true, 1],
      [810, 360, true, 2, 300, 420],
    ],
    npcs: [],
  },
  {
    // Scene 3 — a face drawn in blocks
    obstructions: [
      ...ground((i) => i === 0 || i === 1 || i === 3),
      // Phoenix-ob5
      [840, 120, 4], [780, 120, 4], [60, 120, 4], [120, 240, 4],
      // mouth
      [300, 480, 0], [360, 480, 0], [420, 480, 0],
      [360, 420, 0], [420, 420, 0], [480, 420, 0],
      [420, 360, 0], [480, 360, 0], [540, 360, 0],
      // eyes
      [240, 120, 0], [240, 240, 0], [240, 360, 0],
      [600, 180, 0], [660, 120, 0], [720, 180, 0],
    ],
    enemies: [
      [700, 480, true, 2, 480, 700],
      [500, 480, true, 2, 480, 700],
      [300, 480, true, 2, 480, 700],
      [100, 480, true, 2, 480, 700],
    ],
    npcs: [],
  },
  {
    // Scene 4 — three pillars and Detective Gumshoe's hint
    obstructions: [
      ...ground((i) => i <= 5),
      // ob2, ob10
      [420, 540, 1], [420, 480, 1], [420, 420, 1], [420, 360, 1], [420, 300, 1], [420, 240, 1], [420, 180, 9],
      [540, 540, 1], [540, 480, 1], [540, 420, 1], [540, 360, 1], [540, 300, 9],
      [660, 540, 1], [660, 480, 1], [660, 420, 1], [660, 360, 1], [660, 300, 1], [660, 240, 1], [660, 180, 9],
      // hidden ob
      [300, 360, 3],
      // Phoenix-ob5
      [780, 300, 4], [840, 300, 4],
    ],
    enemies: [],
    npcs: [[300, 475]],
  },
  {
    // Scene 5 — a heart
    obstructions: [
      ...ground((i) => i < 2 || i > 12),
      [480, 120, 4], [360, 120, 4],
      [420, 180, 0],
      [300, 60, 4], [540, 60, 4],
      [600, 60, 4], [660, 60, 4], [720, 60, 0],
      [240, 60, 4], [180, 60, 4], [120, 60, 0],
      [780, 120, 4], [60, 120, 4],
      [60, 180, 4], [60, 240, 4], [780, 180, 4], [780, 240, 4],
      [720, 300, 0], [660, 360, 4], [600, 420, 4], [540, 480, 4], [480, 540, 4],
      [120, 300, 0], [180, 360, 4], [240, 420, 4], [300, 480, 4], [360, 540, 0],
    ],
    enemies: [
      [900, 480, true, 2, 480, 700],
      [700, 480, true, 2, 480, 700],
      [500, 480, true, 2, 480, 700],
      [300, 480, true, 2, 480, 700],
      [100, 480, true, 2, 480, 700],
      [600, 480, true, 2, 540, 700],
      [400, 480, true, 2, 700, 700],
      [200, 480, true, 2, 700, 700],
      [100, 480, true, 2, 540, 700],
      [700, 480, true, 1],
      [300, 480, true, 1],
    ],
    npcs: [],
  },
  {
    // Scene 6 — the ending (flag = true in the Java version)
    final: true,
    obstructions: [
      ...ground(() => true),
      [550, 180, 11],
    ],
    enemies: [
      [700, 480, true, 1],
      [600, 480, true, 1],
      [500, 480, true, 1],
      [400, 480, true, 1],
      [450, 480, true, 1],
      [350, 480, true, 1],
      [420, 480, true, 1],
      [410, 480, true, 1],
      [360, 480, true, 1],
      [500, 480, true, 3],
    ],
    npcs: [],
  },
];
