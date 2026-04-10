import { Router } from 'express';
import { generateDocx } from '../utils/exportDocx.js';

export const exportRouter = Router();

exportRouter.get('/:sessionId', async (req, res) => {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({ error: 'Letter text is required (pass as ?text= query param).' });
  }

  try {
    const letterText = decodeURIComponent(text);
    const buffer = await generateDocx(letterText);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="cover_letter.docx"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to generate document.' });
  }
});
