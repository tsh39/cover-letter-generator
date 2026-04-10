/**
 * Fetch a job posting page and extract clean text content.
 * @param {string} url - The job posting URL
 * @returns {Promise<{ rawText: string, companyDomain: string }>}
 */
export async function fetchJob(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error('The job posting page took too long to load. Please check the URL and try again.');
    }
    throw new Error(`Could not reach the job posting page: ${err.message}`);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Job posting not found (404). The listing may have been removed.');
    }
    if (response.status === 403 || response.status === 401) {
      throw new Error('Access denied. This job posting may require login or is behind a paywall.');
    }
    throw new Error(`Failed to fetch job posting (HTTP ${response.status}).`);
  }

  const html = await response.text();
  const rawText = stripHtml(html);

  if (rawText.length < 100) {
    throw new Error('Could not extract meaningful content from the job posting page. The page may be dynamically loaded or require JavaScript.');
  }

  // Extract company domain from URL
  const companyDomain = new URL(url).hostname.replace('www.', '');

  // Truncate to ~8000 chars at a sentence boundary to control token usage
  const truncated = truncateAtSentence(rawText, 8000);

  return { rawText: truncated, companyDomain };
}

/**
 * Strip HTML tags, scripts, styles, and excess whitespace from HTML content.
 */
function stripHtml(html) {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate text at a sentence boundary near the target length.
 */
function truncateAtSentence(text, maxLength) {
  if (text.length <= maxLength) return text;

  // Look for the last sentence-ending punctuation before maxLength
  const truncated = text.slice(0, maxLength);
  const lastPeriod = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  );

  if (lastPeriod > maxLength * 0.5) {
    return truncated.slice(0, lastPeriod + 1);
  }
  return truncated;
}
