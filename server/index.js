import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const SNAPSHOT_TIME = '2026-08-16T11:00:00+05:30';

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', chatRouter);
app.use('/api', authRouter);
app.use('/api', dashboardRouter);

/** Returns health status and system snapshot timestamp. */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    snapshot: SNAPSHOT_TIME,
    timestamp: new Date().toISOString()
  });
});

// Serve static frontend build
const distPath = path.resolve('client/dist');
app.use(express.static(distPath));

// SPA fallback for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.resolve('client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`[ParcelPilot Backend] Server running on port ${PORT}`);
});

export default app;
