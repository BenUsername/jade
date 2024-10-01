import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to validate domain
function isValidDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

async function fetchWebContent(domain) {
  try {
    const response = await axios.get(`https://${domain}`, { timeout: 5000 });
    return response.data.substring(0, 1000);
  } catch (error) {
    throw new Error(`Error fetching content for ${domain}: ${error.message}`);
  }
}

async function generateKeywordPrompts(domain, webContent) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an SEO expert. Generate 5 keyword phrases (2-5 words each) that this website should rank for, based on its content." },
      { role: "user", content: `Website: ${domain}\n\nContent: ${webContent}` }
    ],
    max_tokens: 20,
    temperature: 0,
  });

  return completion.choices[0].message.content.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim());
}

async function queryTopPrompts(domain, prompts) {
  const topPrompts = prompts.slice(0, 3);
  const results = await Promise.all(topPrompts.map(async (prompt) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an SEO expert assistant. Provide a response to the following prompt. Then, on a new line, write "Score: X" where X is how well the domain "${domain}" ranks in this response on a scale of 0 to 10.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 20,
      temperature: 0,
    });

    const content = completion.choices[0].message.content.trim();
    const scoreMatch = content.match(/Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const response = content.replace(/Score:\s*\d+/i, '').trim();

    return { prompt, response, score };
  }));
  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain } = req.body;

  if (!domain || !isValidDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain' });
  }

  try {
    const webContentPromise = fetchWebContent(domain);
    const webContent = await webContentPromise;

    const keywordPromptsPromise = generateKeywordPrompts(domain, webContent);
    const keywordPrompts = await keywordPromptsPromise;

    const topPromptsResultsPromise = queryTopPrompts(domain, keywordPrompts);
    const topPromptsResults = await topPromptsResultsPromise;

    res.status(200).json({ domain, keywordPrompts, topPromptsResults });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
}