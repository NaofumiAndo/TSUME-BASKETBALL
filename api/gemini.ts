import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameState } = req.body;

    if (!gameState) {
      return res.status(400).json({ error: 'Missing gameState in request body' });
    }

    // API key is stored securely in Vercel environment variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const ai = new GoogleGenAI({ apiKey });
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

    return res.status(200).json({ hint: response.text || "Move to space the floor." });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      error: 'Failed to get hint',
      hint: "Execute the Pick & Roll!"
    });
  }
}
