import authenticate from '../middleware/auth';
import OpenAI from 'openai';
import dbConnect from '../lib/dbConnect';
import RankingHistory from '../models/RankingHistory';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default authenticate(async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  const { brand } = req.body;
  const userId = req.userId;

  if (!brand) {
    return res.status(400).json({ error: 'Brand is required' });
  }

  try {
    // Step 1: Determine the service provided by the brand
    const servicePrompt = `What service does the brand or website "${brand}" provide? Provide a short description in one sentence.`;

    const serviceResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: servicePrompt }],
    });

    const service = serviceResponse.choices[0].message.content.trim();

    // Step 2: Get the best brands for that service
    const brandsPrompt = `List the top 5 brands that provide the best "${service}" service. Provide only the brand names in order, starting from the best.`;

    const brandsResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: brandsPrompt }],
    });

    const rankingsText = brandsResponse.choices[0].message.content.trim();

    const rankings = rankingsText
      .split('\n')
      .map((item) => item.replace(/^\d+\.\s*/, '').trim())
      .filter((item) => item !== '');

    // Save the result to the database
    await dbConnect();
    const rankingHistory = new RankingHistory({
      userId,
      service,
      rankings,
      date: new Date(),
    });
    await rankingHistory.save();

    res.status(200).json({ service, rankings });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});
