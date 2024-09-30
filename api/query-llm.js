import authenticate from '../middleware/auth';
import OpenAI from 'openai';
import dbConnect from '../lib/dbConnect';
import RankingHistory from '../models/RankingHistory';
import https from 'https';
import { JSDOM } from 'jsdom';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to validate domain
function isValidDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

async function fetchWebContent(domain) {
  return new Promise((resolve, reject) => {
    https.get(`https://${domain}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const dom = new JSDOM(data);
          const body = dom.window.document.body;
          let textContent = '';
          if (body) {
            textContent = body.textContent || body.innerText || '';
          } else {
            // If there's no body, use the entire document
            textContent = dom.window.document.documentElement.textContent || 
                          dom.window.document.documentElement.innerText || '';
          }
          // Remove extra whitespace and limit to 6000 characters
          textContent = textContent.replace(/\s+/g, ' ').trim().substring(0, 6000);
          resolve(textContent);
        } catch (error) {
          console.error('Error parsing HTML:', error);
          reject(`Error parsing content for ${domain}: ${error.message}`);
        }
      });
    }).on('error', (err) => {
      console.error('Error fetching web content:', err);
      reject(`Error fetching content for ${domain}: ${err.message}`);
    });
  });
}

async function generateKeywordPrompts(domain, webContent) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: `Based on the following web content from "${domain}": 

${webContent.substring(0, 3000)} // Limit to first 3000 characters

Please tell me the top 20 prompts where you think this company would like to rank first. To be more specific, imagine you are the CMO of this company and you would like to see how well you rank on natural language tool's SEO. What would be the 20 prompts you would test first? Do not introduce yourself, give me the list straight`}
    ],
    max_tokens: 50,
    temperature: 0,
  });

  const keywordPrompts = completion.choices[0].message.content.trim()
    .split('\n')
    .map(prompt => prompt.replace(/^\d+\.\s*/, '').trim())
    .filter(prompt => prompt !== '');

  return keywordPrompts;
}

async function queryTopPrompts(domain, prompts) {
  const results = [];
  for (const prompt of prompts.slice(0, 5)) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
    model: "gpt-4o-mini",
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

export default authenticate(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { domain } = req.body;
  const userId = req.userId;

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

    // Save the result to the database
    await dbConnect();
    const rankingHistory = new RankingHistory({
      userId,
      domain,
      keywordPrompts,
      topPromptsResults,
      date: new Date(),
      service: 'Not specified',
    });
    await rankingHistory.save();

    res.status(200).json({ domain, keywordPrompts, topPromptsResults });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
});