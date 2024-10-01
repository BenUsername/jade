const mongoose = require('mongoose');
const ResultModel = require('../models/Result'); // Adjust the path if needed

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      const results = await ResultModel.find().sort({ createdAt: -1 }).limit(10);
      res.status(200).json(results);
    } catch (error) {
      console.error('Error fetching history:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    } finally {
      await mongoose.disconnect();
    }
  } else {
    res.status(405).end();
  }
};