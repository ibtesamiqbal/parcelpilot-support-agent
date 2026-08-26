import express from 'express';
import { detectProactiveIssues } from '../insights/detectIssues.js';

const router = express.Router();

/** GET /api/dashboard returns proactive issue detection signals for internal dashboard. */
router.get('/dashboard', (req, res) => {
  try {
    const data = detectProactiveIssues();
    res.json(data);
  } catch (err) {
    console.error('[Dashboard API Error]', err);
    res.status(500).json({ error: 'Failed to compute dashboard issues', details: err.message });
  }
});

export default router;
