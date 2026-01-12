console.log('Analyzing pass from Visual (5,4) to Visual (4,3)');
console.log('');

const from_visual = { x: 5, y: 4 };
const to_visual = { x: 4, y: 3 };
const from = { x: from_visual.x - 1, y: from_visual.y - 1 };
const to = { x: to_visual.x - 1, y: to_visual.y - 1 };

console.log('Internal coordinates:');
console.log('  From:', from);
console.log('  To:', to);
console.log('');

const dx = to.x - from.x;
const dy = to.y - from.y;
console.log('Delta:', { dx, dy });
const isDiagonal = dx !== 0 && dy !== 0;
console.log('Is diagonal?', isDiagonal);
console.log('');

if (isDiagonal) {
  const pos1 = { x: from.x + dx, y: from.y };
  const pos2 = { x: from.x, y: from.y + dy };

  console.log('Orthogonal positions checked:');
  console.log('  pos1 (horizontal first):', pos1, '→ Visual', { x: pos1.x + 1, y: pos1.y + 1 });
  console.log('  pos2 (vertical first):', pos2, '→ Visual', { x: pos2.x + 1, y: pos2.y + 1 });
  console.log('');

  const defenders = [
    { visual: { x: 3, y: 2 }, internal: { x: 2, y: 1 } },
    { visual: { x: 5, y: 3 }, internal: { x: 4, y: 2 } },
    { visual: { x: 5, y: 5 }, internal: { x: 4, y: 4 } }
  ];

  console.log('Defenders:');
  defenders.forEach(d => {
    console.log(`  Visual (${d.visual.x},${d.visual.y}) → Internal (${d.internal.x},${d.internal.y})`);
    const blocksPos1 = d.internal.x === pos1.x && d.internal.y === pos1.y;
    const blocksPos2 = d.internal.x === pos2.x && d.internal.y === pos2.y;
    if (blocksPos1) {
      console.log('    ⚠️ BLOCKS pos1 - THE PASS IS BLOCKED!');
    }
    if (blocksPos2) {
      console.log('    ⚠️ BLOCKS pos2 - THE PASS IS BLOCKED!');
    }
  });

  console.log('');
  console.log('CONCLUSION: Pass should be BLOCKED if any defender at pos1 or pos2');
}
