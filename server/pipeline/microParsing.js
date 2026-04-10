import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a job description analyst. Parse the provided job posting into structured data. Respond in JSON only — no markdown fences, no commentary.

Keep all string fields to 1–2 concise sentences.
Lists should contain no more than 8 items.

Required JSON schema:
{
  "roleTitle": "string",
  "team": "string",
  "hardRequirements": ["string"],
  "softPreferences": ["string"],
  "keywords": ["string"],
  "successSignals": "string"
}`;

/**
 * Parse a job description into structured data using Haiku.
 * @param {string} jobText - Raw job posting text
 * @returns {Promise<object>} Parsed JD data
 */
export async function microParsing(jobText) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Parse this job posting into structured data:\n\n${jobText}`,
      },
    ],
  });

  const text = response.content[0].text;
  try {
    return JSON.parse(text);
  } catch (err) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse job description response as JSON.');
  }
}
