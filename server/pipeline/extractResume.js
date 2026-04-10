import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a resume parser. Extract only professionally relevant content from the provided resume text. Respond in JSON only — no markdown fences, no commentary, no explanation.

Each string field must be 1–2 concise sentences maximum.
Lists should contain no more than 5 items. Prioritize the most impactful and relevant entries.

Strip all formatting, addresses, references, objective statements, and irrelevant sections.

Required JSON schema:
{
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "achievement": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"]
    }
  ],
  "quantifiedAccomplishments": ["string"]
}`;

/**
 * Extract and condense a resume into structured JSON using Haiku.
 * @param {string} resumeText - Raw resume text
 * @returns {Promise<object>} Condensed resume data
 */
export async function extractResume(resumeText) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract the key professional content from this resume:\n\n${resumeText}`,
      },
    ],
  });

  const text = response.content[0].text;
  try {
    return JSON.parse(text);
  } catch (err) {
    // Try to extract JSON from the response if it has extra text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse resume extraction response as JSON.');
  }
}
