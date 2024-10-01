import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import OpenAI from 'openai';
import axios from 'axios';

// Set up Redis connection
const connection = new Redis(process.env.REDIS_URL);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchWebContent(domain) {
  try {
    const response = await axios.get(`https://${domain}`, { timeout: 5000 });
    return response.data.substring(0, 6000);
  } catch (error) {
    throw new Error(`Error fetching content for ${domain}: ${error.message}`);
  }
}

async function generateKeywordPrompts(domain, webContent) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an SEO expert. Generate 10 keyword phrases (2-5 words each) that this website should rank for, based on its content." },
      { role: "user", content: `Website: ${domain}\n\nContent: ${webContent}` }
    ],
    max_tokens: 51,
    temperature: 0,
  });

  return completion.choices[0].message.content.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim());
}

async function queryTopPrompts(domain, prompts) {
  const topPrompts = prompts.slice(0, 5);
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
      max_tokens: 100,
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

async function storeJobResult(jobId, result) {
  await connection.set(`jobResult:${jobId}`, JSON.stringify(result), 'EX', 3600); // Expires in 1 hour
}

// Worker to process jobs
const worker = new Worker('seo-jobs', async (job) => {
  const { domain } = job.data;

  try {
    // Fetch web content
    const webContent = await fetchWebContent(domain);

    // Generate keyword prompts
    const keywordPrompts = await generateKeywordPrompts(domain, webContent);

    // Query top prompts
    const topPromptsResults = await queryTopPrompts(domain, keywordPrompts);

    // Store results in Redis
    await storeJobResult(job.id, { domain, keywordPrompts, topPromptsResults });
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    // Store error in Redis
    await storeJobResult(job.id, { error: error.message });
    throw error; // This will mark the job as failed in BullMQ
  }
}, { connection });

console.log('Worker started');