
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, Position, GameState, StrategyType, GameMode, Ranking } from './types';
import { INITIAL_SCENARIOS, BASKET_POS } from './constants';
import { isValidMove, aiOptimalWall, canScore, getPlayerAt, canPassToTeammate, getStrategyHighlights, isPosEqual, generateTacticalScenario } from './utils/gameLogic';
import Board from './components/Board';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: JSON.parse(JSON.stringify(INITIAL_SCENARIOS[0].players)),
    score: 0,
    streak: 0,
    highScore: 0,
    turnCount: 0,
    maxTurns: 4,
    status: 'idle',
    activePlayerId: null,
    message: 'Welcome to Tsume Basketball.',
    movedPlayerIds: [],
    phase: 'menu',
    activeStrategy: null,
    mode: 'streak-attack',
    timeLeft: 60,
    showNameInput: false
  });

  // History stack to support Undo
  const [history, setHistory] = useState<Partial<GameState>[]>([]);
  const [undoUsed, setUndoUsed] = useState(false); // Track if undo has been used this turn

  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [playerName, setPlayerName] = useState('');
  const timerRef = useRef<number | null>(null);

  // Banner state for scoring and game over
  const [showBanner, setShowBanner] = useState(false);
  const [bannerContent, setBannerContent] = useState({ points: 0, type: '', message: '' });

  useEffect(() => {
    // Fetch global rankings from database
    const fetchRankings = async () => {
      try {
        const response = await fetch('/api/rankings');
        if (response.ok) {
          const data = await response.json();
          const allRankings = [
            ...(data['streak-attack'] || []).map((r: any) => typeof r === 'string' ? JSON.parse(r) : r),
            ...(data['time-attack'] || []).map((r: any) => typeof r === 'string' ? JSON.parse(r) : r)
          ];
          setRankings(allRankings);

          // Also save to localStorage as backup
          localStorage.setItem('tsume_rankings', JSON.stringify(allRankings));
        } else {
          // Fallback to localStorage if API fails
          const savedRankings = localStorage.getItem('tsume_rankings');
          if (savedRankings) setRankings(JSON.parse(savedRankings));
        }
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
        // Fallback to localStorage if API fails
        const savedRankings = localStorage.getItem('tsume_rankings');
        if (savedRankings) setRankings(JSON.parse(savedRankings));
      }
    };

    fetchRankings();

    const savedHigh = localStorage.getItem('tsume_high_score');
    if (savedHigh) setGameState(prev => ({ ...prev, highScore: parseInt(savedHigh) || 0 }));
  }, []);

  useEffect(() => {
    if (gameState.status === 'playing' && gameState.mode === 'time-attack') {
      timerRef.current = window.setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);

            // Show time expired banner
            setBannerContent({ points: 0, type: '', message: 'TIME EXPIRED!' });
            setShowBanner(true);

            setTimeout(() => {
              setShowBanner(false);
              setGameState(p => ({ ...p, timeLeft: 0, status: 'lost', message: 'TIME EXPIRED! GAME OVER', showNameInput: true }));
            }, 1500);

            return { ...prev, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.status, gameState.mode]);

  // Game over check
  useEffect(() => {
    if (gameState.status === 'playing' && (gameState.phase === 'executing' || gameState.phase === 'passing')) {
      const ballCarrier = gameState.players.find(p => p.hasBall);
      if (ballCarrier) {
        const shotResult = canScore(ballCarrier, gameState.players);
        const canPass = gameState.players.some(p => 
          p.team === 'offense' && 
          p.id !== ballCarrier.id && 
          canPassToTeammate(ballCarrier, p, gameState.players)
        );

        if (!shotResult.success && !canPass) {
          // Show locked up banner
          setBannerContent({ points: 0, type: '', message: 'LOCKED UP!' });
          setShowBanner(true);

          setTimeout(() => {
            setShowBanner(false);
            setGameState(prev => ({
              ...prev,
              status: 'lost',
              message: 'LOCKED UP! GAME OVER',
              showNameInput: true
            }));
          }, 1500);
        }
      }
    }
  }, [gameState.phase, gameState.players, gameState.status]);

  const saveToHistory = () => {
    setHistory(prev => [
      ...prev,
      {
        players: JSON.parse(JSON.stringify(gameState.players)),
        phase: gameState.phase,
        movedPlayerIds: [...gameState.movedPlayerIds],
        activePlayerId: gameState.activePlayerId,
        activeStrategy: gameState.activeStrategy,
        turnCount: gameState.turnCount,
        message: gameState.message
      }
    ]);
  };

  const handleUndo = () => {
    if (history.length === 0 || undoUsed) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setUndoUsed(true); // Mark undo as used
    setGameState(prev => ({
      ...prev,
      ...previous
    }));
  };

  const startGame = (mode: GameMode) => {
    const initialPlayers = generateTacticalScenario();
    setHistory([]);
    setUndoUsed(false); // Reset undo for new game
    setGameState({
      ...gameState,
      players: initialPlayers,
      score: 0,
      streak: 0,
      turnCount: 0,
      status: 'playing',
      phase: 'off-ball',
      mode,
      timeLeft: mode === 'time-attack' ? 60 : 0,
      message: mode === 'time-attack' ? 'Go! Score as much as possible in 1 minute!' : 'Execute precisely. One mistake ends the streak.',
      showNameInput: false,
      movedPlayerIds: [],
      activeStrategy: null,
      activePlayerId: null
    });
  };

  const saveRanking = async () => {
    if (!playerName.trim()) return;
    const newRanking: Ranking = {
      name: playerName.trim(),
      score: gameState.score,
      mode: gameState.mode,
      date: Date.now()
    };

    try {
      // Submit to global database
      const response = await fetch('/api/rankings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRanking),
      });

      if (response.ok) {
        // Fetch updated rankings from database
        const rankingsResponse = await fetch('/api/rankings');
        if (rankingsResponse.ok) {
          const data = await rankingsResponse.json();
          const allRankings = [
            ...(data['streak-attack'] || []).map((r: any) => typeof r === 'string' ? JSON.parse(r) : r),
            ...(data['time-attack'] || []).map((r: any) => typeof r === 'string' ? JSON.parse(r) : r)
          ];
          setRankings(allRankings);
          localStorage.setItem('tsume_rankings', JSON.stringify(allRankings));
        }
      } else {
        // Fallback to localStorage if API fails
        const updated = [...rankings, newRanking].sort((a, b) => b.score - a.score).slice(0, 100);
        setRankings(updated);
        localStorage.setItem('tsume_rankings', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Failed to save ranking:', error);
      // Fallback to localStorage if API fails
      const updated = [...rankings, newRanking].sort((a, b) => b.score - a.score).slice(0, 100);
      setRankings(updated);
      localStorage.setItem('tsume_rankings', JSON.stringify(updated));
    }

    setGameState(prev => ({ ...prev, showNameInput: false }));
    setPlayerName('');
  };

  const startNextPossession = (prevScore: number, prevStreak: number) => {
    const initialPlayers = generateTacticalScenario();
    setHistory([]);
    setUndoUsed(false); // Reset undo for new possession
    setGameState(prev => ({
      ...prev,
      players: initialPlayers,
      score: prevScore,
      streak: prevStreak,
      turnCount: 0,
      activePlayerId: null,
      message: prev.mode === 'time-attack' ? 'Bucket! Keep moving!' : `Streak: ${prevStreak}. Keep it alive!`,
      movedPlayerIds: [],
      phase: 'off-ball',
      activeStrategy: null
    }));
  };

  const handleSquareClick = (pos: Position) => {
    if (gameState.status !== 'playing') return;
    const clickedPlayer = getPlayerAt(pos, gameState.players);
    const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId);

    if (gameState.phase === 'off-ball') {
      if (clickedPlayer && clickedPlayer.team === 'offense') {
        if (clickedPlayer.hasBall) {
          setGameState(prev => ({ ...prev, message: "Move support players first!" }));
          return;
        }
        if (gameState.movedPlayerIds.includes(clickedPlayer.id)) return;

        if (activePlayer && clickedPlayer.id === activePlayer.id) {
          // Deselect the player instead of finalizing position
          setGameState(prev => ({
            ...prev,
            activePlayerId: null,
            message: `Support moves: ${gameState.movedPlayerIds.length}/4`
          }));
          return;
        }
        setGameState(prev => ({ ...prev, activePlayerId: clickedPlayer.id }));
      } else if (activePlayer && !clickedPlayer && isValidMove(activePlayer, pos, gameState.players)) {
        saveToHistory();
        const nextPlayers = gameState.players.map(p => p.id === activePlayer.id ? { ...p, pos } : p);
        const nextMoved = [...gameState.movedPlayerIds, activePlayer.id];
        setGameState(prev => ({
          ...prev,
          players: nextPlayers,
          movedPlayerIds: nextMoved,
          activePlayerId: null,
          message: nextMoved.length >= 4 ? "Off-ball set. Choose Ball-Carrier movement." : `Support moves: ${nextMoved.length}/4`,
          phase: nextMoved.length >= 4 ? 'ball-carrier' : 'off-ball'
        }));
      }
    }
    else if (gameState.phase === 'ball-carrier') {
      const ballCarrier = gameState.players.find(p => p.hasBall)!;
      if (clickedPlayer && clickedPlayer.id === ballCarrier.id) {
        if (activePlayer && activePlayer.id === ballCarrier.id) {
          // Deselect the ball carrier instead of finalizing
          setGameState(prev => ({
            ...prev,
            activePlayerId: null,
            message: "Off-ball set. Choose Ball-Carrier movement."
          }));
          return;
        }
        setGameState(prev => ({ ...prev, activePlayerId: clickedPlayer.id }));
      } else if (activePlayer && activePlayer.id === ballCarrier.id && !clickedPlayer && isValidMove(activePlayer, pos, gameState.players)) {
        saveToHistory();
        const nextPlayers = gameState.players.map(p => p.id === activePlayer.id ? { ...p, pos } : p);

        // Check if ball carrier moved to basket position - automatic dunk!
        if (isPosEqual(pos, BASKET_POS)) {
          const result = canScore({ ...activePlayer, pos }, nextPlayers);
          if (result.success) {
            const newScore = gameState.score + (result.pts || 0);
            const newStreak = gameState.streak + 1;
            const newHigh = Math.max(newScore, gameState.highScore);
            localStorage.setItem('tsume_high_score', newHigh.toString());

            // Show slam dunk banner
            setBannerContent({ points: result.pts || 0, type: 'SLAM DUNK', message: '' });
            setShowBanner(true);

            setGameState(prev => ({ ...prev, players: nextPlayers, score: newScore, streak: newStreak, highScore: newHigh, message: `SLAM DUNK! +${result.pts}. Unstoppable!` }));
            setTimeout(() => {
              setShowBanner(false);
              startNextPossession(newScore, newStreak);
            }, 1200);
            return;
          }
        }

        setGameState(prev => ({
          ...prev,
          players: nextPlayers,
          phase: 'executing',
          activePlayerId: null,
          message: "Action Phase: Finalize with a Shot or Pass."
        }));
      }
    }
    else if (gameState.phase === 'passing') {
      const ballCarrier = gameState.players.find(p => p.hasBall)!;
      if (clickedPlayer && clickedPlayer.team === 'offense' && clickedPlayer.id !== ballCarrier.id) {
        if (canPassToTeammate(ballCarrier, clickedPlayer, gameState.players)) {
          const nextPlayers = gameState.players.map(p => {
            if (p.id === ballCarrier.id) return { ...p, hasBall: false };
            if (p.id === clickedPlayer.id) return { ...p, hasBall: true };
            return p;
          });
          // Clear history after pass - can't undo past this point
          setHistory([]);
          triggerAiReaction(nextPlayers);
        } else {
          setGameState(prev => ({ ...prev, message: "Pass lane denied by defense!" }));
        }
      }
    }
  };

  const triggerAiReaction = (offensePlayers: Player[]) => {
    const nextTurnCount = gameState.turnCount + 1;
    if (nextTurnCount >= gameState.maxTurns) {
      // Show time up banner
      setBannerContent({ points: 0, type: '', message: 'TIME UP!' });
      setShowBanner(true);

      setTimeout(() => {
        setShowBanner(false);
        setGameState(prev => ({ ...prev, status: 'lost', message: "TIME UP! GAME OVER", showNameInput: true }));
      }, 1500);
      return;
    }
    const playersAfterAI = aiOptimalWall(offensePlayers);
    setUndoUsed(false); // Reset undo for new turn after AI reaction
    setGameState(prev => ({
      ...prev,
      players: playersAfterAI,
      turnCount: nextTurnCount,
      phase: 'off-ball',
      movedPlayerIds: [],
      message: `Turn ${nextTurnCount + 1}: Move supports.`
    }));
  };

  const handleShoot = () => {
    const ballCarrier = gameState.players.find(p => p.hasBall)!;
    const result = canScore(ballCarrier, gameState.players);
    if (result.success) {
      const newScore = gameState.score + (result.pts || 0);
      const newStreak = gameState.streak + 1;
      const newHigh = Math.max(newScore, gameState.highScore);
      localStorage.setItem('tsume_high_score', newHigh.toString());

      // Show scoring banner
      setBannerContent({ points: result.pts || 0, type: result.type || '', message: '' });
      setShowBanner(true);

      setGameState(prev => ({ ...prev, score: newScore, streak: newStreak, highScore: newHigh, message: `BUCKET! ${result.type} +${result.pts}.` }));
      setTimeout(() => {
        setShowBanner(false);
        startNextPossession(newScore, newStreak);
      }, 1200);
    } else {
      saveToHistory();
      setGameState(prev => ({
        ...prev,
        message: `BLOCKED! ${result.reason || "Shot contested."} Find an open spot or pass!`
      }));
    }
  };

  const selectStrategy = (strat: StrategyType) => {
    saveToHistory();
    // Toggle: if clicking same strategy, turn it off
    const newStrategy = gameState.activeStrategy === strat ? null : strat;
    setGameState(prev => ({
      ...prev,
      activeStrategy: newStrategy,
      message: newStrategy ? `Strategy: ${newStrategy.replace('-', ' ')}.` : 'Strategy cleared.'
    }));
  };

  const strategyHighlights = getStrategyHighlights(gameState.players, gameState.activeStrategy);

  const passablePlayerIds = useMemo(() => {
    if (gameState.phase !== 'passing') return [];
    const ballCarrier = gameState.players.find(p => p.hasBall);
    if (!ballCarrier) return [];
    return gameState.players
      .filter(p => p.team === 'offense' && p.id !== ballCarrier.id && canPassToTeammate(ballCarrier, p, gameState.players))
      .map(p => p.id);
  }, [gameState.phase, gameState.players]);

  const activeValidMoves = useMemo(() => {
    if (!gameState.activePlayerId) return [];
    const player = gameState.players.find(p => p.id === gameState.activePlayerId);
    if (!player) return [];
    
    const moves: Position[] = [];
    moves.push(player.pos);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const target = { x: player.pos.x + dx, y: player.pos.y + dy };
        if (isValidMove(player, target, gameState.players)) {
          moves.push(target);
        }
      }
    }
    return moves;
  }, [gameState.activePlayerId, gameState.players]);

  const streakRankings = rankings.filter(r => r.mode === 'streak-attack').sort((a, b) => b.score - a.score);
  const timeRankings = rankings.filter(r => r.mode === 'time-attack').sort((a, b) => b.score - a.score);

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${m}/${d} ${h}:${min}`;
  };

  const RankingTable = ({ title, data, icon }: { title: string, data: Ranking[], icon: string }) => (
    <div className="flex-1 min-w-[300px] mb-6">
      <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2 px-2">
        <i className={`fa-solid ${icon} text-orange-500`}></i> {title}
      </h3>
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
        <div className="max-h-64 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left text-[9px] font-bold border-collapse">
            <thead className="bg-black/50 sticky top-0 text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
              <tr>
                <th className="p-3 w-10 text-center">POS</th>
                <th className="p-3">PLAYER</th>
                <th className="p-3 text-right">DATE</th>
                <th className="p-3 text-right">SCORE</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {data.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-zinc-600 italic">No records yet.</td></tr>
              ) : (
                data.map((r, i) => (
                  <tr key={i} className={`border-b border-zinc-800/30 ${i < 3 ? 'bg-orange-500/5' : ''}`}>
                    <td className="p-3 text-center text-zinc-500">{i + 1}</td>
                    <td className="p-3 text-white uppercase truncate max-w-[100px]">{r.name}</td>
                    <td className="p-3 text-right text-[8px] text-zinc-500 font-normal">{formatDate(r.date)}</td>
                    <td className="p-3 text-right font-black text-orange-500">{r.score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const getPhaseText = (phase: string) => {
    switch (phase) {
      case 'off-ball': return 'OFF-BALL MOVEMENT';
      case 'ball-carrier': return 'Ball-Carrier Action';
      case 'executing': return 'Finish Choice';
      case 'passing': return 'Passing Lane';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-zinc-950 p-3 md:p-6 selection:bg-orange-500 overflow-x-hidden pb-10">
      <header className="w-full max-w-lg mb-4 text-center">
        <h1 className="text-xl md:text-2xl font-black text-orange-500 tracking-tighter italic uppercase">Tsume Basketball</h1>
        {gameState.mode === 'time-attack' && (
          <div className="flex justify-center text-[10px] font-bold uppercase text-zinc-500 tracking-widest mt-1">
            <span>Time: <span className="text-red-500">{gameState.timeLeft}s</span></span>
          </div>
        )}
      </header>

      <div className="w-full max-w-lg flex flex-col gap-3">
        {gameState.phase === 'menu' ? (
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col gap-4">
            <h2 className="text-sm font-black text-white uppercase tracking-widest text-center">Select Game Mode</h2>
            <button onClick={() => startGame('streak-attack')} className="bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest transition-all shadow-[0_4px_15px_rgba(234,88,12,0.3)]">Score Attack (Streak)</button>
            <button onClick={() => startGame('time-attack')} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest transition-all shadow-[0_4px_15px_rgba(37,99,235,0.3)]">Time Attack (1 Min)</button>
            <p className="text-[9px] text-zinc-500 text-center leading-relaxed font-bold">Streak mode: One miss ends the game.<br/>Time Attack: Score as many as possible within 60s.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 w-full h-fit">
              <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-[8px] font-black text-white uppercase">Turn Progression</h2>
                  <span className="text-[8px] text-orange-500 font-black">{gameState.turnCount + 1}/4</span>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i < gameState.turnCount ? 'bg-zinc-800' : 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]'}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              <Board
                players={gameState.players}
                onSquareClick={handleSquareClick}
                activePlayerId={gameState.activePlayerId}
                movedPlayerIds={gameState.movedPlayerIds}
                strategyHighlights={strategyHighlights}
                passablePlayerIds={passablePlayerIds}
                validMoves={activeValidMoves}
                activeStrategy={gameState.activeStrategy}
                phase={gameState.phase}
                showStrategySuggestions={gameState.activeStrategy !== null}
                streak={gameState.streak}
                score={gameState.score}
              />

              {/* Score/Game Over Banner */}
              {showBanner && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                  <div className={`animate-[bounce_0.5s_ease-in-out] ${bannerContent.message ? 'bg-red-600' : 'bg-gradient-to-r from-orange-500 to-yellow-500'} px-8 py-6 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 ${bannerContent.message ? 'border-red-800' : 'border-yellow-300'}`}>
                    {bannerContent.message === 'LOCKED UP!' ? (
                      <div className="text-center">
                        <div className="text-6xl font-black text-white uppercase tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-pulse">
                          🔒 LOCKED UP! 🔒
                        </div>
                        <div className="text-2xl font-black text-red-100 uppercase tracking-wider mt-2">
                          Game Over!
                        </div>
                      </div>
                    ) : bannerContent.message === 'TIME UP!' ? (
                      <div className="text-center">
                        <div className="text-6xl font-black text-white uppercase tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-pulse">
                          ⏱️ TIME UP! ⏱️
                        </div>
                        <div className="text-2xl font-black text-red-100 uppercase tracking-wider mt-2">
                          Game Over!
                        </div>
                      </div>
                    ) : bannerContent.message === 'TIME EXPIRED!' ? (
                      <div className="text-center">
                        <div className="text-6xl font-black text-white uppercase tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-pulse">
                          ⏰ TIME EXPIRED! ⏰
                        </div>
                        <div className="text-2xl font-black text-red-100 uppercase tracking-wider mt-2">
                          Game Over!
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-7xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-pulse">
                          +{bannerContent.points}
                        </div>
                        <div className="text-2xl font-black text-yellow-100 uppercase tracking-wider mt-2">
                          {bannerContent.type}
                        </div>
                        <div className="text-4xl mt-3 animate-bounce">
                          {bannerContent.points === 3 ? '🏀🔥' : '💥'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {gameState.status === 'playing' && (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => selectStrategy('pick-and-roll')} className={`py-2 rounded-xl text-[8px] font-black uppercase transition-all border ${gameState.activeStrategy === 'pick-and-roll' ? 'bg-orange-600 border-orange-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>Pick & Roll</button>
                <button onClick={() => selectStrategy('floor-spacing')} className={`py-2 rounded-xl text-[8px] font-black uppercase transition-all border ${gameState.activeStrategy === 'floor-spacing' ? 'bg-orange-600 border-orange-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>Spacing</button>
                <button onClick={() => selectStrategy('backdoor-cut')} className={`py-2 rounded-xl text-[8px] font-black uppercase transition-all border ${gameState.activeStrategy === 'backdoor-cut' ? 'bg-orange-600 border-orange-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>Backdoor</button>
              </div>
            )}

            <div className="flex flex-col gap-2 w-full">
              {gameState.phase === 'off-ball' && gameState.status === 'playing' && (
                <button 
                  onClick={() => { saveToHistory(); setGameState(p => ({ ...p, phase: 'ball-carrier' })); }} 
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest border-2 border-blue-400 hover:bg-blue-500 transition-all shadow-[0_4px_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 group"
                >
                  <i className="fa-solid fa-check-double text-blue-200 group-hover:scale-110 transition-transform"></i>
                  Finalize Off-Ball Movement
                </button>
              )}
              {gameState.phase === 'ball-carrier' && gameState.status === 'playing' && (
                <button
                  onClick={() => { saveToHistory(); setGameState(p => ({ ...p, phase: 'executing', activePlayerId: null })); }}
                  className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest border-2 border-emerald-400 hover:bg-emerald-500 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 group"
                >
                  <i className="fa-solid fa-basketball text-emerald-100 group-hover:animate-bounce"></i>
                  Finalize Ball Holder Position
                </button>
              )}
              {gameState.phase === 'executing' && gameState.status === 'playing' && (
                <div className="flex gap-2">
                  <button onClick={handleShoot} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black py-3 rounded-xl uppercase text-sm shadow-lg hover:brightness-110 transition-all">Shoot</button>
                  <button onClick={() => { saveToHistory(); setGameState(p => ({ ...p, phase: 'passing' })); }} className="flex-1 bg-zinc-800 text-white font-black py-3 rounded-xl uppercase text-sm border border-zinc-700 hover:bg-zinc-700 transition-all">Pass</button>
                </div>
              )}
              {gameState.phase === 'passing' && (
                <div className="text-center py-2 bg-zinc-900 border border-yellow-500/30 rounded-xl animate-pulse text-yellow-500 font-black uppercase text-[10px]">Choose Target for Pass</div>
              )}

              {gameState.showNameInput && (
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-700 shadow-xl flex flex-col gap-3">
                  <h3 className="text-white text-[10px] font-black uppercase text-center">New Score: {gameState.score}!</h3>
                  <input
                    type="text"
                    placeholder="ENTER NAME"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 10))}
                    className="bg-black border border-zinc-700 rounded-lg p-2 text-white text-center text-xs font-black outline-none focus:border-orange-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveRanking} className="flex-1 bg-emerald-600 text-white font-black py-2 rounded-lg uppercase text-[10px]">Submit Record</button>
                    <button onClick={() => setGameState(prev => ({ ...prev, phase: 'menu', status: 'idle', showNameInput: false }))} className="flex-1 bg-zinc-700 text-white font-black py-2 rounded-lg uppercase text-[10px] border border-zinc-600">Skip</button>
                  </div>
                </div>
              )}

              {gameState.status === 'lost' && !gameState.showNameInput && (
                <button onClick={() => setGameState(prev => ({ ...prev, phase: 'menu', status: 'idle' }))} className="w-full bg-orange-600 text-white font-black py-3 rounded-xl uppercase text-sm shadow-xl animate-pulse">Back to Main Menu</button>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleUndo}
                disabled={history.length === 0 || gameState.status !== 'playing' || undoUsed}
                className={`w-full font-black py-3 rounded-lg uppercase text-[10px] flex items-center justify-center gap-2 transition-colors border ${history.length === 0 || gameState.status !== 'playing' || undoUsed ? 'bg-zinc-900 border-zinc-800 text-zinc-700' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 shadow-md'}`}
              >
                <i className="fa-solid fa-rotate-left"></i> Undo {undoUsed ? '(Used)' : 'Step'}
              </button>
            </div>
          </>
        )}

        <div className="mt-6 w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-lg">
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <i className="fa-solid fa-circle-info text-orange-500"></i> Rules
            </h2>
            
            <div className="space-y-4">
              <section>
                <h3 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 border-b border-zinc-800 pb-0.5">Scoring Requirements</h3>
                <div className="space-y-2 text-[9px] font-bold text-zinc-400 leading-relaxed uppercase">
                  <p><span className="text-white">THREE WAYS TO SCORE:</span> You can score in <span className="text-orange-400">THREE DIFFERENT WAYS</span> - shoot from the arc, drive to the rim, or slam dunk at the basket!</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><span className="text-white">3-Pointer:</span> MUST be <span className="text-orange-400">EXACTLY ON THE WHITE ARC LINE</span> + NO adjacent defenders.</li>
                    <li><span className="text-white">Slam Dunk:</span> Move ball-carrier <span className="text-orange-400">INTO THE BASKET</span> to instantly score 2PT!</li>
                    <li><span className="text-white">Layup (2PT):</span> ONLY from <span className="text-orange-400">LIGHT ORANGE BLOCKS</span> on the court + rim area must be <span className="text-red-500">EMPTY</span> of defenders.</li>
                  </ul>
                  <p className="mt-2"><span className="text-white">How to Screen:</span> To create space, place an <span className="text-white">off-ball support player</span> directly next to a defender (horizontally or vertically). Screened defenders are <span className="text-white">FROZEN</span> and cannot move for one turn.</p>
                  <p className="mt-2"><span className="text-white">Undo Limit:</span> You can only undo <span className="text-orange-400">ONE action per turn</span>. Button shows "(Used)" after use.</p>
                </div>
              </section>

              <section>
                <h3 className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1.5 border-b border-zinc-800 pb-0.5">Defensive Strategy (AI)</h3>
                <div className="space-y-2 text-[9px] font-bold text-zinc-400 leading-relaxed uppercase">
                   <p><span className="text-white">Blocking shots:</span> Defenders block you automatically by staying <span className="text-white">ADJACENT</span> to you. Move to space and force them to react.</p>
                   <ul className="list-disc pl-4 space-y-1">
                    <li><span className="text-white">Positioning:</span> AI prioritizes staying between the ball-carrier and the rim.</li>
                    <li><span className="text-white">Rim Protection:</span> Defenders will rotate to the basket if you get too close.</li>
                    <li><span className="text-white">Denial:</span> They will step into pass lanes to prevent easy assists.</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>

          <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <i className="fa-solid fa-ranking-star text-yellow-500"></i> Hall of Fame
          </h2>
          <div className="flex flex-col gap-4 overflow-x-hidden">
             <RankingTable title="Score Attack (Streak)" data={streakRankings} icon="fa-fire" />
             <RankingTable title="Time Attack (1 Min)" data={timeRankings} icon="fa-bolt" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
