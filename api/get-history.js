const dbConnect = require('../lib/dbConnect');
const Analysis = require('../models/Analysis');
const IndustryRanking = require('../models/IndustryRanking');
const authenticate = require('../middleware/auth');

module.exports = authenticate(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await dbConnect();

    const analyses = await Analysis.find({ userId: req.userId }).sort({ createdAt: -1 });
    const rankings = await IndustryRanking.find({ userId: req.userId }).sort({ createdAt: -1 });

    // Combine and sort all entries by createdAt
    const allEntries = [...analyses, ...rankings].sort((a, b) => b.createdAt - a.createdAt);

    res.status(200).json({ history: allEntries });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'An error occurred while fetching history' });
  }
});