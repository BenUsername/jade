const dbConnect = require('../lib/dbConnect');
const Analysis = require('../models/Analysis');
const authenticate = require('../middleware/auth');

module.exports = authenticate(async (req, res) => {
  const { brand } = req.query;
  const userId = req.userId;

  if (!brand) {
    res.status(400).json({ error: 'Brand name is required' });
    return;
  }

  try {
    await dbConnect();
    const analyses = await Analysis.find({ brand, userId }).sort({ date: -1 }).limit(10);
    res.status(200).json({ analyses });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});