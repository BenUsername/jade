const dbConnect = require('../../lib/dbConnect');
const Analysis = require('../../models/Analysis');

module.exports = async (req, res) => {
  const { brand } = req.query;

  if (!brand) {
    res.status(400).json({ error: 'Brand name is required' });
    return;
  }

  try {
    await dbConnect();
    const analyses = await Analysis.find({ brand }).sort({ date: -1 }).limit(10);
    res.status(200).json({ analyses });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};