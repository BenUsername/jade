import authenticate from '../middleware/auth';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dbConnect from '../lib/dbConnect';
import RankingHistory from '../models/RankingHistory';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Function to validate domain
function isValidDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

async function queryClaudeForService(domain) {
  const prompt = `Please analyze the domain "${domain}". What is the primary service or industry sector of this website? Provide a concise, specific answer in 10 words or less.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 100,
      temperature: 0.3,
      system: "You are an AI assistant specialized in analyzing website domains and determining their primary services or industry sectors.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Error querying Claude:', error);
    throw error;
  }
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
    // Step 1: Determine the service provided by the website using Claude
    const service = await queryClaudeForService(domain);

    // Step 2: Get the best websites for that service using OpenAI
    const websitesPrompt = `Based on the domain "${domain}" and its service as "${service}", list the top 5 most popular and reputable websites that might directly compete with this domain. Provide only the domain names, separated by newlines, starting with the most prominent competitor.`;

    const websitesResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a knowledgeable AI assistant with expertise in identifying top competitors in various industries based on domain names and services.' },
        { role: 'user', content: websitesPrompt }
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const rankingsText = websitesResponse.choices[0].message.content.trim();

    const rankings = rankingsText
      .split('\n')
      .map((item) => item.replace(/^\d+\.\s*/, '').trim())
      .filter((item) => item !== '');

    // Save the result to the database
    await dbConnect();
    const rankingHistory = new RankingHistory({
      userId,
      domain,
      service,
      rankings,
      date: new Date(),
    });
    await rankingHistory.save();

    res.status(200).json({ domain, service, rankings });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});
