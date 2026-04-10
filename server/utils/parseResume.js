import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extract plain text from a PDF or DOCX file.
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string>} Extracted text content
 */
export async function parseResume(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('Could not extract text from PDF. The file may be image-based — try uploading a .docx instead.');
    }
    return data.text.trim();
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('Could not extract text from DOCX. The file may be empty or corrupted.');
    }
    return result.value.trim();
  }

  if (ext === '.txt') {
    const text = fs.readFileSync(filePath, 'utf-8');
    return text.trim();
  }

  throw new Error(`Unsupported file format: ${ext}. Please upload a PDF, DOCX, or TXT file.`);
}
