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
    // Step 1: Determine the service provided by the website
    const servicePrompt = `What is the primary service or industry sector of the website "${domain}"? Provide a concise, specific answer in 10 words or less.`;

    const serviceResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Use the latest GPT-4 model
      messages: [
        { role: 'system', content: 'You are a highly knowledgeable AI assistant specializing in identifying business services and industry sectors based on website domains.' },
        { role: 'user', content: servicePrompt }
      ],
      temperature: 0.3,  // Slightly increase temperature for more nuanced responses
      max_tokens: 100,   // Increase token limit for more detailed responses
    });

    const service = serviceResponse.choices[0].message.content.trim();

    // Step 2: Get the best websites for that service
    const websitesPrompt = `List the top 5 most popular and reputable websites that directly compete with "${domain}" in providing ${service}. Provide only the domain names, separated by newlines, starting with the most prominent competitor.`;

    const websitesResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: websitesPrompt }],
      temperature: 0, // Higher temperature for more variety in competitors
      max_tokens: 100,  // Allow for longer response to include 5 competitors
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
