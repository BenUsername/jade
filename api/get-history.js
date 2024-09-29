import authenticate from '../middleware/auth'; // Import custom authentication middleware
import dbConnect from '../lib/dbConnect';
import RankingHistory from '../models/RankingHistory';

export default authenticate(async function handler(req, res) {
  const userId = req.userId; // Use userId from custom authentication middleware
  const { domain } = req.query;

  try {
    await dbConnect();
    let histories;
    if (domain) {
      histories = await RankingHistory.find({ userId, domain }).sort({ date: -1 }).lean();
    } else {
      histories = await RankingHistory.find({ userId }).sort({ date: -1 }).lean();
    }
    res.status(200).json(histories);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});