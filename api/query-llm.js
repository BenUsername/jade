import authenticate from '../middleware/auth';
import OpenAI from 'openai';
import dbConnect from '../lib/dbConnect';
import RankingHistory from '../models/RankingHistory';
import https from 'https';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to validate domain
function isValidDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

async function fetchWebContent(domain) {
  return new Promise((resolve, reject) => {
    https.get(`https://${domain}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      console.error('Error fetching web content:', err);
      reject(`Error fetching content for ${domain}: ${err.message}`);
    });
  });
}

async function queryAPIForService(domain, webContent) {
  const servicePrompt = `Based on the following web content from "${domain}":

${webContent.substring(0, 2000)} // Limit to first 2000 characters to avoid token limits

What is the most likely primary service or industry sector of this website? Provide a concise, specific answer in 10 words or less.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: servicePrompt }],
      temperature: 0.3,
      max_tokens: 50,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error querying API:', error);
    throw error;
  }
}

async function generateKeywordPrompts(domain, webContent) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: `Based on the following web content from "${domain}": 

${webContent.substring(0, 3000)} // Limit to first 3000 characters

Please tell me the top 20 prompts where you think this company would like to rank first. To be more specific, imagine you are the CMO of this company and you would like to see how well you rank on natural language tool's SEO. What would be the 20 prompts you would test first?`}
    ],
    max_tokens: 100,
    temperature: 0,
  });

  const keywordPrompts = completion.choices[0].message.content.trim()
    .split('\n')
    .map(prompt => prompt.replace(/^\d+\.\s*/, '').trim())
    .filter(prompt => prompt !== '');

  return keywordPrompts;
}

export default authenticate(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { domain } = req.body;
  const userId = req.userId;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  if (!isValidDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain format' });
  }

  try {
    // Fetch web content
    const webContent = await fetchWebContent(domain);

    // Get service from API
    const service = await queryAPIForService(domain, webContent);

    // Get competitors using API
    const websitesPrompt = `Based on the domain "${domain}" and the identified service "${service}", list the top 10 most popular and reputable websites that might directly compete with this domain. Provide only the domain names, separated by newlines, starting with the most prominent competitor.`;

    const websitesResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a knowledgeable AI assistant with expertise in identifying top competitors in various industries based on domain names and services.' },
        { role: 'user', content: websitesPrompt }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const rankings = websitesResponse.choices[0].message.content.trim()
      .split('\n')
      .map((item) => item.replace(/^\d+\.\s*/, '').trim())
      .filter((item) => item !== '');

    // Generate keyword prompts
    const keywordPrompts = await generateKeywordPrompts(domain, webContent);

    // Save the result to the database
    await dbConnect();
    const rankingHistory = new RankingHistory({
      userId,
      domain,
      service,
      rankings,
      keywordPrompts,
      date: new Date(),
      // Add a default value for userDescription if it's still required in your schema
      userDescription: 'Not provided', // or you can use an empty string ''
    });
    await rankingHistory.save();

    res.status(200).json({ domain, service, rankings, keywordPrompts });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request', details: error.message, stack: error.stack });
  }
});

// Add a new endpoint to receive browser results
export async function receiveBrowserResult(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { result } = req.body;

  if (!result) {
    return res.status(400).json({ error: 'Result is required' });
  }

  // Store the result or process it as needed
  // For now, we'll just return it
  res.status(200).json({ success: true, browserResult: result });
}