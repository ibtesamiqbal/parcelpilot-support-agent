import express from 'express';
import { getAllAccounts, getAccountById } from '../data/loadStructured.js';

const router = express.Router();

/** GET /api/accounts returns list of customer accounts for mock login. */
router.get('/accounts', (req, res) => {
  const accounts = getAllAccounts();
  res.json({ accounts });
});

/** POST /api/login sets active session account. */
router.post('/login', (req, res) => {
  const { accountId } = req.body || {};
  const account = getAccountById(accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.json({ status: 'ok', account });
});

export default router;
