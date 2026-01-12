
import React from 'react';
import { Player, Position, StrategyType, TurnPhase } from '../types';
import { GRID_SIZE, BASKET_POS } from '../constants';
import { isPosEqual, isInPaint, isThreePointArea, isPartOfThreePointArc, isOrthogonalAdjacent, isLayupPosition } from '../utils/gameLogic';

interface BoardProps {
  players: Player[];
  onSquareClick: (pos: Position) => void;
  activePlayerId: string | null;
  validMoves: Position[];
  movedPlayerIds: string[];
  strategyHighlights?: Position[];
  passablePlayerIds?: string[];
  activeStrategy: StrategyType;
  phase: TurnPhase;
  showStrategySuggestions: boolean;
  streak: number;
  score: number;
  turnCount: number;
  maxTurns: number;
}

const Board: React.FC<BoardProps> = ({
  players,
  onSquareClick,
  activePlayerId,
  validMoves = [],
  movedPlayerIds,
  strategyHighlights = [],
  passablePlayerIds = [],
  activeStrategy,
  phase,
  showStrategySuggestions,
  streak,
  score,
  turnCount,
  maxTurns
}) => {
  const getStrategyLabel = (strat: StrategyType) => {
    switch (strat) {
      case 'pick-and-roll': return 'SCREEN';
      case 'floor-spacing': return 'SPACE';
      case 'backdoor-cut': return 'CUT';
      default: return '';
    }
  };

  const strategyLabel = getStrategyLabel(activeStrategy);

  const renderSquare = (x: number, y: number) => {
    const pos = { x, y };

    // Row 1 (y=0) is reserved for phase display
    const isRow1 = y === 0;

    const player = players.find(p => isPosEqual(p.pos, pos));
    const isBasket = isPosEqual(pos, BASKET_POS);
    const inPaint = isInPaint(pos);
    const in3ptArea = isThreePointArea(pos);
    const isArc = isPartOfThreePointArc(pos);
    const isLayupZone = isLayupPosition(pos); // Specific layup positions
    const isStrategy = showStrategySuggestions && strategyHighlights.some(mv => isPosEqual(mv, pos));
    const isValidTarget = validMoves.some(mv => isPosEqual(mv, pos));
    const isActive = player && player.id === activePlayerId;
    const hasMoved = player && movedPlayerIds.includes(player.id);

    // Logic for suggesting which player needs to move
    const isSuggestedMover = player?.team === 'offense' && (
      (phase === 'off-ball' && !player.hasBall && !hasMoved) ||
      (phase === 'ball-carrier' && player.hasBall)
    );

    const isPassTarget = player && passablePlayerIds.includes(player.id);

    // Defenders are only screened when sharing a side (orthogonal adjacency) with an off-ball offensive player.
    const isScreened = player?.team === 'defense' && players.some(o =>
      o.team === 'offense' &&
      !o.hasBall &&
      isOrthogonalAdjacent(o.pos, player.pos)
    );

    // Base Court Colors
    let bgColor = 'bg-orange-400';
    if (isRow1) bgColor = 'bg-orange-400'; // Row 1 same orange as court
    else if (isLayupZone) bgColor = 'bg-orange-200'; // Light orange for layup zones
    else if (inPaint) bgColor = 'bg-orange-300';
    else if (in3ptArea) bgColor = 'bg-orange-400/90';

    // Arc Styling: Making the line visible
    const arcStyle = isArc ? 'ring-2 ring-white/70 z-10 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : '';

    return (
      <div
        key={`${x}-${y}`}
        onClick={() => onSquareClick(pos)}
        className={`
          relative w-full h-full border border-black/5 flex items-center justify-center cursor-pointer
          transition-all duration-200
          ${bgColor} ${arcStyle}
          ${isStrategy ? 'bg-blue-400/40 ring-2 ring-blue-400/50 ring-inset z-10' : ''}
          ${isActive ? 'ring-4 ring-yellow-400 ring-inset z-30' : ''}
          ${isValidTarget ? 'after:content-[""] after:w-3 after:h-3 after:bg-white/40 after:rounded-full after:z-10 after:absolute after:inset-auto after:block animate-pulse' : ''}
        `}
      >
        {isRow1 && phase === 'off-ball' && x === 4 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-[0_0_20px_rgba(251,191,36,0.6)] border-2 border-yellow-300 animate-pulse uppercase tracking-tight whitespace-nowrap">
              PHASE: MOVE OFF-BALL PLAYERS
            </div>
          </div>
        )}

        {isRow1 && phase === 'ball-carrier' && x === 4 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.6)] border-2 border-blue-300 animate-pulse uppercase tracking-tight whitespace-nowrap">
              PHASE: MOVE BALL HOLDER
            </div>
          </div>
        )}

        {isRow1 && x === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-zinc-800 text-white text-[7px] font-black px-2 py-1 rounded-lg border border-zinc-700 uppercase text-center leading-tight">
              TURN<br />{turnCount + 1}/{maxTurns}
            </div>
          </div>
        )}

        {isRow1 && x === 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="flex gap-0.5 px-1">
              {[...Array(maxTurns)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < turnCount ? 'bg-zinc-600' : 'bg-red-600 shadow-[0_0_4px_rgba(220,38,38,0.4)]'}`} />
              ))}
            </div>
          </div>
        )}

        {isRow1 && x === 7 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-zinc-800 text-orange-400 text-[7px] font-black px-2 py-1 rounded-lg border border-zinc-700 uppercase text-center leading-tight">
              STREAK<br />{streak}
            </div>
          </div>
        )}

        {isRow1 && x === 8 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-zinc-800 text-orange-400 text-[7px] font-black px-2 py-1 rounded-lg border border-zinc-700 uppercase text-center leading-tight">
              SCORE<br />{score}
            </div>
          </div>
        )}

        {isBasket && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/10">
            <div className="relative">
              {/* Basketball rim */}
              <div className="w-10 h-10 rounded-full border-4 border-red-600 bg-red-500/20 flex items-center justify-center animate-pulse">
                <div className="text-[8px] font-black text-white uppercase tracking-tighter">GOAL</div>
              </div>
              {/* Net effect */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-2 bg-gradient-to-b from-red-400/40 to-transparent rounded-b-full"></div>
            </div>
          </div>
        )}

        {isStrategy && !player && (
          <div className="absolute inset-0 flex items-center justify-center text-blue-100/50 pointer-events-none text-[7px] font-black uppercase tracking-tighter">
            {strategyLabel}
          </div>
        )}
        
        {player && (
          <div
            className={`
              relative w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg z-20
              ${player.team === 'offense' ? 'bg-blue-700 text-white' : 'bg-red-600 text-white'}
              ${player.hasBall ? 'ring-2 ring-orange-300 scale-105 shadow-[0_0_15px_rgba(253,224,71,0.6)]' : ''}
              ${hasMoved && player.team === 'offense' ? 'opacity-40' : 'opacity-100'}
              ${isScreened ? 'ring-2 ring-white scale-95 shadow-[0_0_10px_rgba(255,255,255,0.4)]' : ''}
              ${isSuggestedMover && !isActive ? 'ring-4 ring-white animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.6)]' : ''}
              ${isPassTarget ? 'ring-4 ring-emerald-400 animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.8)]' : ''}
              transition-all duration-300
            `}
          >
            {player.role || player.name}
            
            {player.hasBall && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-600 rounded-full border border-white flex items-center justify-center text-[8px] text-white shadow-md animate-bounce z-30">
                <i className="fa-solid fa-basketball"></i>
              </div>
            )}

            {isScreened && (
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-black text-[7px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-sm uppercase tracking-tighter z-30 whitespace-nowrap">Screened</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const axisLabelStyle = "flex items-center justify-center text-[8px] font-black text-zinc-500 uppercase";

  return (
    <div className="flex flex-col gap-1 w-full max-w-[470px] mx-auto">
      <div className="flex gap-1 w-full">
        {/* Y-axis labels */}
        <div className="flex flex-col w-4 py-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={`y-${i}`} className={`flex-1 ${axisLabelStyle}`}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* The Grid */}
        <div className="aspect-square flex-1 border-4 border-zinc-800 rounded-lg shadow-2xl overflow-hidden grid grid-cols-9 grid-rows-9 bg-zinc-900">
          {Array.from({ length: 81 }).map((_, i) => {
            const x = i % 9;
            const y = Math.floor(i / 9);
            return renderSquare(x, y);
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex w-full pl-5">
        <div className="flex-1 grid grid-cols-9 h-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={`x-${i}`} className={axisLabelStyle}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Board;
