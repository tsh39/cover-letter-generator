import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { uploadRouter } from './routes/upload.js';
import { generateRouter } from './routes/generate.js';
import { exportRouter } from './routes/export.js';
import { cleanupExpiredSessions } from './storage/userFiles.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/generate', generateRouter);
app.use('/api/export', exportRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Cleanup expired sessions on startup
cleanupExpiredSessions();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
