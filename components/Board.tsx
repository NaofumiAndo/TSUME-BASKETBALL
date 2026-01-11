
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
  showStrategySuggestions
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
    if (isLayupZone) bgColor = 'bg-orange-200'; // Light orange for layup zones
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
        {isBasket && (
          <div className="absolute inset-0 flex items-center justify-center text-red-600 animate-pulse z-10 bg-black/10">
            <i className="fa-solid fa-basketball fa-2xl"></i>
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
