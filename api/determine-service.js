import authenticate from '../middleware/auth'; // Import custom authentication middleware

export default authenticate(async function handler(req, res) {
  const { brand } = req.body;

  if (!brand) {
    return res.status(400).json({ error: 'Brand is required' });
  }

  try {
    // ... existing OpenAI API calls ...

    // Save the result to the database
    await dbConnect();
    const rankingHistory = new RankingHistory({
      userId: req.userId, // Use userId from custom authentication middleware
      service,
      rankings,
      date: new Date(),
    });
    await rankingHistory.save();

    res.status(200).json({ service, rankings });
  } catch (error) {
    // ... existing error handling ...
  }
});