/**
 * Complex Pass Testing: Diagonal passes with orthogonal defender blocking
 *
 * This test specifically focuses on the diagonal pass blocking rule:
 * - Diagonal adjacent passes check BOTH orthogonal positions
 * - If EITHER orthogonal position has a defender, the pass is blocked
 *
 * We're looking for edge cases where this might incorrectly block valid passes
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
const getManhattanDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const isAdjacent = (a, b) => getDistance(a, b) === 1;
const isPartOfThreePointArc = (pos) => THREE_POINT_LINE.some(linePos => isPosEqual(linePos, pos));
const isLayupPosition = (pos) => LAYUP_POSITIONS.some(layupPos => isPosEqual(layupPos, pos));

const isPathClear = (start, end, players) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  const isStraight = dx === 0 || dy === 0;
  const isDiagonal = absDx === absDy;

  if (!isStraight && !isDiagonal) return false;

  const stepX = dx === 0 ? 0 : dx / absDx;
  const stepY = dy === 0 ? 0 : dy / absDy;

  let curX = start.x + stepX;
  let curY = start.y + stepY;

  while (curX !== end.x || curY !== end.y) {
    if (players.some(p => p.team === 'defense' && p.pos.x === curX && p.pos.y === curY)) {
      return false;
    }
    curX += stepX;
    curY += stepY;
  }

  if (players.some(p => p.team === 'defense' && p.pos.x === end.x && p.pos.y === end.y)) {
    return false;
  }

  return true;
};

const canPassToTeammate = (from, to, players) => {
  console.log(`    Testing pass from (${from.pos.x},${from.pos.y}) to (${to.pos.x},${to.pos.y})`);

  // Check if target position has a defender
  const defenderAtTarget = players.find(p => p.team === 'defense' && isPosEqual(p.pos, to.pos));
  if (defenderAtTarget) {
    console.log(`      ✗ Blocked: Defender at target position`);
    return false;
  }

  // For adjacent passes, check if diagonal pass is blocked by orthogonal defenders
  if (isAdjacent(from.pos, to.pos)) {
    const dx = to.pos.x - from.pos.x;
    const dy = to.pos.y - from.pos.y;

    // If diagonal adjacent pass, check both orthogonal positions
    if (dx !== 0 && dy !== 0) {
      const pos1 = { x: from.pos.x + dx, y: from.pos.y };
      const pos2 = { x: from.pos.x, y: from.pos.y + dy };

      console.log(`      Diagonal pass - checking orthogonal squares:`);
      console.log(`        pos1: (${pos1.x},${pos1.y})`);
      console.log(`        pos2: (${pos2.x},${pos2.y})`);

      const defenderAtPos1 = players.find(p => p.team === 'defense' && isPosEqual(p.pos, pos1));
      const defenderAtPos2 = players.find(p => p.team === 'defense' && isPosEqual(p.pos, pos2));

      if (defenderAtPos1) {
        console.log(`        ✗ Defender at pos1 (${pos1.x},${pos1.y})`);
      }
      if (defenderAtPos2) {
        console.log(`        ✗ Defender at pos2 (${pos2.x},${pos2.y})`);
      }

      // Block if either orthogonal position has a defender
      if (defenderAtPos1 || defenderAtPos2) {
        console.log(`      ✗ Blocked: Orthogonal defender(s) blocking diagonal pass`);
        return false;
      }
    }
    console.log(`      ✓ Pass allowed (adjacent, no blockers)`);
    return true;
  }

  // For longer passes, check entire path
  const pathClear = isPathClear(from.pos, to.pos, players);
  console.log(`      ${pathClear ? '✓' : '✗'} Long pass - path ${pathClear ? 'clear' : 'blocked'}`);
  return pathClear;
};

const canScore = (player, players) => {
  if (!player.hasBall) return { success: false, reason: "No ball", pts: 0, type: "" };

  const dist = getDistance(player.pos, BASKET_POS);
  const isOnArc = isPartOfThreePointArc(player.pos);
  const defenders = players.filter(p => p.team === 'defense');
  const adjacentDefenders = defenders.filter(d => getDistance(player.pos, d.pos) <= 1);

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

  if (isLayupPosition(player.pos)) {
    const basketDefender = defenders.find(d => isPosEqual(d.pos, BASKET_POS) || isAdjacent(d.pos, BASKET_POS));
    if (basketDefender) {
      return { success: false, reason: "Rim Protected!", pts: 0, type: "" };
    }
    return { success: true, pts: 2, type: "Layup" };
  }

  return { success: false, reason: "Too far! Move to arc or attack the rim!", pts: 0, type: "" };
};

const isLockedUp = (ballCarrier, players) => {
  const shotResult = canScore(ballCarrier, players);
  const canPass = players.some(p =>
    p.team === 'offense' &&
    p.id !== ballCarrier.id &&
    canPassToTeammate(ballCarrier, p, players)
  );

  return !shotResult.success && !canPass;
};

const visualizeBoard = (players) => {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('·'));

  grid[BASKET_POS.y][BASKET_POS.x] = '🏀';

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

const runTest = (testNum, players, description) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST ${testNum}: ${description}`);
  console.log('='.repeat(70));

  const ballCarrier = players.find(p => p.hasBall);
  console.log(`\nBall Carrier at: (${ballCarrier.pos.x}, ${ballCarrier.pos.y})`);
  console.log('\n' + visualizeBoard(players));

  const shotResult = canScore(ballCarrier, players);
  console.log(`\n  Shot: ${shotResult.success ? 'AVAILABLE' : 'BLOCKED'} - ${shotResult.reason || shotResult.type}`);

  console.log(`\n  Pass options:`);
  const teammates = players.filter(p => p.team === 'offense' && p.id !== ballCarrier.id);
  const passableTeammates = [];

  teammates.forEach(t => {
    const canPass = canPassToTeammate(ballCarrier, t, players);
    if (canPass) {
      passableTeammates.push(t);
    }
  });

  const gameSaysLockedUp = isLockedUp(ballCarrier, players);
  const hasValidMoves = shotResult.success || passableTeammates.length > 0;

  console.log(`\n  Total passable teammates: ${passableTeammates.length}`);
  console.log(`\n  Game declares LOCKED UP: ${gameSaysLockedUp ? 'YES' : 'NO'}`);
  console.log(`  Actually has valid moves: ${hasValidMoves ? 'YES' : 'NO'}`);

  if (gameSaysLockedUp && hasValidMoves) {
    console.log(`\n  🚨 FALSE POSITIVE! Game says locked but has moves!`);
    return true;
  } else if (!gameSaysLockedUp && !hasValidMoves) {
    console.log(`\n  ⚠️  FALSE NEGATIVE? Game says not locked but no moves found`);
  } else {
    console.log(`\n  ✓ Detection correct`);
  }

  return false;
};

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║           COMPLEX PASS TESTING - DIAGONAL BLOCKING               ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

let falsePositives = 0;

// TEST 1: Diagonal pass where ONE orthogonal square has defender
falsePositives += runTest(1, [
  { id: 'o1', team: 'offense', pos: { x: 4, y: 4 }, hasBall: true, name: 'BC' },
  { id: 'o2', team: 'offense', pos: { x: 5, y: 3 }, hasBall: false, name: 'T1' }, // Diagonal
  { id: 'o3', team: 'offense', pos: { x: 2, y: 6 }, hasBall: false, name: 'T2' },
  { id: 'o4', team: 'offense', pos: { x: 6, y: 6 }, hasBall: false, name: 'T3' },
  { id: 'o5', team: 'offense', pos: { x: 4, y: 7 }, hasBall: false, name: 'T4' },
  { id: 'd1', team: 'defense', pos: { x: 5, y: 4 }, hasBall: false, name: 'D1' }, // Blocks (4,4)->(5,3)
  { id: 'd2', team: 'defense', pos: { x: 3, y: 3 }, hasBall: false, name: 'D2' },
  { id: 'd3', team: 'defense', pos: { x: 2, y: 5 }, hasBall: false, name: 'D3' },
  { id: 'd4', team: 'defense', pos: { x: 6, y: 5 }, hasBall: false, name: 'D4' },
  { id: 'd5', team: 'defense', pos: { x: 4, y: 6 }, hasBall: false, name: 'D5' },
], "Diagonal pass with one orthogonal blocker") ? 1 : 0;

// TEST 2: Diagonal pass where BOTH orthogonal squares have defenders
falsePositives += runTest(2, [
  { id: 'o1', team: 'offense', pos: { x: 4, y: 4 }, hasBall: true, name: 'BC' },
  { id: 'o2', team: 'offense', pos: { x: 5, y: 3 }, hasBall: false, name: 'T1' }, // Diagonal
  { id: 'o3', team: 'offense', pos: { x: 2, y: 6 }, hasBall: false, name: 'T2' },
  { id: 'o4', team: 'offense', pos: { x: 6, y: 6 }, hasBall: false, name: 'T3' },
  { id: 'o5', team: 'offense', pos: { x: 4, y: 7 }, hasBall: false, name: 'T4' },
  { id: 'd1', team: 'defense', pos: { x: 5, y: 4 }, hasBall: false, name: 'D1' }, // Blocks (4,4)->(5,3)
  { id: 'd2', team: 'defense', pos: { x: 4, y: 3 }, hasBall: false, name: 'D2' }, // Also blocks
  { id: 'd3', team: 'defense', pos: { x: 2, y: 5 }, hasBall: false, name: 'D3' },
  { id: 'd4', team: 'defense', pos: { x: 6, y: 5 }, hasBall: false, name: 'D4' },
  { id: 'd5', team: 'defense', pos: { x: 1, y: 6 }, hasBall: false, name: 'D5' },
], "Diagonal pass with both orthogonal blockers") ? 1 : 0;

// TEST 3: Multiple diagonal passes, some blocked some not
falsePositives += runTest(3, [
  { id: 'o1', team: 'offense', pos: { x: 4, y: 4 }, hasBall: true, name: 'BC' },
  { id: 'o2', team: 'offense', pos: { x: 5, y: 3 }, hasBall: false, name: 'T1' }, // Diagonal NE - blocked
  { id: 'o3', team: 'offense', pos: { x: 3, y: 3 }, hasBall: false, name: 'T2' }, // Diagonal NW - clear
  { id: 'o4', team: 'offense', pos: { x: 5, y: 5 }, hasBall: false, name: 'T3' }, // Diagonal SE - clear
  { id: 'o5', team: 'offense', pos: { x: 3, y: 5 }, hasBall: false, name: 'T4' }, // Diagonal SW - blocked
  { id: 'd1', team: 'defense', pos: { x: 5, y: 4 }, hasBall: false, name: 'D1' }, // Blocks T1
  { id: 'd2', team: 'defense', pos: { x: 3, y: 4 }, hasBall: false, name: 'D2' }, // Blocks T4
  { id: 'd3', team: 'defense', pos: { x: 2, y: 6 }, hasBall: false, name: 'D3' },
  { id: 'd4', team: 'defense', pos: { x: 6, y: 6 }, hasBall: false, name: 'D4' },
  { id: 'd5', team: 'defense', pos: { x: 4, y: 7 }, hasBall: false, name: 'D5' },
], "Multiple diagonal options, 2 blocked 2 clear") ? 1 : 0;

// TEST 4: Orthogonal (straight) passes should NOT be affected by diagonal defenders
falsePositives += runTest(4, [
  { id: 'o1', team: 'offense', pos: { x: 4, y: 4 }, hasBall: true, name: 'BC' },
  { id: 'o2', team: 'offense', pos: { x: 5, y: 4 }, hasBall: false, name: 'T1' }, // Right
  { id: 'o3', team: 'offense', pos: { x: 3, y: 4 }, hasBall: false, name: 'T2' }, // Left
  { id: 'o4', team: 'offense', pos: { x: 4, y: 3 }, hasBall: false, name: 'T3' }, // Up
  { id: 'o5', team: 'offense', pos: { x: 4, y: 5 }, hasBall: false, name: 'T4' }, // Down
  { id: 'd1', team: 'defense', pos: { x: 5, y: 3 }, hasBall: false, name: 'D1' }, // Diagonal, shouldn't block orthogonal
  { id: 'd2', team: 'defense', pos: { x: 3, y: 3 }, hasBall: false, name: 'D2' }, // Diagonal
  { id: 'd3', team: 'defense', pos: { x: 5, y: 5 }, hasBall: false, name: 'D3' }, // Diagonal
  { id: 'd4', team: 'defense', pos: { x: 3, y: 5 }, hasBall: false, name: 'D4' }, // Diagonal
  { id: 'd5', team: 'defense', pos: { x: 2, y: 6 }, hasBall: false, name: 'D5' },
], "Orthogonal passes with diagonal defenders nearby") ? 1 : 0;

// TEST 5: Completely surrounded but has one clear diagonal pass
falsePositives += runTest(5, [
  { id: 'o1', team: 'offense', pos: { x: 4, y: 4 }, hasBall: true, name: 'BC' },
  { id: 'o2', team: 'offense', pos: { x: 5, y: 3 }, hasBall: false, name: 'T1' }, // Only available pass
  { id: 'o3', team: 'offense', pos: { x: 1, y: 6 }, hasBall: false, name: 'T2' },
  { id: 'o4', team: 'offense', pos: { x: 7, y: 6 }, hasBall: false, name: 'T3' },
  { id: 'o5', team: 'offense', pos: { x: 4, y: 7 }, hasBall: false, name: 'T4' },
  { id: 'd1', team: 'defense', pos: { x: 5, y: 4 }, hasBall: false, name: 'D1' }, // Right
  { id: 'd2', team: 'defense', pos: { x: 3, y: 4 }, hasBall: false, name: 'D2' }, // Left
  { id: 'd3', team: 'defense', pos: { x: 4, y: 5 }, hasBall: false, name: 'D3' }, // Below
  // Note: (4,3) is empty and (5,3) has teammate - diagonal should be blocked by d1
  { id: 'd4', team: 'defense', pos: { x: 2, y: 5 }, hasBall: false, name: 'D4' },
  { id: 'd5', team: 'defense', pos: { x: 6, y: 5 }, hasBall: false, name: 'D5' },
], "Surrounded with one diagonal escape attempt") ? 1 : 0;

console.log('\n\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║                         FINAL REPORT                              ║');
console.log('╚════════════════════════════════════════════════════════════════════╝');
console.log(`\nFalse Positives Found: ${falsePositives}/5`);

if (falsePositives === 0) {
  console.log('\n✓ All diagonal pass blocking logic working correctly!');
} else {
  console.log(`\n🚨 Found ${falsePositives} false positive(s) in diagonal pass logic!`);
}
console.log('\n');
