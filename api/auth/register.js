const bcrypt = require('bcryptjs');  // Changed from 'bcrypt' to 'bcryptjs'
const User = require('../../models/User');
const dbConnect = require('../../lib/dbConnect');
const sendgrid = require('@sendgrid/mail');
const crypto = require('crypto');
const validator = require('validator');

// Temporarily add this line to check the API key
console.log('SendGrid API Key:', process.env.SENDGRID_API_KEY);

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  // Validate inputs
  if (!validator.isEmail(email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  if (!validator.isAlphanumeric(username)) {
    res.status(400).json({ error: 'Username must be alphanumeric' });
    return;
  }

  // Sanitize inputs
  username = validator.escape(username);
  email = validator.normalizeEmail(email);

  try {
    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    // Generate a verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    // Send verification email
    const verificationLink = `https://your-app-url.com/verify-email?token=${verificationToken}`;
    const msg = {
      to: user.email,
      from: 'ben@coworkintel.com', // Updated to use the verified sender email
      subject: 'Verify your email address',
      text: `Please verify your email by clicking on the following link: ${verificationLink}`,
      html: `<p>Please verify your email by clicking on the following link: <a href="${verificationLink}">${verificationLink}</a></p>`,
    };

    try {
      await sendgrid.send(msg);
    } catch (error) {
      console.error('Error sending verification email:', error);

      if (error.response && error.response.body && error.response.body.errors) {
        console.error('SendGrid Error Details:', error.response.body.errors);
      }

      res.status(500).json({ error: 'Failed to send verification email' });
      return;
    }

    res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
};