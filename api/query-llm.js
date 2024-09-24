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

  const { brand } = req.body;

  if (!brand) {
    res.status(400).json({ error: 'Brand name is required' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OpenAI API key is not configured.' });
    return;
  }

  const userId = req.userId;

  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that provides detailed sentiment analyses of brands. When responding, output only the JSON data in the exact format requested, without any additional text or explanations.',
      },
      {
        role: 'user',
        content: `As of September 2021, provide a detailed sentiment analysis of the brand "${brand}" focusing on the following aspects:

- Customer Satisfaction
- Product Quality
- Customer Service
- Brand Reputation

For each aspect, provide:

- A sentiment score from -1 (very negative) to 1 (very positive)
- A brief explanation of the score

Format the response as a JSON object with the following structure (use double quotes for all keys and string values):

{
  "customer_satisfaction": {
    "score": [number between -1 and 1],
    "explanation": "[string]"
  },
  "product_quality": {
    "score": [number between -1 and 1],
    "explanation": "[string]"
  },
  "customer_service": {
    "score": [number between -1 and 1],
    "explanation": "[string]"
  },
  "brand_reputation": {
    "score": [number between -1 and 1],
    "explanation": "[string]"
  }
}

Output only the JSON object and nothing else.`,
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

      // Log the assistant's response
      console.log("Assistant's raw response:", assistantMessage);

      // Simplify the JSON parsing logic
      let jsonString = assistantMessage;

      // If the assistant's response might include code block wrappers, remove them
      jsonString = jsonString.replace(/```json([\s\S]*?)```/g, '$1').trim();

      let analysisData;
      try {
        analysisData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        res.status(500).json({ error: 'Failed to parse analysis data', details: parseError.message });
        return;
      }

      // Save the analysis to the database
      await dbConnect();
      const newAnalysis = new Analysis({ brand, analysis: analysisData, userId: req.userId });
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
});
