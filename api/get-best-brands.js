import { Configuration, OpenAIApi } from 'openai';
import { getSession } from 'next-auth/react';
import dbConnect from '../../lib/dbConnect';
import RankingHistory from '../../models/RankingHistory';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { service } = req.body;
  const userId = session.user.id;

  if (!service) {
    return res.status(400).json({ error: 'Service is required' });
  }

  try {
    // OpenAI API call to get best brands
    const prompt = `List the top 5 brands that provide the best "${service}" service. Provide only the brand names in order, starting from the best.`;

    const completion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 100,
      temperature: 0.7,
    });

    const rankingsText = completion.data.choices[0].text.trim();
    // Parse the rankings into an array
    const rankings = rankingsText
      .split('\n')
      .map(item => item.replace(/^\d+\.\s*/, '').trim())
      .filter(item => item !== '');

    // Save the result to the database
    await dbConnect();
    const rankingHistory = new RankingHistory({
      userId,
      service,
      rankings,
      date: new Date(),
    });
    await rankingHistory.save();

    res.status(200).json({ rankings });
  } catch (error) {
    console.error('Error getting best brands:', error);
    res.status(500).json({ error: 'Failed to get best brands' });
  }
}