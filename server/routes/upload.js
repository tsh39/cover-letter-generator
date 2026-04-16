import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { saveFiles, clearCachedResume } from '../storage/userFiles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'storage', '_uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedResume = ['.pdf', '.docx'];
    const allowedOther = ['.pdf', '.docx', '.txt'];

    if (file.fieldname === 'resume' && !allowedResume.includes(ext)) {
      cb(new Error('Resume must be a PDF or DOCX file.'));
      return;
    }
    if ((file.fieldname === 'bio' || file.fieldname === 'sample') && !allowedOther.includes(ext)) {
      cb(new Error(`${file.fieldname} must be a PDF, DOCX, or TXT file.`));
      return;
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();

const uploadFields = upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'bio', maxCount: 1 },
  { name: 'sample', maxCount: 1 },
]);

uploadRouter.post('/', (req, res) => {
  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
        });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || !req.files.resume) {
      return res.status(400).json({ error: 'Resume file is required.' });
    }

    // If a sessionId was provided (re-upload), reuse it and clear cached extraction
    let sessionId = req.body.sessionId;
    if (sessionId) {
      clearCachedResume(sessionId);
    } else {
      sessionId = uuidv4();
    }

    try {
      saveFiles(sessionId, req.files);
      res.json({ sessionId });
    } catch (saveErr) {
      console.error('Failed to save files:', saveErr);
      res.status(500).json({ error: 'Failed to save uploaded files.' });
    }
  });
});
