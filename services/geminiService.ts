
import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";

export const getHintFromGemini = async (gameState: GameState): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Coach, analyze this Tsume Basketball state:
      - Phase: ${gameState.phase}
      - Turn: ${gameState.turnCount}/5
      - Players: ${JSON.stringify(gameState.players)}
      - Goal: Score at (4,1).

      Templates Available:
      1. Pick & Roll: Screens the ball-carrier's defender.
      2. Floor Spacing: Stretches the AI's Denial logic.
      3. Backdoor Cut: Exploits tight denial.

      Rules:
      - 3PT: On arc, no adjacent defenders.
      - Layup: In paint, empty path.
      - AI priorities: Switch, Ball-Man, Rim Protect, Denial.

      Give 1 specific tactical tip (max 12 words) suggesting a strategy or movement.`,
    });
    return response.text || "Move to space the floor.";
  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return "Execute the Pick & Roll!";
  }
};
