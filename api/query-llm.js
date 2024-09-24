// api/query-llm.js

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // ... (previous code)

  try {
    const prompt = `As of September 2021, provide an analysis of the brand "${brand}" focusing on mention frequency, contextual relevance, sentiment, and associations.`;

    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const analysis = data.choices[0].text.trim();
      res.status(200).json({ analysis });
    } else {
      console.error('OpenAI API error:', data);
      res.status(500).json({ error: 'Failed to fetch data from OpenAI', details: data });
    }
  } catch (error) {
    console.error('Error querying OpenAI:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from OpenAI', details: error.message });
  }
};
