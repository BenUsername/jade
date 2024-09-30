import authenticate from '../middleware/auth';
import OpenAI from 'openai';
import dbConnect from '../lib/dbConnect';
import RankingHistory from '../models/RankingHistory';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to validate domain
function isValidDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

async function queryAPIForService(domain, userDescription) {
  const servicePrompt = `Given the domain "${domain}" and the user's description of what they do: "${userDescription}", what is the most likely primary service or industry sector of this website? Provide a concise, specific answer in 10 words or less.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: servicePrompt }],
      temperature: 0.3,
      max_tokens: 50,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error querying API:', error);
    throw error;
  }
}

export default authenticate(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { domain, userDescription } = req.body;
  const userId = req.userId;

  if (!domain || !userDescription) {
    return res.status(400).json({ error: 'Domain and user description are required' });
  }

  if (!isValidDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain format' });
  }

  try {
    // Get service from API
    const service = await queryAPIForService(domain, userDescription);

    // Get competitors using API
    const websitesPrompt = `Based on the domain "${domain}", the user's description "${userDescription}", and the identified service "${service}", list the top 5 most popular and reputable websites that might directly compete with this domain. Provide only the domain names, separated by newlines, starting with the most prominent competitor.`;

    const websitesResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a knowledgeable AI assistant with expertise in identifying top competitors in various industries based on domain names and services.' },
        { role: 'user', content: websitesPrompt }
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const rankings = websitesResponse.choices[0].message.content.trim()
      .split('\n')
      .map((item) => item.replace(/^\d+\.\s*/, '').trim())
      .filter((item) => item !== '');

    // Save the result to the database
    await dbConnect();
    const rankingHistory = new RankingHistory({
      userId,
      domain,
      userDescription,
      service,
      rankings,
      date: new Date(),
    });
    await rankingHistory.save();

    res.status(200).json({ domain, userDescription, service, rankings });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Add a new endpoint to receive browser results
export async function receiveBrowserResult(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { result } = req.body;

  if (!result) {
    return res.status(400).json({ error: 'Result is required' });
  }

  // Store the result or process it as needed
  // For now, we'll just return it
  res.status(200).json({ success: true, browserResult: result });
}
