// api/query-llm.js

const fetch = require('node-fetch');
const dbConnect = require('../lib/dbConnect');
const Analysis = require('../models/Analysis');
const IndustryRanking = require('../models/IndustryRanking');
const authenticate = require('../middleware/auth');
const { setTimeout } = require('timers/promises');

async function getIndustryForBrand(brand) {
  try {
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
        temperature: 0,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(data.error)}`);
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error fetching industry for brand "${brand}":`, error);
    throw new Error(`Failed to fetch industry for brand "${brand}".`);
  }
}

async function getIndustryRanking(industry) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a knowledgeable assistant that provides detailed and unbiased information about industries and their rankings.' },
          { role: 'user', content: `Provide a detailed analysis of the industry "${industry}". Focus on their market position, product quality, customer satisfaction, and overall reputation. If you're unsure about any aspects, please indicate that.` }
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(data.error)}`);
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error fetching rankings for industry "${industry}":`, error);
    throw new Error(`Failed to fetch rankings for industry "${industry}".`);
  }
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
    const rankingsToSave = [];
    let latestRankings = {}; // Object to store the latest rankings for each industry

    for (const brand of brands) {
      // Step 1: Determine the industry for the brand
      const industry = await getIndustryForBrand(brand);
      console.log(`Determined industry for ${brand}: ${industry}`);

      // Step 2: Fetch the detailed analysis for the brand
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
          temperature: 0,
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

        // Step 3: Check if industry rankings already exist
        let rankings = await IndustryRanking.findOne({ industry, userId: req.userId });
        
        if (!rankings) {
          // Fetch new rankings if they don't exist
          rankings = await getIndustryRanking(industry);
          console.log(`Fetched rankings for industry "${industry}":`, rankings);
          
          rankingsToSave.push({
            industry,
            rankings,
            userId: req.userId,
          });
        }

        // Store the latest rankings for this industry
        latestRankings[industry] = rankings;

        // Add a delay to avoid rate limiting
        await setTimeout(1000);
      } else {
        console.error('OpenAI API error:', data);
        throw new Error(`Failed to fetch data from OpenAI for brand ${brand}`);
      }
    }

    // Bulk insert new rankings
    if (rankingsToSave.length > 0) {
      await IndustryRanking.insertMany(rankingsToSave.map(ranking => ({
        ...ranking,
        type: 'ranking'
      })));
    }

    // Bulk insert new analyses
    await Analysis.insertMany(analysisResults.map(data => ({
      type: 'analysis',
      brand: data.brand,
      industry: data.industry,
      analysis: JSON.stringify(data),
      userId: req.userId,
    })));

    res.status(200).json({ 
      analyses: analysisResults,
      rankings: latestRankings, // Include the latest rankings
      message: 'Analysis and rankings fetched successfully.'
    });
  } catch (error) {
    console.error('Error processing request:', error.message);
    res.status(500).json({
      error: 'An error occurred while processing your request.',
      details: error.message,
    });
  }
});
