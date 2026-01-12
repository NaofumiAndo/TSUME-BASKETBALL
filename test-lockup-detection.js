/**
 * Test Script: Tsume Basketball Lockup Detection False Positives
 *
 * This script tests for cases where the game declares "LOCKED UP" but the player
 * actually still has valid moves (passes or shots).
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

// ==================== UTILITY FUNCTIONS ====================

const isPosEqual = (a, b) => a.x === b.x && a.y === b.y;

const getDistance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const getManhattanDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const isAdjacent = (a, b) => getDistance(a, b) === 1;

const isPartOfThreePointArc = (pos) => {
  return THREE_POINT_LINE.some(linePos => isPosEqual(linePos, pos));
};

const isLayupPosition = (pos) => {
  return LAYUP_POSITIONS.some(layupPos => isPosEqual(layupPos, pos));
};

const getPlayerAt = (pos, players) => {
  return players.find(p => isPosEqual(p.pos, pos));
};

// ==================== SCORING LOGIC ====================

const canScore = (player, players) => {
  if (!player.hasBall) return { success: false, reason: "No ball", pts: 0, type: "" };

  const dist = getDistance(player.pos, BASKET_POS);
  const isOnArc = isPartOfThreePointArc(player.pos);
  const defenders = players.filter(p => p.team === 'defense');
  const adjacentDefenders = defenders.filter(d => getDistance(player.pos, d.pos) <= 1);

  // 3PT from arc line
  if (isOnArc) {
    if (adjacentDefenders.length > 0) {
      return { success: false, reason: "Contested 3PT!", pts: 0, type: "" };
    }
    if (!THREE_POINT_LINE.some(arcPos => arcPos.x === player.pos.x && arcPos.y === player.pos.y)) {
      return { success: false, reason: "Not on arc line!", pts: 0, type: "" };
    }
    return { success: true, pts: 3, type: "3-Pointer" };
  }

  // Slam dunk at basket
  if (isPosEqual(player.pos, BASKET_POS)) {
    return { success: true, pts: 2, type: "Slam Dunk" };
  }

  // Layup from specific positions
  if (isLayupPosition(player.pos)) {
    const basketDefender = defenders.find(d => isPosEqual(d.pos, BASKET_POS) || isAdjacent(d.pos, BASKET_POS));
    if (basketDefender) {
      return { success: false, reason: "Rim Protected!", pts: 0, type: "" };
    }
    return { success: true, pts: 2, type: "Layup" };
  }

  return { success: false, reason: "Too far! Move to arc or attack the rim!", pts: 0, type: "" };
};

// ==================== PASSING LOGIC ====================

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
  // Check if target position has a defender
  if (players.some(p => p.team === 'defense' && isPosEqual(p.pos, to.pos))) {
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

      // Block if either orthogonal position has a defender
      if (players.some(p => p.team === 'defense' && (isPosEqual(p.pos, pos1) || isPosEqual(p.pos, pos2)))) {
        return false;
      }
    }
    return true;
  }

  // For longer passes, check entire path
  return isPathClear(from.pos, to.pos, players);
};

// ==================== LOCKUP DETECTION (from App.tsx lines 106-111) ====================

const isLockedUp = (ballCarrier, players) => {
  const shotResult = canScore(ballCarrier, players);
  const canPass = players.some(p =>
    p.team === 'offense' &&
    p.id !== ballCarrier.id &&
    canPassToTeammate(ballCarrier, p, players)
  );

  return !shotResult.success && !canPass;
};

// ==================== TEST SCENARIO GENERATOR ====================

const generateRandomScenario = (testNum) => {
  const occupied = new Set();
  const isOccupied = (pos) => occupied.has(`${pos.x},${pos.y}`) || isPosEqual(pos, BASKET_POS);
  const markOccupied = (pos) => occupied.add(`${pos.x},${pos.y}`);

  const allSquares = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (y !== 0) allSquares.push({ x, y }); // Exclude top row
    }
  }

  const shuffle = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const players = [];

  // Place ball carrier randomly
  const ballCarrierPos = shuffle(allSquares)[0];
  markOccupied(ballCarrierPos);
  players.push({ id: 'o1', team: 'offense', role: 'PG', pos: ballCarrierPos, hasBall: true, name: 'PG' });

  // Place 4 other offense players
  const availableSquares = shuffle(allSquares.filter(p => !isOccupied(p)));
  for (let i = 2; i <= 5; i++) {
    const pos = availableSquares.shift();
    markOccupied(pos);
    players.push({ id: `o${i}`, team: 'offense', role: 'SG', pos, hasBall: false, name: `O${i}` });
  }

  // Place 5 defenders
  const defenderSquares = shuffle(allSquares.filter(p => !isOccupied(p)));
  for (let i = 1; i <= 5; i++) {
    const pos = defenderSquares.shift();
    markOccupied(pos);
    players.push({ id: `d${i}`, team: 'defense', role: 'PG', pos, hasBall: false, name: `D${i}` });
  }

  return players;
};

// ==================== EDGE CASE SCENARIOS ====================

const edgeCaseScenarios = [
  {
    name: "Adjacent Teammate - Orthogonal",
    description: "Ball carrier has teammate directly adjacent (up/down/left/right), no defenders blocking",
    players: [
      { id: 'o1', team: 'offense', role: 'PG', pos: { x: 4, y: 4 }, hasBall: true, name: 'PG' },
      { id: 'o2', team: 'offense', role: 'SG', pos: { x: 5, y: 4 }, hasBall: false, name: 'SG' }, // Right adjacent
      { id: 'o3', team: 'offense', role: 'SF', pos: { x: 2, y: 6 }, hasBall: false, name: 'SF' },
      { id: 'o4', team: 'offense', role: 'PF', pos: { x: 6, y: 6 }, hasBall: false, name: 'PF' },
      { id: 'o5', team: 'offense', role: 'C', pos: { x: 4, y: 7 }, hasBall: false, name: 'C' },
      { id: 'd1', team: 'defense', role: 'PG', pos: { x: 4, y: 3 }, hasBall: false, name: 'D1' }, // Below BC
      { id: 'd2', team: 'defense', role: 'SG', pos: { x: 3, y: 4 }, hasBall: false, name: 'D2' }, // Left of BC
      { id: 'd3', team: 'defense', role: 'SF', pos: { x: 2, y: 5 }, hasBall: false, name: 'D3' },
      { id: 'd4', team: 'defense', role: 'PF', pos: { x: 6, y: 5 }, hasBall: false, name: 'D4' },
      { id: 'd5', team: 'defense', role: 'C', pos: { x: 4, y: 5 }, hasBall: false, name: 'D5' }, // Above BC
    ]
  },
  {
    name: "Diagonal Pass - No Orthogonal Blockers",
    description: "Ball carrier can pass diagonally to teammate, orthogonal squares are empty",
    players: [
      { id: 'o1', team: 'offense', role: 'PG', pos: { x: 4, y: 4 }, hasBall: true, name: 'PG' },
      { id: 'o2', team: 'offense', role: 'SG', pos: { x: 5, y: 3 }, hasBall: false, name: 'SG' }, // Diagonal
      { id: 'o3', team: 'offense', role: 'SF', pos: { x: 2, y: 6 }, hasBall: false, name: 'SF' },
      { id: 'o4', team: 'offense', role: 'PF', pos: { x: 6, y: 6 }, hasBall: false, name: 'PF' },
      { id: 'o5', team: 'offense', role: 'C', pos: { x: 4, y: 7 }, hasBall: false, name: 'C' },
      { id: 'd1', team: 'defense', role: 'PG', pos: { x: 3, y: 3 }, hasBall: false, name: 'D1' },
      { id: 'd2', team: 'defense', role: 'SG', pos: { x: 6, y: 4 }, hasBall: false, name: 'D2' },
      { id: 'd3', team: 'defense', role: 'SF', pos: { x: 2, y: 5 }, hasBall: false, name: 'D3' },
      { id: 'd4', team: 'defense', role: 'PF', pos: { x: 7, y: 5 }, hasBall: false, name: 'D4' },
      { id: 'd5', team: 'defense', role: 'C', pos: { x: 4, y: 6 }, hasBall: false, name: 'D5' },
    ]
  },
  {
    name: "Scoring Position - On Arc, No Adjacent Defenders",
    description: "Ball carrier is on 3pt arc with no adjacent defenders - should be able to shoot",
    players: [
      { id: 'o1', team: 'offense', role: 'PG', pos: { x: 4, y: 5 }, hasBall: true, name: 'PG' }, // On arc
      { id: 'o2', team: 'offense', role: 'SG', pos: { x: 1, y: 6 }, hasBall: false, name: 'SG' },
      { id: 'o3', team: 'offense', role: 'SF', pos: { x: 7, y: 6 }, hasBall: false, name: 'SF' },
      { id: 'o4', team: 'offense', role: 'PF', pos: { x: 3, y: 7 }, hasBall: false, name: 'PF' },
      { id: 'o5', team: 'offense', role: 'C', pos: { x: 5, y: 7 }, hasBall: false, name: 'C' },
      { id: 'd1', team: 'defense', role: 'PG', pos: { x: 4, y: 3 }, hasBall: false, name: 'D1' }, // Not adjacent
      { id: 'd2', team: 'defense', role: 'SG', pos: { x: 2, y: 5 }, hasBall: false, name: 'D2' }, // Not adjacent (arc pos)
      { id: 'd3', team: 'defense', role: 'SF', pos: { x: 6, y: 5 }, hasBall: false, name: 'D3' }, // Not adjacent (arc pos)
      { id: 'd4', team: 'defense', role: 'PF', pos: { x: 3, y: 4 }, hasBall: false, name: 'D4' },
      { id: 'd5', team: 'defense', role: 'C', pos: { x: 5, y: 4 }, hasBall: false, name: 'D5' },
    ]
  },
  {
    name: "Layup Position - Rim Clear",
    description: "Ball carrier is on layup position with no rim protection",
    players: [
      { id: 'o1', team: 'offense', role: 'PG', pos: { x: 3, y: 2 }, hasBall: true, name: 'PG' }, // Layup pos
      { id: 'o2', team: 'offense', role: 'SG', pos: { x: 1, y: 6 }, hasBall: false, name: 'SG' },
      { id: 'o3', team: 'offense', role: 'SF', pos: { x: 7, y: 6 }, hasBall: false, name: 'SF' },
      { id: 'o4', team: 'offense', role: 'PF', pos: { x: 2, y: 7 }, hasBall: false, name: 'PF' },
      { id: 'o5', team: 'offense', role: 'C', pos: { x: 6, y: 7 }, hasBall: false, name: 'C' },
      { id: 'd1', team: 'defense', role: 'PG', pos: { x: 3, y: 4 }, hasBall: false, name: 'D1' },
      { id: 'd2', team: 'defense', role: 'SG', pos: { x: 2, y: 5 }, hasBall: false, name: 'D2' },
      { id: 'd3', team: 'defense', role: 'SF', pos: { x: 6, y: 5 }, hasBall: false, name: 'D3' },
      { id: 'd4', team: 'defense', role: 'PF', pos: { x: 1, y: 3 }, hasBall: false, name: 'D4' },
      { id: 'd5', team: 'defense', role: 'C', pos: { x: 7, y: 3 }, hasBall: false, name: 'D5' }, // Not at rim
    ]
  },
  {
    name: "Long Straight Pass Available",
    description: "Ball carrier has clear straight-line pass to distant teammate",
    players: [
      { id: 'o1', team: 'offense', role: 'PG', pos: { x: 4, y: 7 }, hasBall: true, name: 'PG' },
      { id: 'o2', team: 'offense', role: 'SG', pos: { x: 4, y: 3 }, hasBall: false, name: 'SG' }, // Straight down
      { id: 'o3', team: 'offense', role: 'SF', pos: { x: 1, y: 6 }, hasBall: false, name: 'SF' },
      { id: 'o4', team: 'offense', role: 'PF', pos: { x: 7, y: 6 }, hasBall: false, name: 'PF' },
      { id: 'o5', team: 'offense', role: 'C', pos: { x: 2, y: 2 }, hasBall: false, name: 'C' },
      { id: 'd1', team: 'defense', role: 'PG', pos: { x: 3, y: 7 }, hasBall: false, name: 'D1' },
      { id: 'd2', team: 'defense', role: 'SG', pos: { x: 5, y: 7 }, hasBall: false, name: 'D2' },
      { id: 'd3', team: 'defense', role: 'SF', pos: { x: 3, y: 5 }, hasBall: false, name: 'D3' }, // Not blocking path
      { id: 'd4', team: 'defense', role: 'PF', pos: { x: 5, y: 5 }, hasBall: false, name: 'D4' }, // Not blocking path
      { id: 'd5', team: 'defense', role: 'C', pos: { x: 3, y: 3 }, hasBall: false, name: 'D5' },
    ]
  }
];

// ==================== TEST RUNNER ====================

const visualizeBoard = (players) => {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('·'));

  // Mark basket
  grid[BASKET_POS.y][BASKET_POS.x] = '🏀';

  // Mark players
  players.forEach(p => {
    if (p.hasBall) {
      grid[p.pos.y][p.pos.x] = '⭐'; // Ball carrier
    } else if (p.team === 'offense') {
      grid[p.pos.y][p.pos.x] = 'O';
    } else {
      grid[p.pos.y][p.pos.x] = 'X';
    }
  });

  return grid.map((row, y) => `  ${y}: ${row.join(' ')}`).join('\n');
};

const runTest = (testNum, players, scenarioName = null) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST ${testNum}${scenarioName ? ': ' + scenarioName : ''}`);
  console.log('='.repeat(70));

  const ballCarrier = players.find(p => p.hasBall);
  if (!ballCarrier) {
    console.log('ERROR: No ball carrier found!');
    return false;
  }

  console.log(`\nBall Carrier: ${ballCarrier.name} at (${ballCarrier.pos.x}, ${ballCarrier.pos.y})`);
  console.log('\nBoard State:');
  console.log(visualizeBoard(players));

  // Check game's lockup detection
  const gameSaysLockedUp = isLockedUp(ballCarrier, players);

  // Manual verification - check if shot is possible
  const shotResult = canScore(ballCarrier, players);

  // Manual verification - find all passable teammates
  const passableTeammates = players.filter(p =>
    p.team === 'offense' &&
    p.id !== ballCarrier.id &&
    canPassToTeammate(ballCarrier, p, players)
  );

  console.log('\n--- ANALYSIS ---');
  console.log(`\nShot Available: ${shotResult.success ? 'YES' : 'NO'}`);
  if (shotResult.success) {
    console.log(`  Type: ${shotResult.type} (+${shotResult.pts} pts)`);
  } else {
    console.log(`  Reason: ${shotResult.reason}`);
  }

  console.log(`\nPassable Teammates: ${passableTeammates.length}`);
  if (passableTeammates.length > 0) {
    passableTeammates.forEach(t => {
      console.log(`  - ${t.name} at (${t.pos.x}, ${t.pos.y})`);

      // Detailed pass analysis
      const dx = t.pos.x - ballCarrier.pos.x;
      const dy = t.pos.y - ballCarrier.pos.y;
      const isDiag = dx !== 0 && dy !== 0;
      const isAdj = isAdjacent(ballCarrier.pos, t.pos);

      if (isAdj && isDiag) {
        const pos1 = { x: ballCarrier.pos.x + dx, y: ballCarrier.pos.y };
        const pos2 = { x: ballCarrier.pos.x, y: ballCarrier.pos.y + dy };
        console.log(`    (Diagonal adjacent pass - orthogonal squares: (${pos1.x},${pos1.y}) and (${pos2.x},${pos2.y}))`);
      }
    });
  }

  const hasValidMoves = shotResult.success || passableTeammates.length > 0;

  console.log(`\nGame Says Locked Up: ${gameSaysLockedUp ? 'YES' : 'NO'}`);
  console.log(`Actually Has Valid Moves: ${hasValidMoves ? 'YES' : 'NO'}`);

  // Detect false positive
  if (gameSaysLockedUp && hasValidMoves) {
    console.log('\n🚨 FALSE POSITIVE DETECTED! 🚨');
    console.log('Game declared LOCKED UP but player has valid moves!');
    return true; // Found a bug
  } else if (!gameSaysLockedUp && !hasValidMoves) {
    console.log('\n⚠️  POTENTIAL FALSE NEGATIVE: Game says not locked but no valid moves found');
  } else {
    console.log('\n✓ Lockup detection correct for this scenario');
  }

  return false;
};

// ==================== MAIN TEST EXECUTION ====================

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║         TSUME BASKETBALL - LOCKUP DETECTION TEST SUITE           ║');
console.log('╚════════════════════════════════════════════════════════════════════╝');
console.log('\nTesting for false positives where game declares "LOCKED UP"');
console.log('but the player actually still has valid moves...\n');

let falsePositivesFound = 0;
let testsRun = 0;

// Run edge case scenarios first
console.log('\n\n');
console.log('█'.repeat(70));
console.log(' PART 1: EDGE CASE SCENARIOS');
console.log('█'.repeat(70));

edgeCaseScenarios.forEach((scenario, idx) => {
  testsRun++;
  const foundBug = runTest(testsRun, scenario.players, scenario.name);
  if (foundBug) falsePositivesFound++;
  console.log(`\nDescription: ${scenario.description}`);
});

// Run random scenarios
console.log('\n\n');
console.log('█'.repeat(70));
console.log(' PART 2: RANDOM SCENARIOS');
console.log('█'.repeat(70));

const randomTestCount = 5;
for (let i = 0; i < randomTestCount; i++) {
  testsRun++;
  const players = generateRandomScenario(testsRun);
  const foundBug = runTest(testsRun, players, 'Random Scenario');
  if (foundBug) falsePositivesFound++;
}

// Final report
console.log('\n\n');
console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║                         FINAL REPORT                              ║');
console.log('╚════════════════════════════════════════════════════════════════════╝');
console.log(`\nTotal Tests Run: ${testsRun}`);
console.log(`False Positives Found: ${falsePositivesFound}`);

if (falsePositivesFound === 0) {
  console.log('\n✓ NO FALSE POSITIVES DETECTED!');
  console.log('  The lockup detection appears to be working correctly.');
} else {
  console.log(`\n🚨 FOUND ${falsePositivesFound} FALSE POSITIVE(S)!`);
  console.log('  The game incorrectly declared "LOCKED UP" when valid moves existed.');
}

console.log('\n');
