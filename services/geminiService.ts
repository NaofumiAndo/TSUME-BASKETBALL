import { GameState } from "../types";

export const getHintFromGemini = async (gameState: GameState): Promise<string> => {
  try {
    // Call the secure serverless API instead of directly calling Gemini
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gameState }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.hint || "Move to space the floor.";
  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return "Execute the Pick & Roll!";
  }
};
