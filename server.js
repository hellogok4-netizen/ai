require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store live game states (in-memory for demo)
const liveGames = new Map();

// ═══════════════════════════════════
//  AI GENERATION ENDPOINT
// ═══════════════════════════════════

app.post('/api/generate', async (req, res) => {
  const { prompt, type } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert Roblox Luau Developer. 
          Generate clean, efficient, and well-commented Luau code based on the user's request.
          Focus on modern Roblox standards (use task.wait, TaskLibrary, etc.).
          Always wrap the code in a single code block. 
          Provide a brief explanation of how to use it in Roblox Studio.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const output = completion.choices[0].message.content;
    res.json({ output });
  } catch (error) {
    console.error('Groq Error:', error);
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// ═══════════════════════════════════
//  ROBLOX SYNC ENDPOINTS
// ═══════════════════════════════════

// Roblox games POST their status here
app.post('/api/sync', (req, res) => {
  const { gameId, serverId, playerCount, gameTime, data } = req.body;

  if (!gameId) return res.status(400).json({ error: 'Missing gameId' });

  // Update game state
  liveGames.set(gameId, {
    gameId,
    serverId,
    playerCount,
    gameTime,
    lastSeen: Date.now(),
    data: data || {}
  });

  // Check if there are any pending commands for this game
  const command = pendingCommands.get(gameId) || null;
  if (command) pendingCommands.delete(gameId);

  res.json({
    success: true,
    serverTime: Date.now(),
    command: command
  });
});

const pendingCommands = new Map();

// Dashboard sends commands to Roblox here
app.post('/api/command', (req, res) => {
  const { gameId, action, payload } = req.body;
  if (!gameId || !action) return res.status(400).json({ error: 'Missing parameters' });

  pendingCommands.set(gameId, { action, payload });
  res.json({ success: true, message: `Command queued for game ${gameId}` });
});

// Get all active games for the dashboard
app.get('/api/games', (req, res) => {
  const activeGames = Array.from(liveGames.values()).filter(g => Date.now() - g.lastSeen < 60000); // 1 min timeout
  res.json(activeGames);
});

// ═══════════════════════════════════
//  SERVE FRONTEND
// ═══════════════════════════════════

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Roblox AI Architect Server running at http://localhost:${PORT}`);
  console.log(`🔑 Connected to Groq AI Engine\n`);
});
