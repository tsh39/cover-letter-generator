import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a company research analyst. Given a company name or domain and a job posting excerpt, research the company and produce a concise company brief.

Respond in JSON only — no markdown fences, no commentary.
Each string field must be 1-2 concise sentences maximum.

Required JSON schema:
{
  "companyName": "string",
  "whatTheyDo": "string",
  "mission": "string",
  "culture": "string",
  "recentDevelopments": "string",
  "strategicMoment": "string"
}`;

/**
 * Research a company using web search and produce a structured brief.
 * @param {string} companyDomain - Company domain extracted from job URL
 * @param {string} jobText - Raw job posting text (for context)
 * @returns {Promise<object>} Company brief
 */
export async function macroResearch(companyDomain, jobText) {
  // Provide a short excerpt of the job text for context (first 500 chars)
  const jobExcerpt = jobText.slice(0, 500);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Research this company and produce a company brief.

Company domain: ${companyDomain}

Job posting excerpt for context:
${jobExcerpt}

Use web search to find current information about the company. Then respond with the JSON brief.`,
      },
    ],
  });

  // Extract the text block from the response (may contain tool_use blocks before it)
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('No text response received from company research.');
  }

  try {
    return JSON.parse(textBlock.text);
  } catch (err) {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse company research response as JSON.');
  }
}
