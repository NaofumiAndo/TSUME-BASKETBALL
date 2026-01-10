import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Ranking {
  name: string;
  score: number;
  mode: 'streak-attack' | 'time-attack';
  date: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: Fetch all rankings
    if (req.method === 'GET') {
      const streakRankings = await kv.zrange<Ranking>('rankings:streak-attack', 0, 99, {
        rev: true,
      }) || [];

      const timeRankings = await kv.zrange<Ranking>('rankings:time-attack', 0, 99, {
        rev: true,
      }) || [];

      return res.status(200).json({
        'streak-attack': streakRankings,
        'time-attack': timeRankings,
      });
    }

    // POST: Submit new ranking
    if (req.method === 'POST') {
      const { name, score, mode } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid name' });
      }

      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ error: 'Invalid score' });
      }

      if (mode !== 'streak-attack' && mode !== 'time-attack') {
        return res.status(400).json({ error: 'Invalid mode' });
      }

      const ranking: Ranking = {
        name: name.trim().toUpperCase().slice(0, 10),
        score,
        mode,
        date: Date.now(),
      };

      // Store in KV using sorted set (sorted by score)
      // Key format: rankings:{mode}
      // Member: JSON stringified ranking
      // Score: the actual game score (for sorting)
      const key = `rankings:${mode}`;

      await kv.zadd(key, {
        score: ranking.score,
        member: JSON.stringify(ranking),
      });

      // Keep only top 100 rankings
      await kv.zremrangebyrank(key, 0, -101);

      return res.status(201).json({ success: true, ranking });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Rankings API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
