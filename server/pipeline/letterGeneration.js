import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert cover letter writer.

You will receive:
1. A company brief (JSON)
2. A parsed job description (JSON)
3. A condensed resume (JSON)
4. An optional personal bio

Your task is to write a tailored cover letter using only the information provided.

Strict rules:
- Do not invent facts, metrics, motivations, company initiatives, or personal experiences not supported by the inputs.
- Do not repeat resume bullets verbatim or closely mirror their phrasing.
- Do not turn the cover letter into a prose version of the resume.
- Prefer synthesis over repetition: interpret the candidate's experience in terms of capabilities, judgment, and relevance to the role.
- Avoid using exact numerical metrics from the resume unless they are especially important to the fit. In most cases, translate them into qualitative language such as "significantly improved," "materially reduced," "helped scale," or "strengthened."
- Do not make broad claims about the company's market position, strategy, or products unless explicitly supported by the company brief or job description.
- If information is missing, keep the language general rather than guessing.

Before writing, think internally about:
- Which business needs, team goals, and hiring signals are explicitly supported by the company brief and job description
- The 2-3 strongest themes of fit based on overlap between the job description and the candidate's background
- Which resume experiences best support those themes
- How to frame those experiences as evidence of readiness, not as bullet-point recap
- The appropriate tone based on the company's stage, culture, and communication style

Writing goals:
- Length: 250-400 words
- Structure: 3-4 paragraphs
- Open with a specific angle about why the role is compelling and why the candidate is a fit; avoid generic openings
- Show alignment between the candidate's background and the role's actual needs
- Use selective detail from the resume, but summarize and reinterpret it instead of restating it
- Focus on patterns of contribution: ownership, problem-solving, engineering judgment, collaboration, reliability, developer experience, systems thinking, leadership
- Reflect the company's values, mission, or culture only when explicitly supported by the inputs
- Use important job-description keywords naturally, without stuffing
- Avoid clichés, flattery, inflated rhetoric, and generic enthusiasm
- End with a confident, specific closing that reinforces fit

Style guidance:
- The letter should sound like a thoughtful, high-agency candidate making a case for fit
- It should emphasize relevance and trajectory more than accomplishment inventory
- It should feel sharper and more selective than a résumé summary
- Resume metrics should usually be paraphrased qualitatively rather than quoted exactly. Exact numbers should be avoided unless central to the candidate's fit for the role.

Output plain text only.
Do not use markdown, bullet points, headers, or metadata.`;

/**
 * Generate a cover letter using Sonnet with extended thinking.
 * The model synthesizes company + role signals in its thinking block before writing.
 * @param {object} companyBrief - Stage 1 output
 * @param {object} jdParse - Stage 2 output
 * @param {object|string} resume - Condensed resume JSON or raw text fallback
 * @param {string|null} bioText - Optional personal bio
 * @returns {Promise<string>} Plain text cover letter
 */
export async function letterGeneration(companyBrief, jdParse, resume, bioText) {
  const resumeContent = typeof resume === 'string' 
    ? resume 
    : JSON.stringify(resume, null, 2);

  let userMessage = `Generate a personalized cover letter based on the following information.

## Company Brief
${JSON.stringify(companyBrief, null, 2)}

## Job Description Analysis
${JSON.stringify(jdParse, null, 2)}

## Candidate Resume
${resumeContent}`;

  if (bioText) {
    userMessage += `\n\n## Personal Bio\n${bioText}`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    thinking: {
      type: 'enabled',
      budget_tokens: 8000,
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  // Extract only the text block (skip thinking blocks)
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('No text response received from letter generation.');
  }

  return textBlock.text.trim();
}
