// api/query-llm.js

const fetch = require('node-fetch');
const dbConnect = require('../../lib/dbConnect');
const Analysis = require('../../models/Analysis');

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

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OpenAI API key is not configured.' });
    return;
  }

  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that provides analyses of brands in JSON format.',
      },
      {
        role: 'user',
        content: `As of September 2021, provide an analysis of the brand "${brand}" focusing on mention frequency, contextual relevance, sentiment (provide a score from -1 to 1), and associations. Format the response as a JSON object with keys: "mention_frequency", "contextual_relevance", "sentiment", and "associations".`,
      },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const assistantMessage = data.choices[0].message.content.trim();

      // Parse the JSON response
      let analysisData;
      try {
        analysisData = JSON.parse(assistantMessage);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        res.status(500).json({ error: 'Failed to parse analysis data', details: parseError.message });
        return;
      }

      // Save the analysis to the database
      await dbConnect();
      const newAnalysis = new Analysis({ brand, analysis: analysisData });
      await newAnalysis.save();

      res.status(200).json({ analysis: analysisData });
    } else {
      console.error('OpenAI API error:', data);
      res.status(500).json({ error: 'Failed to fetch data from OpenAI', details: data });
    }
  } catch (error) {
    console.error('Error querying OpenAI:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from OpenAI', details: error.message });
  }
};
