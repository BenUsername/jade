import authenticate from '../middleware/auth';
import OpenAI from 'openai';
import dbConnect from '../lib/dbConnect';
import RankingHistory from '../models/RankingHistory';
import User from '../models/User';
import https from 'https';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
          // Simple HTML parsing to extract text content
          const textContent = data.replace(/<[^>]*>/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim();
          resolve(textContent.substring(0, 6000));
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

export default async function handler(req, res) {
  if (req.method === 'POST' && req.url === '/api/query-llm') {
    const { domain } = req.body;
    const userId = req.userId;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    if (!isValidDomain(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    try {
      await dbConnect();
      const webContent = await fetchWebContent(domain);
      const keywordPrompts = await generateKeywordPrompts(domain, webContent);
      const topPromptsResults = await queryTopPrompts(domain, keywordPrompts);

      const rankingHistory = new RankingHistory({
        userId,
        domain,
        keywordPrompts,
        topPromptsResults,
        date: new Date(),
      });
      await rankingHistory.save();

      res.status(200).json({ domain, keywordPrompts, topPromptsResults });
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: 'Failed to process request', details: error.message });
    }
  } else if (req.method === 'POST' && req.url === '/api/login') {
    return login(req, res);
  } else if (req.method === 'POST' && req.url === '/api/register') {
    return register(req, res);
  } else if (req.method === 'GET' && req.url === '/api/get-history') {
    return getHistory(req, res);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function register(req, res) {
  try {
    await dbConnect();
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function login(req, res) {
  try {
    await dbConnect();
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getHistory(req, res) {
  try {
    await dbConnect();
    // You need to implement authentication middleware to get the userId
    // For now, we'll just return an empty array
    res.json([]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}