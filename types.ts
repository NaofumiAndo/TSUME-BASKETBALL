
export type Team = 'offense' | 'defense';
export type PlayerRole = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type TurnPhase = 'off-ball' | 'ball-carrier' | 'executing' | 'ai' | 'passing' | 'menu';
export type StrategyType = 'pick-and-roll' | 'floor-spacing' | 'backdoor-cut' | null;
export type GameMode = 'streak-attack-lv1' | 'streak-attack-lv2' | 'time-attack';

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  team: Team;
  role: PlayerRole;
  pos: Position;
  hasBall: boolean;
  name: string;
  assignedTo?: string; 
}

export interface Ranking {
  name: string;
  score: number;
  mode: GameMode;
  date: number;
}

export interface GameState {
  players: Player[];
  score: number;
  streak: number;
  highScore: number;
  turnCount: number;
  maxTurns: number;
  status: 'playing' | 'won' | 'lost' | 'idle';
  activePlayerId: string | null;
  message: string;
  movedPlayerIds: string[];
  phase: TurnPhase;
  activeStrategy: StrategyType;
  mode: GameMode;
  timeLeft: number; // in seconds
  showNameInput: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  players: Player[];
}
