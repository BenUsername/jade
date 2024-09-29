import OpenAI from 'openai';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { brand } = req.body;

  if (!brand) {
    return res.status(400).json({ error: 'Brand is required' });
  }

  try {
    // OpenAI API call to determine service
    const openai = new OpenAI(process.env.OPENAI_API_KEY);
    const prompt = `What service does the brand or website "${brand}" provide? Provide a short description in one sentence.`;

    const completion = await openai.Completion.create({
      engine: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 50,
      temperature: 0.7,
    });

    const service = completion.choices[0].text.trim();

    res.status(200).json({ service });
  } catch (error) {
    console.error('Error determining service:', error);
    res.status(500).json({ error: 'Failed to determine service' });
  }
}