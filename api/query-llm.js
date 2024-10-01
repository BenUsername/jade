import OpenAI from 'openai';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to validate domain
function isValidDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

function generateUniqueId() {
  return uuidv4();
}

async function enqueueJob({ jobId, domain }) {
  // This is a placeholder function. You'll need to implement your own job queue system.
  // For example, you might use a database or a message queue service.
  console.log(`Job ${jobId} for domain ${domain} enqueued`);
  // Start the background process
  processJob(jobId, domain).catch(console.error);
}

async function processJob(jobId, domain) {
  try {
    const webContent = await fetchWebContent(domain);
    const keywordPrompts = await generateKeywordPrompts(domain, webContent);
    const topPromptsResults = await queryTopPrompts(domain, keywordPrompts);

    // Store the results (you'll need to implement this)
    await storeJobResults(jobId, { domain, keywordPrompts, topPromptsResults });
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    // Store the error (you'll need to implement this)
    await storeJobError(jobId, error.message);
  }
}

async function fetchWebContent(domain) {
  try {
    const response = await axios.get(`https://${domain}`, { timeout: 5000 });
    return response.data.substring(0, 1000);
  } catch (error) {
    throw new Error(`Error fetching content for ${domain}: ${error.message}`);
  }
}

async function generateKeywordPrompts(domain, webContent) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an SEO expert. Generate 5 keyword phrases (2-5 words each) that this website should rank for, based on its content." },
      { role: "user", content: `Website: ${domain}\n\nContent: ${webContent}` }
    ],
    max_tokens: 20,
    temperature: 0,
  });

  return completion.choices[0].message.content.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim());
}

async function queryTopPrompts(domain, prompts) {
  const topPrompts = prompts.slice(0, 3);
  const results = await Promise.all(topPrompts.map(async (prompt) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an SEO expert assistant. Provide a response to the following prompt. Then, on a new line, write "Score: X" where X is how well the domain "${domain}" ranks in this response on a scale of 0 to 10.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 20,
      temperature: 0,
    });

    const content = completion.choices[0].message.content.trim();
    const scoreMatch = content.match(/Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const response = content.replace(/Score:\s*\d+/i, '').trim();

    return { prompt, response, score };
  }));
  return results;
}

async function storeJobResults(jobId, results) {
  // Implement this function to store job results
  console.log(`Storing results for job ${jobId}`);
}

async function storeJobError(jobId, error) {
  // Implement this function to store job errors
  console.log(`Storing error for job ${jobId}: ${error}`);
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
    // Generate a unique job ID
    const jobId = generateUniqueId();

    // Enqueue the job in your background processing system
    await enqueueJob({ jobId, domain });

    // Return immediate response with job ID
    res.status(202).json({ message: 'Job accepted', jobId });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to enqueue job', details: error.message });
  }
}