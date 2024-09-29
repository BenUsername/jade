import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { brand } = req.body;

  if (!brand) {
    return res.status(400).json({ error: 'Brand is required' });
  }

  try {
    // OpenAI API call to determine service
    const prompt = `What service does the brand or website "${brand}" provide? Provide a short description in one sentence.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const service = response.choices[0].message.content.trim();

    res.status(200).json({ service });
  } catch (error) {
    console.error('Error determining service:', error);
    res.status(500).json({ error: 'Failed to determine service' });
  }
}