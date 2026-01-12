
import { Position, Player, StrategyType } from '../types';
import { BASKET_POS, GRID_SIZE, THREE_POINT_LINE, PAINT_BOUNDS, LAYUP_POSITIONS } from '../constants';

export const isPosEqual = (a: Position, b: Position) => a.x === b.x && a.y === b.y;

/** Chebyshev distance: Includes diagonals */
export const getDistance = (a: Position, b: Position) => {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
};

/** Manhattan distance: Only horizontal/vertical neighbors */
export const getManhattanDistance = (a: Position, b: Position) => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

export const isAdjacent = (a: Position, b: Position) => {
  return getDistance(a, b) === 1;
};

export const isOrthogonalAdjacent = (a: Position, b: Position) => {
  return getManhattanDistance(a, b) === 1;
};

export const isThreePointArea = (pos: Position) => {
  if (isPartOfThreePointArc(pos)) return true;
  if (pos.y > 5) return true;
  if (pos.y >= 1 && pos.y <= 4 && (pos.x < 1 || pos.x > 7)) return true;
  return false;
};

export const isPartOfThreePointArc = (pos: Position) => {
  return THREE_POINT_LINE.some(linePos => isPosEqual(linePos, pos));
};

export const isLayupPosition = (pos: Position) => {
  return LAYUP_POSITIONS.some(layupPos => isPosEqual(layupPos, pos));
};

export const isInPaint = (pos: Position) => {
  return (
    pos.x >= PAINT_BOUNDS.xMin &&
    pos.x <= PAINT_BOUNDS.xMax &&
    pos.y >= PAINT_BOUNDS.yMin &&
    pos.y <= PAINT_BOUNDS.yMax
  );
};

export const getPlayerAt = (pos: Position, players: Player[]) => {
  return players.find(p => isPosEqual(p.pos, pos));
};

export const isValidMove = (player: Player, target: Position, players: Player[]) => {
  if (target.x < 0 || target.x >= GRID_SIZE || target.y < 0 || target.y >= GRID_SIZE) return false;
  // Block visual row 1 (internal y=0) for all players
  if (target.y === 0) return false;
  const dist = getDistance(player.pos, target);
  if (dist > 1) return false;
  if (dist === 1 && getPlayerAt(target, players)) return false;
  return true;
};

export const isPathClear = (start: Position, end: Position, players: Player[]) => {
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

export const canPassToTeammate = (from: Player, to: Player, players: Player[]) => {
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
      const pos1 = { x: from.pos.x + dx, y: from.pos.y }; // Horizontal first
      const pos2 = { x: from.pos.x, y: from.pos.y + dy }; // Vertical first

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

export const generateTacticalScenario = (): Player[] => {
  const occupied = new Set<string>();
  const isOccupied = (pos: Position) => occupied.has(`${pos.x},${pos.y}`) || isPosEqual(pos, BASKET_POS);
  const markOccupied = (pos: Position) => occupied.add(`${pos.x},${pos.y}`);

  const allSquares: Position[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      allSquares.push({ x, y });
    }
  }

  const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Filter out the very top row (y=0) for all pools
  const playableSquares = allSquares.filter(p => p.y !== 0);

  const pgPositions = shuffle(playableSquares.filter(p => p.y === 7));
  
  // Pool for other offense players: SG, SF, PF, C must be y < 7 (ahead of PG)
  const insideOffensePool = shuffle(playableSquares.filter(p => !isThreePointArea(p) && p.y < 7));
  const outsideOffensePool = shuffle(playableSquares.filter(p => isThreePointArea(p) && p.y < 7));
  
  const defenderAllowedPositions = shuffle(playableSquares.filter(p => !isThreePointArea(p) || isPartOfThreePointArc(p)));

  const players: Player[] = [];
  
  const isTeammateAdjacent = (pos: Position, team: 'offense' | 'defense') => {
    return players.some(p => p.team === team && isAdjacent(p.pos, pos));
  };

  // 1. Place PG (Row 7)
  const pgPos = pgPositions.find(p => !isOccupied(p))!;
  markOccupied(pgPos);
  players.push({ id: 'o1', team: 'offense', role: 'PG', pos: pgPos, hasBall: true, name: 'PG' });

  // 2. Place 2 Offense Outside (or on Arc), y < 7
  const offenseOutsideConfigs = [
    { id: 'o2', role: 'SG', name: 'SG' },
    { id: 'o3', role: 'SF', name: 'SF' },
  ] as const;
  
  offenseOutsideConfigs.forEach(config => {
    const pos = outsideOffensePool.find(p => !isOccupied(p) && !isTeammateAdjacent(p, 'offense')) || outsideOffensePool.find(p => !isOccupied(p))!;
    markOccupied(pos);
    players.push({ ...config, team: 'offense', pos, hasBall: false });
  });

  // 3. Place 2 Offense Inside, y < 7
  const offenseInsideConfigs = [
    { id: 'o4', role: 'PF', name: 'PF' },
    { id: 'o5', role: 'C', name: 'C' },
  ] as const;

  offenseInsideConfigs.forEach(config => {
    const pos = insideOffensePool.find(p => !isOccupied(p) && !isTeammateAdjacent(p, 'offense')) || insideOffensePool.find(p => !isOccupied(p))!;
    markOccupied(pos);
    players.push({ ...config, team: 'offense', pos, hasBall: false });
  });

  // 4. Place 5 Defenders (Inside or On Arc)
  const offenseIds = ['o1', 'o2', 'o3', 'o4', 'o5'];
  offenseIds.forEach((oId, idx) => {
    const pos = defenderAllowedPositions.find(p => !isOccupied(p) && !isTeammateAdjacent(p, 'defense')) || defenderAllowedPositions.find(p => !isOccupied(p))!;
    markOccupied(pos);
    players.push({
      id: `d${idx + 1}`,
      team: 'defense',
      role: players.find(p => p.id === oId)!.role,
      pos,
      hasBall: false,
      name: `D${idx + 1}`,
      assignedTo: oId
    });
  });

  return players;
};

export const aiOptimalWall = (players: Player[], streak: number = 0): Player[] => {
  const nextPlayers = players.map(p => ({ ...p }));
  const defenders = nextPlayers.filter(p => p.team === 'defense');
  const offense = nextPlayers.filter(p => p.team === 'offense');
  const ballCarrier = offense.find(p => p.hasBall)!;

  // After streak 5, activate advanced defensive AI: prioritize blocking scoring positions
  const advancedDefense = streak >= 5;

  defenders.forEach((defender) => {
    // A defender is screened when sharing a side (orthogonal) with ANY offensive player.
    // This includes the ball carrier - screens don't break if you pass to the screener
    const isScreened = offense.some(o => isOrthogonalAdjacent(o.pos, defender.pos));

    // Screened defenders lose their ability to move.
    if (isScreened) {
      return;
    }

    // Defenders only move one block (including diagonals) from their previous turn position.
    const moves: Position[] = [defender.pos];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        if (x === 0 && y === 0) continue;
        const p = { x: defender.pos.x + x, y: defender.pos.y + y };
        // Block row 1 (y=0) and check bounds
        if (p.x >= 0 && p.x < GRID_SIZE && p.y > 0 && p.y < GRID_SIZE && !nextPlayers.find(pl => pl.id !== defender.id && isPosEqual(pl.pos, p))) {
          moves.push(p);
        }
      }
    }

    let targetPos = defender.pos;

    // ADVANCED DEFENSE (Streak 5+): Prioritize blocking scoring positions
    if (advancedDefense) {
      const distToBasket = getDistance(ballCarrier.pos, BASKET_POS);

      // Priority 1: Block basket if ball carrier is close (within 4 squares)
      if (distToBasket <= 4 && moves.some(m => isPosEqual(m, BASKET_POS))) {
        targetPos = BASKET_POS;
        defender.pos = targetPos;
        return;
      }

      // Priority 2: Block 3PT shots by being adjacent to arc positions near ball carrier
      const nearbyArcPositions = THREE_POINT_LINE.filter(arcPos =>
        getDistance(ballCarrier.pos, arcPos) <= 3
      );

      for (const arcPos of nearbyArcPositions) {
        // Check if we can move adjacent to this arc position
        const adjacentToArc = moves.find(m =>
          getDistance(m, arcPos) <= 1 && !isPosEqual(m, arcPos)
        );
        if (adjacentToArc) {
          targetPos = adjacentToArc;
          defender.pos = targetPos;
          return;
        }
      }
    }

    // Standard defensive positioning (used always, or as fallback after streak 5)
    const assigned = offense.find(o => o.id === defender.assignedTo);
    if (defender.assignedTo === ballCarrier.id) {
      const ideal = { x: Math.round((ballCarrier.pos.x + BASKET_POS.x) / 2), y: Math.round((ballCarrier.pos.y + BASKET_POS.y) / 2) };
      moves.sort((a, b) => getDistance(a, ideal) - getDistance(b, ideal));
      targetPos = moves[0];
    } else if (assigned) {
      const mid = { x: Math.round((ballCarrier.pos.x + assigned.pos.x) / 2), y: Math.round((ballCarrier.pos.y + assigned.pos.y) / 2) };
      moves.sort((a, b) => getDistance(a, mid) - getDistance(b, mid));
      targetPos = moves[0];
    }
    defender.pos = targetPos;
  });

  return nextPlayers;
};

export const getStrategyHighlights = (players: Player[], strategy: StrategyType): Position[] => {
  if (!strategy) return [];
  const ballCarrier = players.find(p => p.hasBall);
  if (!ballCarrier) return [];

  if (strategy === 'pick-and-roll') {
    const bcDefender = players.find(p => p.team === 'defense' && p.assignedTo === ballCarrier.id);
    if (!bcDefender) return [];
    return [
      { x: bcDefender.pos.x + 1, y: bcDefender.pos.y },
      { x: bcDefender.pos.x - 1, y: bcDefender.pos.y },
      { x: bcDefender.pos.x, y: bcDefender.pos.y + 1 },
      { x: bcDefender.pos.x, y: bcDefender.pos.y - 1 },
    ].filter(p => p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE);
  }
  
  if (strategy === 'floor-spacing') {
    return THREE_POINT_LINE;
  }

  if (strategy === 'backdoor-cut') {
    return [
      { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 },
      { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }
    ];
  }

  return [];
};

export const canScore = (player: Player, players: Player[]): { success: boolean; reason?: string; pts?: number; type?: string } => {
  if (!player.hasBall) return { success: false, reason: "No ball", pts: 0, type: "" };

  const dist = getDistance(player.pos, BASKET_POS);
  const isOnArc = isPartOfThreePointArc(player.pos);
  const defenders = players.filter(p => p.team === 'defense');
  const adjacentDefenders = defenders.filter(d => getDistance(player.pos, d.pos) <= 1);

  // STRICT RULE 1: 3PT shots ONLY from white arc line
  if (isOnArc) {
    if (adjacentDefenders.length > 0) {
      return { success: false, reason: "Contested 3PT!", pts: 0, type: "" };
    }
    // Double-check: only award 3PT if ACTUALLY on arc
    if (!THREE_POINT_LINE.some(arcPos => arcPos.x === player.pos.x && arcPos.y === player.pos.y)) {
      return { success: false, reason: "Not on arc line!", pts: 0, type: "" };
    }
    return { success: true, pts: 3, type: "3-Pointer" };
  }

  // STRICT RULE 2: Slam dunk at basket position
  if (isPosEqual(player.pos, BASKET_POS)) {
    return { success: true, pts: 2, type: "Slam Dunk" };
  }

  // STRICT RULE 3: Layup ONLY from specific positions
  if (isLayupPosition(player.pos)) {
    // Check rim protection
    const basketDefender = defenders.find(d => isPosEqual(d.pos, BASKET_POS) || isAdjacent(d.pos, BASKET_POS));
    if (basketDefender) {
      return { success: false, reason: "Rim Protected!", pts: 0, type: "" };
    }
    return { success: true, pts: 2, type: "Layup" };
  }

  // NO OTHER SHOTS ALLOWED - Must be on arc or near basket
  return { success: false, reason: "Too far! Move to arc or attack the rim!", pts: 0, type: "" };
};
