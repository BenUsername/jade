// api/query-llm.js

const fetch = require('node-fetch');
const dbConnect = require('../lib/dbConnect');
const Analysis = require('../models/Analysis');
const authenticate = require('../middleware/auth');

module.exports = authenticate(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { brands } = req.body;

  if (!brands || !Array.isArray(brands) || brands.length === 0) {
    res.status(400).json({ error: 'At least one brand name is required' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OpenAI API key is not configured.' });
    return;
  }

  const userId = req.userId;

  try {
    await dbConnect();

    const service = 'coworking space management software';
    const prompt = `What is the best ${service}? Please list the top options and explain briefly why they are recommended.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a critical and analytical assistant that provides detailed and unbiased sentiment analyses of brands based on your knowledge cutoff. If you are unsure about certain aspects, express uncertainty.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const llmResponse = data.choices[0].message.content.trim();
      console.log('LLM Response:', llmResponse);

      const brandMentions = {};
      brands.forEach((brand) => {
        const regex = new RegExp(`\\b${brand}\\b`, 'gi');
        brandMentions[brand] = (llmResponse.match(regex) || []).length;
      });

      const analysisData = {
        brands,
        brandMentions,
        llmResponse,
      };

      const newAnalysis = new Analysis({
        brands,
        analysis: analysisData,
        userId: req.userId,
      });
      await newAnalysis.save();

      res.status(200).json({ analysis: analysisData });
    } else {
      console.error('OpenAI API error:', data);
      res.status(500).json({ error: 'Failed to fetch data from OpenAI', details: data });
    }
  } catch (error) {
    console.error('Error querying OpenAI:', error.message);
    res.status(500).json({
      error: 'An error occurred while fetching data from OpenAI.',
      details: error.message,
    });
  }
});
