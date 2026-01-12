// Simulate 10 complete game streaks to test lockup detection

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
    if (players.some(p => p.team === 'defense' && p.pos.x === curX && p.pos.y === curY)) return false;
    curX += stepX;
    curY += stepY;
  }

  if (players.some(p => p.team === 'defense' && p.pos.x === end.x && p.pos.y === end.y)) return false;
  return true;
};

const canPassToTeammate = (from, to, players) => {
  if (players.some(p => p.team === 'defense' && isPosEqual(p.pos, to.pos))) return false;

  if (isAdjacent(from.pos, to.pos)) {
    const dx = to.pos.x - from.pos.x;
    const dy = to.pos.y - from.pos.y;
    if (dx !== 0 && dy !== 0) {
      const pos1 = { x: from.pos.x + dx, y: from.pos.y };
      const pos2 = { x: from.pos.x, y: from.pos.y + dy };
      if (players.some(p => p.team === 'defense' && (isPosEqual(p.pos, pos1) || isPosEqual(p.pos, pos2)))) return false;
    }
    return true;
  }
  return isPathClear(from.pos, to.pos, players);
};

const canScore = (player, players) => {
  if (!player.hasBall) return { success: false, reason: "No ball" };
  const defenders = players.filter(p => p.team === 'defense');
  const adjacentDefenders = defenders.filter(d => getDistance(player.pos, d.pos) <= 1);

  if (isPartOfThreePointArc(player.pos)) {
    if (adjacentDefenders.length > 0) return { success: false, reason: "Contested 3PT!" };
    return { success: true, pts: 3, type: "3-Pointer" };
  }

  if (isPosEqual(player.pos, BASKET_POS)) return { success: true, pts: 2, type: "Slam Dunk" };

  if (isLayupPosition(player.pos)) {
    const basketDefender = defenders.find(d => isPosEqual(d.pos, BASKET_POS) || isAdjacent(d.pos, BASKET_POS));
    if (basketDefender) return { success: false, reason: "Rim Protected!" };
    return { success: true, pts: 2, type: "Layup" };
  }

  return { success: false, reason: "Too far!" };
};

const generateScenario = () => {
  const occupied = new Set();
  occupied.add(`${BASKET_POS.x},${BASKET_POS.y}`);

  const allSquares = [];
  for (let y = 1; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!occupied.has(`${x},${y}`)) allSquares.push({ x, y });
    }
  }

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  shuffle(allSquares);
  const players = [];

  // Place 5 offense
  const offenseRoles = ['PG', 'SG', 'SF', 'PF', 'C'];
  for (let i = 0; i < 5; i++) {
    const pos = allSquares.pop();
    players.push({
      id: `o${i+1}`,
      team: 'offense',
      role: offenseRoles[i],
      pos,
      hasBall: i === 0,
      name: offenseRoles[i]
    });
  }

  // Place 5 defense
  for (let i = 0; i < 5; i++) {
    const pos = allSquares.pop();
    players.push({
      id: `d${i+1}`,
      team: 'defense',
      role: 'D',
      pos,
      hasBall: false,
      name: `D${i+1}`,
      assignedTo: `o${i+1}`
    });
  }

  return players;
};

const aiMove = (players) => {
  const nextPlayers = players.map(p => ({ ...p }));
  const defenders = nextPlayers.filter(p => p.team === 'defense');
  const offense = nextPlayers.filter(p => p.team === 'offense');

  defenders.forEach(defender => {
    const isScreened = offense.some(o => isOrthogonalAdjacent(o.pos, defender.pos));
    if (isScreened) return;

    const moves = [defender.pos];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        if (x === 0 && y === 0) continue;
        const p = { x: defender.pos.x + x, y: defender.pos.y + y };
        if (p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE &&
            !nextPlayers.find(pl => pl.id !== defender.id && isPosEqual(pl.pos, p))) {
          moves.push(p);
        }
      }
    }

    const ballCarrier = offense.find(o => o.hasBall);
    const ideal = {
      x: Math.round((ballCarrier.pos.x + BASKET_POS.x) / 2),
      y: Math.round((ballCarrier.pos.y + BASKET_POS.y) / 2)
    };
    moves.sort((a, b) => getDistance(a, ideal) - getDistance(b, ideal));
    defender.pos = moves[0];
  });

  return nextPlayers;
};

console.log('🏀 SIMULATING 10 COMPLETE GAME STREAKS\n');
console.log('='.repeat(80));

let falsePositives = [];

for (let streak = 1; streak <= 10; streak++) {
  console.log(`\n\n🎮 STREAK ${streak}:`);
  console.log('-'.repeat(80));

  let players = generateScenario();
  let turn = 0;
  let maxTurns = 30;
  let gameOver = false;
  let lockupDetected = false;

  while (!gameOver && turn < maxTurns) {
    turn++;
    const ballCarrier = players.find(p => p.hasBall);
    const shotResult = canScore(ballCarrier, players);
    const teammates = players.filter(p => p.team === 'offense' && p.id !== ballCarrier.id);
    const passableTeammates = teammates.filter(t => canPassToTeammate(ballCarrier, t, players));
    const canPass = passableTeammates.length > 0;

    console.log(`\n  Turn ${turn}: ${ballCarrier.name} at visual (${ballCarrier.pos.x+1},${ballCarrier.pos.y+1})`);

    // Check lockup condition
    if (!shotResult.success && !canPass) {
      console.log(`    🔒 LOCKED UP DETECTED`);
      console.log(`      ❌ Can't Score: ${shotResult.reason}`);
      console.log(`      ❌ Can't Pass: No passable teammates`);

      // Verify it's a true lockup
      if (shotResult.success) {
        console.log(`    ⚠️⚠️⚠️ FALSE POSITIVE! Can actually score!`);
        falsePositives.push({ streak, turn, reason: 'Can score but declared locked' });
      } else if (canPass) {
        console.log(`    ⚠️⚠️⚠️ FALSE POSITIVE! Can actually pass!`);
        falsePositives.push({ streak, turn, reason: 'Can pass but declared locked' });
      }

      lockupDetected = true;
      gameOver = true;
      break;
    }

    // Try to score
    if (shotResult.success) {
      console.log(`    ✅ SCORED ${shotResult.pts} points! (${shotResult.type})`);
      gameOver = true;
      break;
    }

    // Try to pass or move
    if (canPass && Math.random() > 0.3) {
      const target = passableTeammates[Math.floor(Math.random() * passableTeammates.length)];
      console.log(`    📤 Pass to ${target.name} at (${target.pos.x+1},${target.pos.y+1})`);
      ballCarrier.hasBall = false;
      target.hasBall = true;
    } else {
      // Move randomly
      const moves = [];
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          const newPos = { x: ballCarrier.pos.x + x, y: ballCarrier.pos.y + y };
          if (newPos.x >= 0 && newPos.x < GRID_SIZE && newPos.y >= 0 && newPos.y < GRID_SIZE &&
              !players.some(p => p.id !== ballCarrier.id && isPosEqual(p.pos, newPos))) {
            moves.push(newPos);
          }
        }
      }
      if (moves.length > 0) {
        ballCarrier.pos = moves[Math.floor(Math.random() * moves.length)];
        console.log(`    🏃 Moved to (${ballCarrier.pos.x+1},${ballCarrier.pos.y+1})`);
      }
    }

    // AI defense move
    players = aiMove(players);
  }

  if (!lockupDetected && turn >= maxTurns) {
    console.log(`\n  ⏰ Game ended by turn limit (${maxTurns} turns)`);
  }
}

console.log('\n\n' + '='.repeat(80));
console.log(`\n📊 FINAL RESULTS:`);
console.log(`  Streaks Simulated: 10`);
console.log(`  False Lockup Detections: ${falsePositives.length}`);

if (falsePositives.length > 0) {
  console.log(`\n❌ FALSE POSITIVES FOUND:`);
  falsePositives.forEach((fp, i) => {
    console.log(`  ${i+1}. Streak ${fp.streak}, Turn ${fp.turn}: ${fp.reason}`);
  });
} else {
  console.log(`\n✅ ALL TESTS PASSED! No false lockup detections.`);
}
