
import { Scenario, Position } from './types';

export const GRID_SIZE = 9;
export const BASKET_POS = { x: 4, y: 1 }; 
export const PAINT_BOUNDS = { xMin: 3, xMax: 5, yMin: 1, yMax: 3 };

// Adjusted 3pt arc to have 5 points in the middle section (y=5)
export const THREE_POINT_LINE: Position[] = [
  { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 },
  { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
  { x: 7, y: 4 }, { x: 7, y: 3 }, { x: 7, y: 2 }, { x: 7, y: 1 }
];

export const INITIAL_SCENARIOS: Scenario[] = [
  {
    id: '1',
    name: 'Streak Level 1',
    description: 'Establish the rhythm. Score to keep the streak alive.',
    players: [
      { id: 'o1', team: 'offense', role: 'PG', pos: { x: 4, y: 7 }, hasBall: true, name: 'PG' },
      { id: 'o2', team: 'offense', role: 'SG', pos: { x: 1, y: 5 }, hasBall: false, name: 'SG' },
      { id: 'o3', team: 'offense', role: 'SF', pos: { x: 7, y: 5 }, hasBall: false, name: 'SF' },
      { id: 'o4', team: 'offense', role: 'PF', pos: { x: 3, y: 3 }, hasBall: false, name: 'PF' },
      { id: 'o5', team: 'offense', role: 'C', pos: { x: 5, y: 3 }, hasBall: false, name: 'C' },
      { id: 'd1', team: 'defense', role: 'PG', pos: { x: 4, y: 5 }, hasBall: false, name: 'D1', assignedTo: 'o1' },
      { id: 'd2', team: 'defense', role: 'SG', pos: { x: 2, y: 4 }, hasBall: false, name: 'D2', assignedTo: 'o2' },
      { id: 'd3', team: 'defense', role: 'SF', pos: { x: 6, y: 4 }, hasBall: false, name: 'D3', assignedTo: 'o3' },
      { id: 'd4', team: 'defense', role: 'PF', pos: { x: 3, y: 2 }, hasBall: false, name: 'D4', assignedTo: 'o4' },
      { id: 'd5', team: 'defense', role: 'C', pos: { x: 5, y: 2 }, hasBall: false, name: 'D5', assignedTo: 'o5' },
    ]
  }
];
