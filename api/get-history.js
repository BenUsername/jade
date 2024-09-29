import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../lib/dbConnect';
import RankingHistory from '../models/RankingHistory';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  try {
    await dbConnect();
    const histories = await RankingHistory.find({ userId }).sort({ date: 1 }).lean();

    res.status(200).json(histories);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}