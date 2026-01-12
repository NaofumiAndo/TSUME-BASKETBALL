// Test the fixed passing logic

const isPosEqual = (a, b) => a.x === b.x && a.y === b.y;
const getDistance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const isAdjacent = (a, b) => getDistance(a, b) === 1;

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

  // For adjacent passes, only block if defender at target (already checked above)
  if (isAdjacent(from.pos, to.pos)) {
    return true;
  }

  // For longer passes, check entire path
  return isPathClear(from.pos, to.pos, players);
};

// Test case: Pass from Visual (5,4) to (4,3)
console.log('TEST: Pass from Visual (5,4) to Visual (4,3)');
console.log('=' .repeat(60));

const from = {
  pos: { x: 4, y: 3 }, // Internal (4,3)
  team: 'offense',
  hasBall: true
};

const to = {
  pos: { x: 3, y: 2 }, // Internal (3,2)
  team: 'offense'
};

const defenders = [
  { pos: { x: 2, y: 1 }, team: 'defense' }, // Visual (3,2)
  { pos: { x: 4, y: 2 }, team: 'defense' }, // Visual (5,3) - was blocking before
  { pos: { x: 4, y: 4 }, team: 'defense' }  // Visual (5,5)
];

const players = [from, to, ...defenders];

const result = canPassToTeammate(from, to, players);

console.log('From:', from.pos, '→ Visual', { x: from.pos.x + 1, y: from.pos.y + 1 });
console.log('To:', to.pos, '→ Visual', { x: to.pos.x + 1, y: to.pos.y + 1 });
console.log('Distance:', getDistance(from.pos, to.pos), '(Adjacent:', isAdjacent(from.pos, to.pos) + ')');
console.log('');
console.log('Defenders:');
defenders.forEach(d => {
  console.log('  Internal', d.pos, '→ Visual', { x: d.pos.x + 1, y: d.pos.y + 1 });
});
console.log('');
console.log('Result:', result ? '✅ PASS ALLOWED' : '❌ PASS BLOCKED');
console.log('');

// Additional test cases
console.log('ADDITIONAL TEST CASES:');
console.log('=' .repeat(60));

const testCases = [
  {
    name: 'Adjacent horizontal pass (no defender)',
    from: { pos: { x: 4, y: 3 } },
    to: { pos: { x: 5, y: 3 } },
    defenders: [],
    expected: true
  },
  {
    name: 'Adjacent horizontal pass (defender at target)',
    from: { pos: { x: 4, y: 3 } },
    to: { pos: { x: 5, y: 3 } },
    defenders: [{ pos: { x: 5, y: 3 }, team: 'defense' }],
    expected: false
  },
  {
    name: 'Longer diagonal pass (defender in path)',
    from: { pos: { x: 2, y: 2 } },
    to: { pos: { x: 5, y: 5 } },
    defenders: [{ pos: { x: 3, y: 3 }, team: 'defense' }],
    expected: false
  },
  {
    name: 'Longer diagonal pass (clear path)',
    from: { pos: { x: 2, y: 2 } },
    to: { pos: { x: 5, y: 5 } },
    defenders: [{ pos: { x: 3, y: 4 }, team: 'defense' }],
    expected: true
  }
];

testCases.forEach((test, i) => {
  const testFrom = { pos: test.from.pos, team: 'offense' };
  const testTo = { pos: test.to.pos, team: 'offense' };
  const testPlayers = [testFrom, testTo, ...test.defenders];
  const testResult = canPassToTeammate(testFrom, testTo, testPlayers);

  console.log(`${i + 1}. ${test.name}`);
  console.log(`   Result: ${testResult ? '✅ ALLOWED' : '❌ BLOCKED'} (Expected: ${test.expected ? 'ALLOWED' : 'BLOCKED'})`);
  if (testResult === test.expected) {
    console.log('   ✅ TEST PASSED');
  } else {
    console.log('   ❌ TEST FAILED');
  }
  console.log('');
});
