import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Save uploaded files to a session directory.
 * @param {string} sessionId
 * @param {object} files - Multer files object { resume, bio, sample }
 */
export function saveFiles(sessionId, files) {
  const sessionDir = path.join(STORAGE_DIR, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  // Write a timestamp for TTL-based cleanup
  fs.writeFileSync(path.join(sessionDir, '.created'), Date.now().toString());

  for (const [fieldName, fileArr] of Object.entries(files)) {
    const file = fileArr[0];
    const ext = path.extname(file.originalname).toLowerCase();
    const dest = path.join(sessionDir, `${fieldName}${ext}`);
    fs.renameSync(file.path, dest);
  }
}

/**
 * Get file paths for a session's uploaded files.
 * @param {string} sessionId
 * @returns {{ resume: string|null, bio: string|null, sample: string|null }}
 */
export function getFilePaths(sessionId) {
  const sessionDir = path.join(STORAGE_DIR, sessionId);
  if (!fs.existsSync(sessionDir)) {
    return { resume: null, bio: null, sample: null };
  }

  const files = fs.readdirSync(sessionDir);
  const result = { resume: null, bio: null, sample: null };

  for (const file of files) {
    if (file.startsWith('resume')) result.resume = path.join(sessionDir, file);
    if (file.startsWith('bio')) result.bio = path.join(sessionDir, file);
    if (file.startsWith('sample')) result.sample = path.join(sessionDir, file);
  }

  return result;
}

/**
 * Save cached resume extraction JSON.
 * @param {string} sessionId
 * @param {object} extractedData
 */
export function saveCachedResume(sessionId, extractedData) {
  const sessionDir = path.join(STORAGE_DIR, sessionId);
  fs.writeFileSync(
    path.join(sessionDir, 'extractedResume.json'),
    JSON.stringify(extractedData, null, 2)
  );
}

/**
 * Load cached resume extraction JSON if it exists.
 * @param {string} sessionId
 * @returns {object|null}
 */
export function loadCachedResume(sessionId) {
  const cachePath = path.join(STORAGE_DIR, sessionId, 'extractedResume.json');
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  }
  return null;
}

/**
 * Clear cached resume extraction (called when a new resume is uploaded).
 * @param {string} sessionId
 */
export function clearCachedResume(sessionId) {
  const cachePath = path.join(STORAGE_DIR, sessionId, 'extractedResume.json');
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

/**
 * Delete a session directory.
 * @param {string} sessionId
 */
export function cleanupSession(sessionId) {
  const sessionDir = path.join(STORAGE_DIR, sessionId);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
}

/**
 * Remove sessions older than SESSION_TTL_HOURS.
 */
export function cleanupExpiredSessions() {
  const ttlMs = (parseInt(process.env.SESSION_TTL_HOURS) || 24) * 60 * 60 * 1000;
  
  if (!fs.existsSync(STORAGE_DIR)) return;

  const sessions = fs.readdirSync(STORAGE_DIR);
  let cleaned = 0;

  for (const sessionId of sessions) {
    const createdFile = path.join(STORAGE_DIR, sessionId, '.created');
    if (fs.existsSync(createdFile)) {
      const created = parseInt(fs.readFileSync(createdFile, 'utf-8'));
      if (Date.now() - created > ttlMs) {
        cleanupSession(sessionId);
        cleaned++;
      }
    }
  }

  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired session(s)`);
  }
}
