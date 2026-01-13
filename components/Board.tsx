
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
  is3DMode: boolean;
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
  maxTurns,
  is3DMode
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
          relative w-full h-full border border-[rgba(92,64,51,0.4)] flex items-center justify-center cursor-pointer
          transition-all duration-200
          ${bgColor} ${arcStyle}
          ${isStrategy ? 'bg-blue-400/40 ring-2 ring-blue-400/50 ring-inset z-10' : ''}
          ${isActive ? 'ring-4 ring-yellow-400 ring-inset z-30' : ''}
          ${isValidTarget ? 'after:content-[""] after:w-3 after:h-3 after:bg-white/40 after:rounded-full after:z-10 after:absolute after:inset-auto after:block animate-pulse' : ''}
        `}
      >
        {!is3DMode && isRow1 && phase === 'off-ball' && x === 4 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-[0_0_20px_rgba(251,191,36,0.6)] border-2 border-yellow-300 animate-pulse uppercase tracking-tight whitespace-nowrap">
              PHASE: MOVE OFF-BALL PLAYERS
            </div>
          </div>
        )}

        {!is3DMode && isRow1 && phase === 'ball-carrier' && x === 4 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.6)] border-2 border-blue-300 animate-pulse uppercase tracking-tight whitespace-nowrap">
              PHASE: MOVE BALL HOLDER
            </div>
          </div>
        )}

        {!is3DMode && isRow1 && x === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-zinc-800 text-white text-[7px] font-black px-2 py-1 rounded-lg border border-zinc-700 uppercase text-center leading-tight">
              TURN<br />{turnCount + 1}/{maxTurns}
            </div>
          </div>
        )}

        {!is3DMode && isRow1 && x === 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="flex gap-0.5 px-1">
              {[...Array(maxTurns)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < turnCount ? 'bg-zinc-600' : 'bg-red-600 shadow-[0_0_4px_rgba(220,38,38,0.4)]'}`} />
              ))}
            </div>
          </div>
        )}

        {!is3DMode && isRow1 && x === 7 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-zinc-800 text-orange-400 text-[7px] font-black px-2 py-1 rounded-lg border border-zinc-700 uppercase text-center leading-tight">
              STREAK<br />{streak}
            </div>
          </div>
        )}

        {!is3DMode && isRow1 && x === 8 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-zinc-800 text-orange-400 text-[7px] font-black px-2 py-1 rounded-lg border border-zinc-700 uppercase text-center leading-tight">
              SCORE<br />{score}
            </div>
          </div>
        )}

        {isBasket && (
          <>
            {is3DMode ? (
              // 3D Basketball Goal
              <div className="absolute inset-0 flex items-end justify-center z-10" style={{ paddingBottom: '0px' }}>
                <div
                  className="relative"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: 'translateZ(8px)',
                  }}
                >
                  {/* Backboard - at the back */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-7 rounded border-2 border-zinc-700"
                    style={{
                      background: 'linear-gradient(135deg, #fafafa 0%, #e4e4e7 50%, #d4d4d8 100%)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset -2px -2px 4px rgba(0,0,0,0.1), inset 2px 2px 4px rgba(255,255,255,0.8)',
                      transform: 'translateZ(-3px)'
                    }}
                  >
                    {/* Inner square */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-3 border border-red-600/60"></div>
                  </div>

                  {/* Rim mounting bracket */}
                  <div
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded"
                    style={{
                      background: 'linear-gradient(to right, #a1a1aa, #d4d4d8, #a1a1aa)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      transform: 'translateZ(-1px)'
                    }}
                  />

                  {/* 3D Basketball Rim - horizontal ellipse at bottom */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2"
                    style={{
                      width: '24px',
                      height: '8px',
                      borderRadius: '50%',
                      border: '2.5px solid #dc2626',
                      background: 'transparent',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(0,0,0,0.5), inset 0 1px 2px rgba(252, 165, 165, 0.4)',
                      transform: 'rotateX(75deg) translateY(-2px)'
                    }}
                  />

                  {/* Net */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-2"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
                      clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)',
                      opacity: 0.7,
                      transform: 'translateY(1px)'
                    }}
                  />
                </div>
              </div>
            ) : (
              // 2D Basketball Goal
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
          </>
        )}

        {isStrategy && !player && (
          <div className="absolute inset-0 flex items-center justify-center text-blue-100/50 pointer-events-none text-[7px] font-black uppercase tracking-tighter">
            {strategyLabel}
          </div>
        )}
        
        {player && (
          <>
            {is3DMode ? (
              // High-quality isometric 3D player
              <div
                className={`
                  absolute inset-0 flex items-center justify-center transition-all duration-300
                  ${hasMoved && player.team === 'offense' ? 'opacity-40' : 'opacity-100'}
                `}
                style={{
                  transformStyle: 'preserve-3d',
                  zIndex: 20 + player.pos.y,
                }}
              >
                <div
                  className="relative"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: 'translateZ(15px) translateY(-10%)',
                  }}
                >
                  {/* Drop shadow on floor */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-black/40 rounded-full blur-sm"
                    style={{ transform: 'translateZ(-15px) scale(1.1)' }}
                  />

                  {/* Player figure container */}
                  <div className={`relative flex flex-col items-center ${isActive ? 'scale-110' : ''} transition-transform`}>
                  {/* Head */}
                  <div
                    className={`w-3 h-3 rounded-full relative z-10 border-2 ${
                      isActive
                        ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-pulse'
                        : isSuggestedMover
                        ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse'
                        : isPassTarget
                        ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse'
                        : player.team === 'offense' ? 'border-blue-300' : 'border-red-300'
                    }`}
                    style={{
                      background: player.team === 'offense'
                        ? 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6 40%, #1d4ed8 70%, #1e3a8a)'
                        : 'radial-gradient(circle at 30% 30%, #fca5a5, #ef4444 40%, #dc2626 70%, #991b1b)',
                      boxShadow: isActive
                        ? '0 0 20px rgba(250, 204, 21, 0.9), inset -2px -2px 4px rgba(0, 0, 0, 0.3), inset 2px 2px 4px rgba(254, 240, 138, 0.5)'
                        : isSuggestedMover
                        ? '0 0 20px rgba(255, 255, 255, 0.9), inset -2px -2px 4px rgba(0, 0, 0, 0.3), inset 2px 2px 4px rgba(255, 255, 255, 0.5)'
                        : isPassTarget
                        ? '0 0 20px rgba(52, 211, 153, 0.9), inset -2px -2px 4px rgba(0, 0, 0, 0.3), inset 2px 2px 4px rgba(167, 243, 208, 0.5)'
                        : player.team === 'offense'
                        ? '0 2px 8px rgba(59, 130, 246, 0.6), inset -2px -2px 4px rgba(0, 0, 0, 0.3), inset 2px 2px 4px rgba(147, 197, 253, 0.4)'
                        : '0 2px 8px rgba(239, 68, 68, 0.6), inset -2px -2px 4px rgba(0, 0, 0, 0.3), inset 2px 2px 4px rgba(252, 165, 165, 0.4)'
                    }}
                  />

                  {/* Body/Torso */}
                  <div
                    className={`w-4 h-5 -mt-0.5 relative z-5 border-2 ${
                      isActive
                        ? 'border-yellow-400 animate-pulse'
                        : isSuggestedMover
                        ? 'border-white animate-pulse'
                        : isPassTarget
                        ? 'border-emerald-400 animate-pulse'
                        : player.team === 'offense' ? 'border-blue-400' : 'border-red-400'
                    }`}
                    style={{
                      borderRadius: '30% 30% 40% 40% / 20% 20% 60% 60%',
                      background: player.team === 'offense'
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 30%, #1d4ed8 60%, #1e3a8a 100%)'
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 30%, #b91c1c 60%, #991b1b 100%)',
                      boxShadow: isActive
                        ? '0 0 20px rgba(250, 204, 21, 0.9), inset -3px -3px 6px rgba(0, 0, 0, 0.4), inset 3px 3px 6px rgba(254, 240, 138, 0.4)'
                        : isSuggestedMover
                        ? '0 0 20px rgba(255, 255, 255, 0.9), inset -3px -3px 6px rgba(0, 0, 0, 0.4), inset 3px 3px 6px rgba(255, 255, 255, 0.4)'
                        : isPassTarget
                        ? '0 0 20px rgba(52, 211, 153, 0.9), inset -3px -3px 6px rgba(0, 0, 0, 0.4), inset 3px 3px 6px rgba(167, 243, 208, 0.4)'
                        : player.team === 'offense'
                        ? '0 4px 12px rgba(29, 78, 216, 0.7), inset -3px -3px 6px rgba(0, 0, 0, 0.4), inset 3px 3px 6px rgba(96, 165, 246, 0.3)'
                        : '0 4px 12px rgba(185, 28, 28, 0.7), inset -3px -3px 6px rgba(0, 0, 0, 0.4), inset 3px 3px 6px rgba(248, 113, 113, 0.3)'
                    }}
                  >
                    {/* Position name on torso */}
                    <div className="absolute inset-0 flex items-center justify-center text-[6px] font-black text-white drop-shadow-md" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      {player.role}
                    </div>

                    {/* Rim lighting on right edge */}
                    <div
                      className="absolute -right-0.5 top-1 bottom-1 w-1 rounded-full opacity-60"
                      style={{
                        background: player.team === 'offense'
                          ? 'linear-gradient(to bottom, rgba(147, 197, 253, 0.8), rgba(96, 165, 246, 0.4))'
                          : 'linear-gradient(to bottom, rgba(252, 165, 165, 0.8), rgba(248, 113, 113, 0.4))'
                      }}
                    />
                  </div>

                  {/* Arms - positioned lower and more to the sides */}
                  <div className="absolute top-3 left-0 right-0 flex justify-between" style={{ paddingLeft: '-2px', paddingRight: '-2px' }}>
                    {/* Left arm */}
                    <div
                      className={`w-1 h-2.5 rounded-full ${
                        isActive ? 'ring-1 ring-yellow-400' : isSuggestedMover ? 'ring-1 ring-white' : isPassTarget ? 'ring-1 ring-emerald-400' : ''
                      } ${player.team === 'offense' ? 'bg-blue-600' : 'bg-red-600'}`}
                      style={{
                        transform: 'rotate(-25deg) translateX(-2px)',
                        background: player.team === 'offense'
                          ? 'linear-gradient(to bottom, #2563eb, #1e3a8a)'
                          : 'linear-gradient(to bottom, #dc2626, #7f1d1d)',
                        boxShadow: isActive
                          ? '0 0 8px rgba(250, 204, 21, 0.8), inset -1px 0 2px rgba(0,0,0,0.4)'
                          : isSuggestedMover
                          ? '0 0 8px rgba(255, 255, 255, 0.8), inset -1px 0 2px rgba(0,0,0,0.4)'
                          : isPassTarget
                          ? '0 0 8px rgba(52, 211, 153, 0.8), inset -1px 0 2px rgba(0,0,0,0.4)'
                          : 'inset -1px 0 2px rgba(0,0,0,0.4)'
                      }}
                    />
                    {/* Right arm */}
                    <div
                      className={`w-1 h-2.5 rounded-full ${
                        isActive ? 'ring-1 ring-yellow-400' : isSuggestedMover ? 'ring-1 ring-white' : isPassTarget ? 'ring-1 ring-emerald-400' : ''
                      } ${player.team === 'offense' ? 'bg-blue-600' : 'bg-red-600'}`}
                      style={{
                        transform: 'rotate(25deg) translateX(2px)',
                        background: player.team === 'offense'
                          ? 'linear-gradient(to bottom, #2563eb, #1e3a8a)'
                          : 'linear-gradient(to bottom, #dc2626, #7f1d1d)',
                        boxShadow: isActive
                          ? '0 0 8px rgba(250, 204, 21, 0.8), inset 1px 0 2px rgba(255,255,255,0.2)'
                          : isSuggestedMover
                          ? '0 0 8px rgba(255, 255, 255, 0.8), inset 1px 0 2px rgba(255,255,255,0.2)'
                          : isPassTarget
                          ? '0 0 8px rgba(52, 211, 153, 0.8), inset 1px 0 2px rgba(255,255,255,0.2)'
                          : 'inset 1px 0 2px rgba(255,255,255,0.2)'
                      }}
                    />
                  </div>

                  {/* Legs */}
                  <div className="flex gap-0.5 -mt-0.5">
                    <div
                      className={`w-1.5 h-2.5 rounded-b-lg ${
                        isActive ? 'ring-1 ring-yellow-400' : isSuggestedMover ? 'ring-1 ring-white' : isPassTarget ? 'ring-1 ring-emerald-400' : ''
                      }`}
                      style={{
                        background: player.team === 'offense'
                          ? 'linear-gradient(to bottom, #1e40af 0%, #1e3a8a 50%, #172554 100%)'
                          : 'linear-gradient(to bottom, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%)',
                        boxShadow: isActive
                          ? '0 0 8px rgba(250, 204, 21, 0.8), inset -1px -1px 3px rgba(0,0,0,0.5), inset 1px 1px 2px rgba(255,255,255,0.1)'
                          : isSuggestedMover
                          ? '0 0 8px rgba(255, 255, 255, 0.8), inset -1px -1px 3px rgba(0,0,0,0.5), inset 1px 1px 2px rgba(255,255,255,0.1)'
                          : isPassTarget
                          ? '0 0 8px rgba(52, 211, 153, 0.8), inset -1px -1px 3px rgba(0,0,0,0.5), inset 1px 1px 2px rgba(255,255,255,0.1)'
                          : 'inset -1px -1px 3px rgba(0,0,0,0.5), inset 1px 1px 2px rgba(255,255,255,0.1)'
                      }}
                    />
                    <div
                      className={`w-1.5 h-2.5 rounded-b-lg ${
                        isActive ? 'ring-1 ring-yellow-400' : isSuggestedMover ? 'ring-1 ring-white' : isPassTarget ? 'ring-1 ring-emerald-400' : ''
                      }`}
                      style={{
                        background: player.team === 'offense'
                          ? 'linear-gradient(to bottom, #1e40af 0%, #1e3a8a 50%, #172554 100%)'
                          : 'linear-gradient(to bottom, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%)',
                        boxShadow: isActive
                          ? '0 0 8px rgba(250, 204, 21, 0.8), inset 1px -1px 3px rgba(0,0,0,0.5), inset -1px 1px 2px rgba(255,255,255,0.15)'
                          : isSuggestedMover
                          ? '0 0 8px rgba(255, 255, 255, 0.8), inset 1px -1px 3px rgba(0,0,0,0.5), inset -1px 1px 2px rgba(255,255,255,0.15)'
                          : isPassTarget
                          ? '0 0 8px rgba(52, 211, 153, 0.8), inset 1px -1px 3px rgba(0,0,0,0.5), inset -1px 1px 2px rgba(255,255,255,0.15)'
                          : 'inset 1px -1px 3px rgba(0,0,0,0.5), inset -1px 1px 2px rgba(255,255,255,0.15)'
                      }}
                    />
                  </div>
                </div>

                {/* Pass target - emerald glow on body parts */}
                {/* Suggested mover - handled by body part borders below */}

                {/* Screened indicator - positioned on lower body */}
                {isScreened && (
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white text-black text-[6px] font-black px-1.5 py-0.5 rounded-full border-2 border-black shadow-lg uppercase tracking-tighter z-30 whitespace-nowrap">
                    Screened
                  </div>
                )}

                {/* Basketball indicator */}
                {player.hasBall && (
                  <div className="absolute -right-1.5 top-0 w-3 h-3 bg-orange-600 rounded-full border-2 border-white flex items-center justify-center text-[7px] text-white shadow-lg animate-bounce z-30" style={{ background: 'radial-gradient(circle at 30% 30%, #fb923c, #ea580c)' }}>
                    <i className="fa-solid fa-basketball"></i>
                  </div>
                )}
                </div>
              </div>
            ) : (
              // 2D mode - original flat design
              <div
                className={`
                  relative flex items-center justify-center text-[10px] font-black z-20
                  w-9 h-9 rounded-full
                  ${player.team === 'offense' ? 'bg-blue-700 text-white' : 'bg-red-600 text-white'}
                  ${player.hasBall ? 'ring-2 ring-orange-300 scale-105 shadow-[0_0_15px_rgba(253,224,71,0.6)]' : ''}
                  ${hasMoved && player.team === 'offense' ? 'opacity-40' : 'opacity-100'}
                  ${isScreened ? 'ring-2 ring-white scale-95 shadow-[0_0_10px_rgba(255,255,255,0.4)]' : ''}
                  ${isActive ? 'ring-4 ring-yellow-400 ring-inset animate-pulse shadow-[0_0_20px_rgba(250,204,21,0.8)]' : ''}
                  ${isSuggestedMover && !isActive ? 'ring-4 ring-white animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.6)]' : ''}
                  ${isPassTarget ? 'ring-4 ring-emerald-400 animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.8)]' : ''}
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
          </>
        )}
      </div>
    );
  };

  const axisLabelStyle = "flex items-center justify-center text-[8px] font-black text-zinc-500 uppercase";

  // Render info displays for 3D mode (above court)
  const renderInfoDisplays3D = () => (
    <div className="flex items-center justify-between w-full px-1 mb-2">
      {/* Turn info */}
      <div className="flex items-center gap-1">
        <div className="bg-zinc-800 text-white text-[6px] font-black px-1.5 py-0.5 rounded border border-zinc-700 uppercase text-center leading-tight">
          TURN<br />{turnCount + 1}/{maxTurns}
        </div>
        <div className="flex gap-0.5">
          {[...Array(maxTurns)].map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < turnCount ? 'bg-zinc-600' : 'bg-red-600 shadow-[0_0_4px_rgba(220,38,38,0.4)]'}`} />
          ))}
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex-1 flex items-center justify-center px-2">
        {phase === 'off-ball' && (
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-[0_0_15px_rgba(251,191,36,0.5)] border border-yellow-300 uppercase tracking-tight whitespace-nowrap">
            PHASE: OFF-BALL
          </div>
        )}
        {phase === 'ball-carrier' && (
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-300 uppercase tracking-tight whitespace-nowrap">
            PHASE: BALL HOLDER
          </div>
        )}
      </div>

      {/* Streak and Score */}
      <div className="flex items-center gap-1">
        <div className="bg-zinc-800 text-orange-400 text-[6px] font-black px-1.5 py-0.5 rounded border border-zinc-700 uppercase text-center leading-tight">
          STREAK<br />{streak}
        </div>
        <div className="bg-zinc-800 text-orange-400 text-[6px] font-black px-1.5 py-0.5 rounded border border-zinc-700 uppercase text-center leading-tight">
          SCORE<br />{score}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col w-full max-w-[470px] mx-auto ${is3DMode ? 'gap-0' : 'gap-1'}`} style={is3DMode ? { perspective: '1200px' } : {}}>
      {/* Info displays above court in 3D mode */}
      {is3DMode && (
        <div className="relative z-30 mb-[-22px]">
          {renderInfoDisplays3D()}
        </div>
      )}

      {/* X-axis labels at top in 3D mode */}
      {is3DMode && (
        <div className="flex gap-1 w-full relative z-30 mb-[-32px] mt-2" style={{ transform: 'scale(0.88)' }}>
          <div className="w-4"></div>
          <div className="flex-1 grid grid-cols-9 h-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={`x-top-${i}`} className={axisLabelStyle}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`flex gap-1 w-full ${is3DMode ? 'relative z-20' : ''}`} style={is3DMode ? { transformStyle: 'preserve-3d', transform: 'rotateX(25deg) scale(0.95)' } : {}}>
        {/* Y-axis labels */}
        <div className="flex flex-col w-4 py-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={`y-${i}`} className={`flex-1 ${axisLabelStyle}`}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* The Grid */}
        <div className="aspect-square flex-1 border-4 border-zinc-800 rounded-lg shadow-2xl overflow-hidden grid grid-cols-9 grid-rows-9 bg-zinc-900" style={is3DMode ? { transformStyle: 'preserve-3d' } : {}}>
          {Array.from({ length: 81 }).map((_, i) => {
            const x = i % 9;
            const y = Math.floor(i / 9);
            return renderSquare(x, y);
          })}
        </div>
      </div>

      {/* X-axis labels at bottom (hidden in 3D mode) */}
      {!is3DMode && (
        <div className="flex w-full pl-5">
          <div className="flex-1 grid grid-cols-9 h-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={`x-${i}`} className={axisLabelStyle}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Board;
