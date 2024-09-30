import OpenAI from 'openai';
import fetch from 'node-fetch';

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
    const response = await fetch(`https://${domain}`);
    const html = await response.text();
    const textContent = html.replace(/<[^>]*>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
    return textContent.substring(0, 6000);
  } catch (error) {
    console.error('Error fetching web content:', error);
    throw new Error(`Error fetching content for ${domain}: ${error.message}`);
  }
}

async function generateKeywordPrompts(domain, webContent) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are an AI expert in SEO and content analysis." },
      { role: "user", content: `Analyze the following web content from "${domain}":

${webContent}

1. Identify the main product or service offered by this website.
2. List any specific technologies, tools, or platforms mentioned.
3. Identify unique selling points or key features of their offering.
4. Determine the target audience or industry for this product/service.

Based on this analysis, generate 20 highly specific keyword phrases that this website would want to rank for in search engines. Focus on the actual product/service offered, not generic terms. Each phrase should be 2-5 words long.` }
    ],
    max_tokens: 500,
    temperature: 0.3,
  });

  const keywordPrompts = completion.choices[0].message.content.trim()
    .split('\n')
    .filter(line => line.match(/^\d+\./))
    .map(line => line.replace(/^\d+\.\s*/, '').trim());

  return keywordPrompts;
}

async function queryTopPrompts(domain, prompts) {
  const results = [];
  for (const prompt of prompts.slice(0, 5)) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0,
    });

    const response = completion.choices[0].message.content.trim();
    const score = await scoreResponse(domain, response);
    results.push({ prompt, response, score });
  }
  return results;
}

async function scoreResponse(domain, response) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are an SEO expert assistant." },
      { role: "user", content: `On a scale of 0 to 10, how well does the domain "${domain}" rank in this response? Only provide a number as your answer.\n\nResponse: ${response}` }
    ],
    max_tokens: 5,
    temperature: 0,
  });

  const score = parseInt(completion.choices[0].message.content.trim());
  return isNaN(score) ? 0 : score;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  if (!isValidDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain format' });
  }

  try {
    // Fetch web content
    const webContent = await fetchWebContent(domain);

    // Generate keyword prompts
    const keywordPrompts = await generateKeywordPrompts(domain, webContent);

    // Query top 5 prompts and get results
    const topPromptsResults = await queryTopPrompts(domain, keywordPrompts);

    res.status(200).json({ domain, keywordPrompts, topPromptsResults });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
}