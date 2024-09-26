const dbConnect = require('../lib/dbConnect');
const Analysis = require('../models/Analysis');
const authenticate = require('../middleware/auth');

module.exports = authenticate(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await dbConnect();

    const history = await Analysis.find({ userId: req.userId }).sort({ date: -1 });

    res.status(200).json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});