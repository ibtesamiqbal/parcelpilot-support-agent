import express from 'express';
import { runAgentLoop } from '../agent/loop.js';

const router = express.Router();

/** POST /api/chat handles customer support chat messages. */
router.post('/chat', async (req, res) => {
  try {
    const { message, accountId = 'ACCT-001', history = [] } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'message field is required' });
    }

    const result = await runAgentLoop({ message, accountId, history });
    res.json({
      reply: result.reply,
      toolCalls: result.toolCalls || [],
      pendingConfirmation: Boolean(result.pendingConfirmation)
    });
  } catch (err) {
    console.error('[Chat API Error]', err);
    res.status(500).json({ error: 'Agent execution failed', details: err.message });
  }
});

export default router;
