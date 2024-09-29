import authenticate from '../middleware/auth';
import OpenAI from 'openai';
import dbConnect from '../lib/dbConnect';
import RankingHistory from '../models/RankingHistory';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default authenticate(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { brand } = req.body;
  const userId = req.userId;

  if (!brand) {
    return res.status(400).json({ error: 'Brand is required' });
  }

  try {
    // Step 1: Determine the service provided by the brand
    const servicePrompt = `What is the primary service or industry sector of the brand or website "${brand}"? Provide a concise, specific answer in 10 words or less.`;

    const serviceResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: servicePrompt }],
    });

    const service = serviceResponse.choices[0].message.content.trim();

    // Step 2: Get the best websites for that service
    const websitesPrompt = `List the top 5 most popular and reputable websites or brands that directly compete with "${brand}" in providing ${service}. Provide only the website names or brand names, separated by newlines, starting with the most prominent competitor.`;

    const websitesResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: websitesPrompt }],
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
      brand, // Add this line to save the brand
      service,
      rankings,
      date: new Date(),
    });
    await rankingHistory.save();

    res.status(200).json({ brand, service, rankings });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});
