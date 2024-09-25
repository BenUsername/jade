const dbConnect = require('../../lib/dbConnect');
const User = require('../../models/User');

module.exports = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    res.status(400).json({ error: 'Verification token is required' });
    return;
  }

  try {
    await dbConnect();

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};