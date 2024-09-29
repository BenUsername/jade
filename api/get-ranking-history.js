// api/get-ranking-history.js

const dbConnect = require('../lib/dbConnect');
const IndustryRanking = require('../models/IndustryRanking');
const authenticate = require('../middleware/auth');

module.exports = authenticate(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { industry, brand } = req.query;

  if (!industry || !brand) {
    res.status(400).json({ error: 'Industry and brand are required' });
    return;
  }

  try {
    await dbConnect();

    const rankings = await IndustryRanking.find({ 
      industry, 
      userId: req.userId,
      'rankings.brand': brand 
    }).sort({ createdAt: 1 });

    const rankHistory = rankings.map(ranking => {
      const brandRanking = ranking.rankings.find(r => r.brand === brand);
      return {
        date: ranking.createdAt,
        rank: brandRanking ? brandRanking.rank : null
      };
    });

    res.status(200).json({ rankHistory });
  } catch (error) {
    console.error('Error fetching rank history:', error);
    res.status(500).json({ error: 'An error occurred while fetching rank history' });
  }
});
