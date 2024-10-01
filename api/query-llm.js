const OpenAI = require('openai');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('redis');
const { Queue } = require('bullmq');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a new Redis client with environment variables
const client = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10)
  }
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Create a BullMQ queue
const queue = new Queue('seo-jobs', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_PASSWORD
  }
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
  await queue.add('processDomain', { jobId, domain }, { jobId });
}

(async () => {
  try {
    await client.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Error connecting to Redis:', err);
  }
})();

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const { domain } = req.body;

    if (!domain || !isValidDomain(domain)) {
      return res.status(400).json({ error: 'Invalid domain' });
    }

    try {
      const jobId = generateUniqueId();
      await enqueueJob({ jobId, domain });
      res.status(202).json({ message: 'Job accepted', jobId });
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: 'Failed to enqueue job', details: error.message });
    }
  } else if (req.method === 'GET') {
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId' });
    }

    try {
      const result = await client.get(`jobResult:${jobId}`);

      if (!result) {
        return res.status(202).json({ status: 'Processing' });
      }

      res.status(200).json(JSON.parse(result));
    } catch (error) {
      console.error('Error retrieving job result:', error);
      res.status(500).json({ error: 'Failed to retrieve job result', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};