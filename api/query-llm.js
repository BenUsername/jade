import OpenAI from 'openai';
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
        if (data.length > 6000) {
          res.destroy();
          resolve(data.substring(0, 6000));
        }
      });
      res.on('end', () => {
        resolve(data.substring(0, 6000));
      });
    }).on('error', (err) => {
      reject(`Error fetching content for ${domain}: ${err.message}`);
    });
  });
}

async function generateKeywordPrompts(domain, webContent) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an SEO expert. Generate 10 keyword phrases (2-5 words each) that this website should rank for, based on its content." },
      { role: "user", content: `Website: ${domain}\n\nContent: ${webContent}` }
    ],
    max_tokens: 50,
    temperature: 0,
  });

  return completion.choices[0].message.content.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain } = req.body;

  if (!domain || !isValidDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain' });
  }

  try {
    const webContent = await fetchWebContent(domain);
    const keywordPrompts = await generateKeywordPrompts(domain, webContent);

    res.status(200).json({ domain, keywordPrompts });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
}