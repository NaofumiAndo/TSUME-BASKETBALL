/**
 * Deep Dive Test: Focused investigation on arc adjacency detection
 *
 * The previous test showed Test 3 with ball carrier at (4,5) on arc
 * with defenders at (2,5) and (6,5) also on arc - but marked as "contested"
 */

const GRID_SIZE = 9;
const BASKET_POS = { x: 4, y: 1 };
const THREE_POINT_LINE = [
  { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 },
  { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
  { x: 7, y: 4 }, { x: 7, y: 3 }, { x: 7, y: 2 }, { x: 7, y: 1 }
];
const LAYUP_POSITIONS = [
  { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 },
  { x: 4, y: 2 }, { x: 4, y: 3 },
  { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }
];

const isPosEqual = (a, b) => a.x === b.x && a.y === b.y;
const getDistance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const isPartOfThreePointArc = (pos) => THREE_POINT_LINE.some(linePos => isPosEqual(linePos, pos));

const canScore = (player, players) => {
  if (!player.hasBall) return { success: false, reason: "No ball", pts: 0, type: "" };

  const dist = getDistance(player.pos, BASKET_POS);
  const isOnArc = isPartOfThreePointArc(player.pos);
  const defenders = players.filter(p => p.team === 'defense');
  const adjacentDefenders = defenders.filter(d => getDistance(player.pos, d.pos) <= 1);

  console.log(`  Ball carrier at: (${player.pos.x}, ${player.pos.y})`);
  console.log(`  Is on arc: ${isOnArc}`);
  console.log(`  Total defenders: ${defenders.length}`);
  console.log(`  Defenders within distance 1: ${adjacentDefenders.length}`);
  adjacentDefenders.forEach(d => {
    const dist = getDistance(player.pos, d.pos);
    const dx = Math.abs(player.pos.x - d.pos.x);
    const dy = Math.abs(player.pos.y - d.pos.y);
    console.log(`    - Defender at (${d.pos.x}, ${d.pos.y}): distance=${dist}, dx=${dx}, dy=${dy}`);
  });

  if (isOnArc) {
    if (adjacentDefenders.length > 0) {
      return { success: false, reason: "Contested 3PT!", pts: 0, type: "" };
    }
    if (!THREE_POINT_LINE.some(arcPos => arcPos.x === player.pos.x && arcPos.y === player.pos.y)) {
      return { success: false, reason: "Not on arc line!", pts: 0, type: "" };
    }
    return { success: true, pts: 3, type: "3-Pointer" };
  }

  if (isPosEqual(player.pos, BASKET_POS)) {
    return { success: true, pts: 2, type: "Slam Dunk" };
  }

  if (LAYUP_POSITIONS.some(p => isPosEqual(p, player.pos))) {
    const basketDefender = defenders.find(d => isPosEqual(d.pos, BASKET_POS) || isAdjacent(d.pos, BASKET_POS));
    if (basketDefender) {
      return { success: false, reason: "Rim Protected!", pts: 0, type: "" };
    }
    return { success: true, pts: 2, type: "Layup" };
  }

  return { success: false, reason: "Too far! Move to arc or attack the rim!", pts: 0, type: "" };
};

const isAdjacent = (a, b) => getDistance(a, b) === 1;

const visualizeBoard = (players) => {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('·'));

  // Mark basket
  grid[BASKET_POS.y][BASKET_POS.x] = '🏀';

  // Mark arc
  THREE_POINT_LINE.forEach(pos => {
    if (grid[pos.y][pos.x] === '·') {
      grid[pos.y][pos.x] = '·'; // Will be overwritten by players if present
    }
  });

  // Mark players
  players.forEach(p => {
    if (p.hasBall) {
      grid[p.pos.y][p.pos.x] = '⭐';
    } else if (p.team === 'offense') {
      grid[p.pos.y][p.pos.x] = 'O';
    } else {
      grid[p.pos.y][p.pos.x] = 'X';
    }
  });

  return grid.map((row, y) => `  ${y}: ${row.join(' ')}`).join('\n');
};

console.log('\n=== INVESTIGATING ARC ADJACENCY DETECTION ===\n');

// Test Case 1: Ball carrier at (4,5), defenders at (3,5) and (5,5) - all on same row
console.log('\n--- TEST 1: Defenders on same arc row (distance=1 horizontally) ---');
const test1 = [
  { id: 'o1', team: 'offense', pos: { x: 4, y: 5 }, hasBall: true, name: 'PG' },
  { id: 'o2', team: 'offense', pos: { x: 1, y: 6 }, hasBall: false, name: 'SG' },
  { id: 'o3', team: 'offense', pos: { x: 7, y: 6 }, hasBall: false, name: 'SF' },
  { id: 'o4', team: 'offense', pos: { x: 3, y: 7 }, hasBall: false, name: 'PF' },
  { id: 'o5', team: 'offense', pos: { x: 5, y: 7 }, hasBall: false, name: 'C' },
  { id: 'd1', team: 'defense', pos: { x: 3, y: 5 }, hasBall: false, name: 'D1' },
  { id: 'd2', team: 'defense', pos: { x: 5, y: 5 }, hasBall: false, name: 'D2' },
  { id: 'd3', team: 'defense', pos: { x: 2, y: 3 }, hasBall: false, name: 'D3' },
  { id: 'd4', team: 'defense', pos: { x: 6, y: 3 }, hasBall: false, name: 'D4' },
  { id: 'd5', team: 'defense', pos: { x: 4, y: 2 }, hasBall: false, name: 'D5' },
];
console.log(visualizeBoard(test1));
const result1 = canScore(test1[0], test1);
console.log(`\nResult: ${result1.success ? 'SUCCESS' : 'BLOCKED'} - ${result1.reason || result1.type}`);

// Test Case 2: Ball carrier at (4,5), defenders NOT adjacent (at least distance 2)
console.log('\n\n--- TEST 2: Defenders NOT adjacent (far from ball carrier) ---');
const test2 = [
  { id: 'o1', team: 'offense', pos: { x: 4, y: 5 }, hasBall: true, name: 'PG' },
  { id: 'o2', team: 'offense', pos: { x: 1, y: 6 }, hasBall: false, name: 'SG' },
  { id: 'o3', team: 'offense', pos: { x: 7, y: 6 }, hasBall: false, name: 'SF' },
  { id: 'o4', team: 'offense', pos: { x: 3, y: 7 }, hasBall: false, name: 'PF' },
  { id: 'o5', team: 'offense', pos: { x: 5, y: 7 }, hasBall: false, name: 'C' },
  { id: 'd1', team: 'defense', pos: { x: 4, y: 3 }, hasBall: false, name: 'D1' }, // Distance 2 below
  { id: 'd2', team: 'defense', pos: { x: 2, y: 5 }, hasBall: false, name: 'D2' }, // Distance 2 left
  { id: 'd3', team: 'defense', pos: { x: 6, y: 5 }, hasBall: false, name: 'D3' }, // Distance 2 right
  { id: 'd4', team: 'defense', pos: { x: 3, y: 4 }, hasBall: false, name: 'D4' }, // Diagonal distance
  { id: 'd5', team: 'defense', pos: { x: 5, y: 4 }, hasBall: false, name: 'D5' }, // Diagonal distance
];
console.log(visualizeBoard(test2));
const result2 = canScore(test2[0], test2);
console.log(`\nResult: ${result2.success ? 'SUCCESS' : 'BLOCKED'} - ${result2.reason || result2.type}`);

// Test Case 3: Ball carrier at (4,5), one defender diagonally adjacent
console.log('\n\n--- TEST 3: One defender diagonally adjacent (distance=1) ---');
const test3 = [
  { id: 'o1', team: 'offense', pos: { x: 4, y: 5 }, hasBall: true, name: 'PG' },
  { id: 'o2', team: 'offense', pos: { x: 1, y: 6 }, hasBall: false, name: 'SG' },
  { id: 'o3', team: 'offense', pos: { x: 7, y: 6 }, hasBall: false, name: 'SF' },
  { id: 'o4', team: 'offense', pos: { x: 2, y: 7 }, hasBall: false, name: 'PF' },
  { id: 'o5', team: 'offense', pos: { x: 6, y: 7 }, hasBall: false, name: 'C' },
  { id: 'd1', team: 'defense', pos: { x: 3, y: 4 }, hasBall: false, name: 'D1' }, // Diagonal
  { id: 'd2', team: 'defense', pos: { x: 2, y: 5 }, hasBall: false, name: 'D2' },
  { id: 'd3', team: 'defense', pos: { x: 6, y: 5 }, hasBall: false, name: 'D3' },
  { id: 'd4', team: 'defense', pos: { x: 4, y: 3 }, hasBall: false, name: 'D4' },
  { id: 'd5', team: 'defense', pos: { x: 7, y: 2 }, hasBall: false, name: 'D5' },
];
console.log(visualizeBoard(test3));
const result3 = canScore(test3[0], test3);
console.log(`\nResult: ${result3.success ? 'SUCCESS' : 'BLOCKED'} - ${result3.reason || result3.type}`);

// Test Case 4: Ball carrier at (1,1) corner arc position
console.log('\n\n--- TEST 4: Ball carrier at corner arc position (1,1) ---');
const test4 = [
  { id: 'o1', team: 'offense', pos: { x: 1, y: 1 }, hasBall: true, name: 'PG' },
  { id: 'o2', team: 'offense', pos: { x: 3, y: 6 }, hasBall: false, name: 'SG' },
  { id: 'o3', team: 'offense', pos: { x: 5, y: 6 }, hasBall: false, name: 'SF' },
  { id: 'o4', team: 'offense', pos: { x: 2, y: 7 }, hasBall: false, name: 'PF' },
  { id: 'o5', team: 'offense', pos: { x: 6, y: 7 }, hasBall: false, name: 'C' },
  { id: 'd1', team: 'defense', pos: { x: 3, y: 2 }, hasBall: false, name: 'D1' },
  { id: 'd2', team: 'defense', pos: { x: 5, y: 2 }, hasBall: false, name: 'D2' },
  { id: 'd3', team: 'defense', pos: { x: 4, y: 3 }, hasBall: false, name: 'D3' },
  { id: 'd4', team: 'defense', pos: { x: 2, y: 4 }, hasBall: false, name: 'D4' },
  { id: 'd5', team: 'defense', pos: { x: 6, y: 4 }, hasBall: false, name: 'D5' },
];
console.log(visualizeBoard(test4));
const result4 = canScore(test4[0], test4);
console.log(`\nResult: ${result4.success ? 'SUCCESS' : 'BLOCKED'} - ${result4.reason || result4.type}`);

// Test Case 5: Ball carrier at (7,1) other corner arc
console.log('\n\n--- TEST 5: Ball carrier at corner arc position (7,1) ---');
const test5 = [
  { id: 'o1', team: 'offense', pos: { x: 7, y: 1 }, hasBall: true, name: 'PG' },
  { id: 'o2', team: 'offense', pos: { x: 3, y: 6 }, hasBall: false, name: 'SG' },
  { id: 'o3', team: 'offense', pos: { x: 5, y: 6 }, hasBall: false, name: 'SF' },
  { id: 'o4', team: 'offense', pos: { x: 2, y: 7 }, hasBall: false, name: 'PF' },
  { id: 'o5', team: 'offense', pos: { x: 4, y: 7 }, hasBall: false, name: 'C' },
  { id: 'd1', team: 'defense', pos: { x: 3, y: 2 }, hasBall: false, name: 'D1' },
  { id: 'd2', team: 'defense', pos: { x: 5, y: 2 }, hasBall: false, name: 'D2' },
  { id: 'd3', team: 'defense', pos: { x: 4, y: 3 }, hasBall: false, name: 'D3' },
  { id: 'd4', team: 'defense', pos: { x: 2, y: 5 }, hasBall: false, name: 'D4' },
  { id: 'd5', team: 'defense', pos: { x: 6, y: 5 }, hasBall: false, name: 'D5' },
];
console.log(visualizeBoard(test5));
const result5 = canScore(test5[0], test5);
console.log(`\nResult: ${result5.success ? 'SUCCESS' : 'BLOCKED'} - ${result5.reason || result5.type}`);

console.log('\n\n=== SUMMARY ===');
console.log('Tests show how Chebyshev distance (max of dx, dy) is used for adjacency.');
console.log('Defenders at distance=1 (including diagonals) will block 3pt shots.');
console.log('Arc positions (x,y): need NO defenders within distance 1 to shoot.');
