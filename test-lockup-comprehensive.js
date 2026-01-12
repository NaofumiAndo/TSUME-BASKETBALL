/**
 * Comprehensive Lockup Detection Test
 * Runs 50+ random scenarios looking for any false positives
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
  if (players.some(p => p.team === 'defense' && isPosEqual(p.pos, to.pos))) {
    return false;
  }
  if (isAdjacent(from.pos, to.pos)) {
    const dx = to.pos.x - from.pos.x;
    const dy = to.pos.y - from.pos.y;
    if (dx !== 0 && dy !== 0) {
      const pos1 = { x: from.pos.x + dx, y: from.pos.y };
      const pos2 = { x: from.pos.x, y: from.pos.y + dy };
      if (players.some(p => p.team === 'defense' && (isPosEqual(p.pos, pos1) || isPosEqual(p.pos, pos2)))) {
        return false;
      }
    }
    return true;
  }
  return isPathClear(from.pos, to.pos, players);
};

const canScore = (player, players) => {
  if (!player.hasBall) return { success: false, reason: "No ball", pts: 0, type: "" };
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

const generateRandomScenario = () => {
  const occupied = new Set();
  const isOccupied = (pos) => occupied.has(`${pos.x},${pos.y}`) || isPosEqual(pos, BASKET_POS);
  const markOccupied = (pos) => occupied.add(`${pos.x},${pos.y}`);

  const allSquares = [];
  for (let y = 1; y < GRID_SIZE; y++) { // Skip y=0
    for (let x = 0; x < GRID_SIZE; x++) {
      allSquares.push({ x, y });
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
  const shuffled = shuffle(allSquares);
  let idx = 0;

  // Ball carrier
  const bcPos = shuffled[idx++];
  markOccupied(bcPos);
  players.push({ id: 'o1', team: 'offense', pos: bcPos, hasBall: true, name: 'BC' });

  // 4 offense
  for (let i = 2; i <= 5; i++) {
    while (isOccupied(shuffled[idx])) idx++;
    const pos = shuffled[idx++];
    markOccupied(pos);
    players.push({ id: `o${i}`, team: 'offense', pos, hasBall: false, name: `O${i}` });
  }

  // 5 defenders
  for (let i = 1; i <= 5; i++) {
    while (isOccupied(shuffled[idx])) idx++;
    const pos = shuffled[idx++];
    markOccupied(pos);
    players.push({ id: `d${i}`, team: 'defense', pos, hasBall: false, name: `D${i}` });
  }

  return players;
};

const runQuickTest = (testNum, players) => {
  const ballCarrier = players.find(p => p.hasBall);
  const shotResult = canScore(ballCarrier, players);
  const passableTeammates = players.filter(p =>
    p.team === 'offense' &&
    p.id !== ballCarrier.id &&
    canPassToTeammate(ballCarrier, p, players)
  );

  const gameSaysLockedUp = isLockedUp(ballCarrier, players);
  const hasValidMoves = shotResult.success || passableTeammates.length > 0;

  const result = {
    testNum,
    bcPos: ballCarrier.pos,
    gameLocked: gameSaysLockedUp,
    actualMoves: hasValidMoves,
    shotAvailable: shotResult.success,
    passCount: passableTeammates.length,
    falsePositive: gameSaysLockedUp && hasValidMoves
  };

  return result;
};

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║     COMPREHENSIVE LOCKUP DETECTION TEST - 50 RANDOM SCENARIOS     ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

const NUM_TESTS = 50;
const results = [];
let falsePositivesCount = 0;

for (let i = 1; i <= NUM_TESTS; i++) {
  const players = generateRandomScenario();
  const result = runQuickTest(i, players);
  results.push(result);

  if (result.falsePositive) {
    falsePositivesCount++;
    console.log(`\n🚨 FALSE POSITIVE FOUND - Test #${i}`);
    console.log(`Ball carrier at (${result.bcPos.x}, ${result.bcPos.y})`);
    console.log(`Shot available: ${result.shotAvailable}, Pass count: ${result.passCount}`);
    console.log('\nBoard visualization:');
    console.log(visualizeBoard(players));

    // Detailed analysis
    const ballCarrier = players.find(p => p.hasBall);
    const passableTeammates = players.filter(p =>
      p.team === 'offense' &&
      p.id !== ballCarrier.id &&
      canPassToTeammate(ballCarrier, p, players)
    );

    if (passableTeammates.length > 0) {
      console.log('\nPassable teammates:');
      passableTeammates.forEach(t => {
        console.log(`  - ${t.name} at (${t.pos.x}, ${t.pos.y})`);
      });
    }

    const shotResult = canScore(ballCarrier, players);
    if (shotResult.success) {
      console.log(`\nShot available: ${shotResult.type} (+${shotResult.pts} pts)`);
    }
  } else if (i % 10 === 0) {
    process.stdout.write(`Tested ${i}/${NUM_TESTS} scenarios...\r`);
  }
}

console.log(`\n\nCompleted ${NUM_TESTS} tests.                    \n`);

// Statistics
const lockedCount = results.filter(r => r.gameLocked).length;
const actualLockedCount = results.filter(r => !r.actualMoves).length;
const shotOnlyCount = results.filter(r => r.shotAvailable && r.passCount === 0).length;
const passOnlyCount = results.filter(r => !r.shotAvailable && r.passCount > 0).length;
const bothCount = results.filter(r => r.shotAvailable && r.passCount > 0).length;

console.log('═'.repeat(70));
console.log('STATISTICS');
console.log('═'.repeat(70));
console.log(`Total scenarios tested: ${NUM_TESTS}`);
console.log(`Game declared "LOCKED UP": ${lockedCount} (${(lockedCount/NUM_TESTS*100).toFixed(1)}%)`);
console.log(`Actually locked (no moves): ${actualLockedCount} (${(actualLockedCount/NUM_TESTS*100).toFixed(1)}%)`);
console.log('');
console.log('Move availability breakdown:');
console.log(`  - Shot only: ${shotOnlyCount}`);
console.log(`  - Pass only: ${passOnlyCount}`);
console.log(`  - Both shot & pass: ${bothCount}`);
console.log(`  - No moves: ${actualLockedCount}`);
console.log('');
console.log('═'.repeat(70));
console.log('FINAL RESULT');
console.log('═'.repeat(70));
console.log(`False Positives Found: ${falsePositivesCount} / ${NUM_TESTS}`);

if (falsePositivesCount === 0) {
  console.log('\n✓✓✓ NO FALSE POSITIVES DETECTED! ✓✓✓');
  console.log('The lockup detection is working correctly across all test scenarios.');
} else {
  console.log(`\n🚨🚨🚨 FOUND ${falsePositivesCount} FALSE POSITIVE(S)! 🚨🚨🚨`);
  console.log('The game incorrectly declared "LOCKED UP" when valid moves existed.');
}

console.log('\n');
