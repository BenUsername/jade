// api/query-llm.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { brand } = req.body;

  if (!brand) {
    res.status(400).json({ error: 'Brand name is required' });
    return;
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    res.status(500).json({ error: 'OpenAI API key is not configured.' });
    return;
  }

  try {
    const prompt = `As of September 2021, provide an analysis of the brand "${brand}" focusing on mention frequency, contextual relevance, sentiment, and associations.`;

    const response = await fetch('https://api.openai.com/v1/engines/davinci/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.7,
        n: 1,
        stop: null,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenAI API error:', data.error);
      res.status(500).json({ error: 'Failed to fetch data from OpenAI' });
      return;
    }

    const analysis = data.choices[0].text.trim();
    res.status(200).json({ analysis });
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    res.status(500).json({ error: 'Failed to fetch data from OpenAI' });
  }
};
