// api/query-llm.js

const { Configuration, OpenAIApi } = require('openai');

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
    const configuration = new Configuration({
      apiKey: OPENAI_API_KEY,
    });

    const openai = new OpenAIApi(configuration);

    const prompt = `As of September 2021, provide an analysis of the brand "${brand}" focusing on mention frequency, contextual relevance, sentiment, and associations.`;

    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 500,
      temperature: 0.7,
    });

    const analysis = response.data.choices[0].text.trim();

    res.status(200).json({ analysis });
  } catch (error) {
    console.error('Error querying OpenAI:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch data from OpenAI',
      details: error.response?.data || error.message,
    });
  }
};
