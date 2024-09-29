const dbConnect = require('../lib/dbConnect');
const { getSession } = require('next-auth/react');
const RankingHistory = require('../models/RankingHistory');

module.exports = async (req, res) => {
  const session = await getSession({ req });
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const userId = session.user.id;

  try {
    await dbConnect();
    const histories = await RankingHistory.find({ userId }).sort({ date: 1 }).lean();

    res.status(200).json(histories);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};