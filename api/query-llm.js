// api/query-llm.js

const fetch = require('node-fetch');
const dbConnect = require('../lib/dbConnect');
const Analysis = require('../models/Analysis');
const authenticate = require('../middleware/auth');

async function getIndustryForBrand(brand) {
  const industryPrompt = `What is the primary industry or service category for the brand "${brand}"? Provide a brief, one-sentence answer.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a knowledgeable assistant that provides brief, accurate information about brands and industries.' },
        { role: 'user', content: industryPrompt }
      ],
      max_tokens: 50,
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${JSON.stringify(data.error)}`);
  }

  return data.choices[0].message.content.trim();
}

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

    const analysisResults = [];

    for (const brand of brands) {
      const industry = await getIndustryForBrand(brand);
      console.log(`Determined industry for ${brand}: ${industry}`);

      const prompt = `Provide a detailed analysis of the brand "${brand}" in the ${industry} industry. Focus on their market position, product quality, customer satisfaction, and overall reputation. If you're unsure about any aspects, please indicate that.`;

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

        const analysisData = {
          brand,
          industry,
          analysis: llmResponse,
        };

        analysisResults.push(analysisData);

        // Stringify the analysis object before saving
        const newAnalysis = new Analysis({
          brand,
          industry,
          analysis: JSON.stringify(analysisData),
          userId: req.userId,
        });
        await newAnalysis.save();
      } else {
        console.error('OpenAI API error:', data);
        throw new Error(`Failed to fetch data from OpenAI for brand ${brand}`);
      }
    }

    res.status(200).json({ analyses: analysisResults });
  } catch (error) {
    console.error('Error querying OpenAI:', error.message);
    res.status(500).json({
      error: 'An error occurred while processing your request.',
      details: error.message,
    });
  }
});
