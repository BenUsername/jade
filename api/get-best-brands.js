import authenticate from '../middleware/auth'; // Import custom authentication middleware

export default authenticate(async function handler(req, res) {
  const { service } = req.body;
  const userId = req.userId; // Use userId from custom authentication middleware

  if (!service) {
    return res.status(400).json({ error: 'Service is required' });
  }

  try {
    // ... existing OpenAI API calls ...

    // Save the result to the database
    await dbConnect();
    const rankingHistory = new RankingHistory({
      userId,
      service,
      rankings,
      date: new Date(),
    });
    await rankingHistory.save();

    res.status(200).json({ rankings });
  } catch (error) {
    // ... existing error handling ...
  }
});