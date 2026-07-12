// sprites.js — hand-authored pixel art for the player character.
// Same chicken design as chicken-idle-tycoon, reused here for brand
// continuity. Side-view frames are flipped horizontally for left/right
// movement; up/down movement reuses these for now (documented MVP
// limitation — see design.md "Risks / Open Questions").

export const SPRITE_WIDTH = 14;
export const SPRITE_HEIGHT = 14;

export const PALETTE = {
  '.': null,
  'o': '#2b1d14',
  'w': '#f4ece0',
  'r': '#c1443a',
  'y': '#e8a23b',
  'b': '#1a1108'
};

const BODY_ROWS = [
  '......rr......',
  '.....rrrr.....',
  '..wwwwwwwww...',
  '.wwwbwwwwwwy..',
  '.wwwwwwwwwwy..',
  '.wwwwwwwwwww..',
  '.wwwwwwwwwww..',
  '.wwwwwwwwwww..',
  '..wwwwwwwww...',
  '...wwwwwww....'
].map(row => row.slice(0, SPRITE_WIDTH).padEnd(SPRITE_WIDTH, '.'));

const LEGS_IDLE = [
  '....yy..yy....',
  '....yy..yy....',
  '....yy..yy....',
  '...yyy..yyy...'
].map(row => row.slice(0, SPRITE_WIDTH).padEnd(SPRITE_WIDTH, '.'));

const LEGS_WALK_A = [
  '..yy....yy....',
  '..yy....yy....',
  '..yy..........',
  '.yyy..........'
].map(row => row.slice(0, SPRITE_WIDTH).padEnd(SPRITE_WIDTH, '.'));

const LEGS_WALK_B = [
  '....yy....yy..',
  '....yy....yy..',
  '..........yy..',
  '..........yyy.'
].map(row => row.slice(0, SPRITE_WIDTH).padEnd(SPRITE_WIDTH, '.'));

export const CHICKEN_FRAMES = {
  idle: [...BODY_ROWS, ...LEGS_IDLE],
  walkA: [...BODY_ROWS, ...LEGS_WALK_A],
  walkB: [...BODY_ROWS, ...LEGS_WALK_B]
};
