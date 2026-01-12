// Test script to validate LOCKED UP detection across 10 game streaks

const GRID_SIZE = 9;
const BASKET_POS = { x: 4, y: 1 };
const PAINT_BOUNDS = { xMin: 3, xMax: 5, yMin: 1, yMax: 3 };

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

// Helper functions
const isPosEqual = (a, b) => a.x === b.x && a.y === b.y;

const getDistance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const getManhattanDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const isAdjacent = (a, b) => getDistance(a, b) === 1;

const isOrthogonalAdjacent = (a, b) => getManhattanDistance(a, b) === 1;

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

  const dist = getDistance(player.pos, BASKET_POS);
  const isOnArc = isPartOfThreePointArc(player.pos);
  const defenders = players.filter(p => p.team === 'defense');
  const adjacentDefenders = defenders.filter(d => getDistance(player.pos, d.pos) <= 1);

  // 3PT shots ONLY from white arc line
  if (isOnArc) {
    if (adjacentDefenders.length > 0) {
      return { success: false, reason: "Contested 3PT!", pts: 0, type: "" };
    }
    if (!THREE_POINT_LINE.some(arcPos => arcPos.x === player.pos.x && arcPos.y === player.pos.y)) {
      return { success: false, reason: "Not on arc line!", pts: 0, type: "" };
    }
    return { success: true, pts: 3, type: "3-Pointer" };
  }

  // Slam dunk at basket position
  if (isPosEqual(player.pos, BASKET_POS)) {
    return { success: true, pts: 2, type: "Slam Dunk" };
  }

  // Layup ONLY from specific positions
  if (isLayupPosition(player.pos)) {
    const basketDefender = defenders.find(d => isPosEqual(d.pos, BASKET_POS) || isAdjacent(d.pos, BASKET_POS));
    if (basketDefender) {
      return { success: false, reason: "Rim Protected!", pts: 0, type: "" };
    }
    return { success: true, pts: 2, type: "Layup" };
  }

  return { success: false, reason: "Too far! Move to arc or attack the rim!", pts: 0, type: "" };
};

// Generate random scenario
const generateRandomScenario = () => {
  const occupied = new Set();
  const players = [];

  const addPlayer = (team, role, id) => {
    let pos;
    let attempts = 0;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      attempts++;
      if (attempts > 100) return null;
    } while (occupied.has(`${pos.x},${pos.y}`) || isPosEqual(pos, BASKET_POS));

    occupied.add(`${pos.x},${pos.y}`);
    return { id, team, role, pos, hasBall: false, name: id };
  };

  // Add offense
  const pg = addPlayer('offense', 'PG', 'PG');
  if (!pg) return null;
  pg.hasBall = true;
  players.push(pg);

  ['SG', 'SF', 'PF', 'C'].forEach((role, i) => {
    const p = addPlayer('offense', role, role);
    if (p) players.push(p);
  });

  // Add defense
  ['D1', 'D2', 'D3', 'D4', 'D5'].forEach(id => {
    const p = addPlayer('defense', 'DEF', id);
    if (p) players.push(p);
  });

  return players;
};

// Main test
console.log('🏀 TESTING LOCKED UP DETECTION - 10 STREAKS\n');
console.log('='.repeat(70));

let falsePositives = 0;
let totalTests = 0;

for (let streak = 1; streak <= 10; streak++) {
  console.log(`\n📊 STREAK ${streak}:`);

  const players = generateRandomScenario();
  if (!players) {
    console.log('⚠️  Failed to generate scenario, retrying...');
    streak--;
    continue;
  }

  const ballCarrier = players.find(p => p.hasBall);
  const shotResult = canScore(ballCarrier, players);
  const canPass = players.some(p =>
    p.team === 'offense' &&
    p.id !== ballCarrier.id &&
    canPassToTeammate(ballCarrier, p, players)
  );

  const gameDeclaresLockup = !shotResult.success && !canPass;

  totalTests++;

  console.log(`  Ball Carrier: ${ballCarrier.id} at visual (${ballCarrier.pos.x + 1},${ballCarrier.pos.y + 1})`);
  console.log(`  Can Score: ${shotResult.success ? '✅ YES' : '❌ NO'} ${shotResult.reason ? `(${shotResult.reason})` : shotResult.type || ''}`);
  console.log(`  Can Pass: ${canPass ? '✅ YES' : '❌ NO'}`);

  if (canPass) {
    const passableTeammates = players.filter(p =>
      p.team === 'offense' &&
      p.id !== ballCarrier.id &&
      canPassToTeammate(ballCarrier, p, players)
    );
    console.log(`  Passable Teammates: ${passableTeammates.map(p => `${p.id} at (${p.pos.x+1},${p.pos.y+1})`).join(', ')}`);
  }

  console.log(`  Game declares: ${gameDeclaresLockup ? '🔒 LOCKED UP' : '✅ CAN CONTINUE'}`);

  // Check for false positive
  if (gameDeclaresLockup && (shotResult.success || canPass)) {
    console.log(`  ⚠️⚠️⚠️ FALSE POSITIVE DETECTED! ⚠️⚠️⚠️`);
    console.log(`  Game says locked but player has moves!`);
    falsePositives++;
  }
}

console.log('\n' + '='.repeat(70));
console.log(`\n📈 RESULTS:`);
console.log(`  Total Tests: ${totalTests}`);
console.log(`  False Positives: ${falsePositives}`);
console.log(`  Accuracy: ${((totalTests - falsePositives) / totalTests * 100).toFixed(1)}%`);

if (falsePositives === 0) {
  console.log(`\n✅ ALL TESTS PASSED! No false lockup detections found.`);
} else {
  console.log(`\n❌ BUGS FOUND! ${falsePositives} false lockup detection(s).`);
}
