const dbConnect = require('../lib/dbConnect');
const Analysis = require('../models/Analysis');
const authenticate = require('../middleware/auth');

module.exports = authenticate(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { brand, industry } = req.query;

  if (!brand || !industry) {
    res.status(400).json({ error: 'Brand and industry are required' });
    return;
  }

  try {
    await dbConnect();

    const analysis = await Analysis.findOne({ 
      brand, 
      industry,
      userId: req.userId 
    }).sort({ createdAt: -1 }); // Get the most recent analysis

    if (!analysis) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }

    res.status(200).json({ analysis: JSON.parse(analysis.analysis).analysis });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'An error occurred while fetching analysis' });
  }
});