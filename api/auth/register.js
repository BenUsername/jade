const bcrypt = require('bcryptjs');  // Changed from 'bcrypt' to 'bcryptjs'
const User = require('../../models/User');
const dbConnect = require('../../lib/dbConnect');
// const sendgrid = require('@sendgrid/mail');
// const crypto = require('crypto');
const validator = require('validator');

// Temporarily add this line to check the API key
console.log('SendGrid API Key:', process.env.SENDGRID_API_KEY);

// Remove SendGrid and crypto requirements
// sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = async (req, res) => {
  console.log('Registration request received:', req.body);

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { username, email, password } = req.body;

  if (!username || !email || !password) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  // Validate inputs
  if (!validator.isEmail(email)) {
    console.log('Invalid email:', email);
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!validator.isAlphanumeric(username)) {
    console.log('Invalid username:', username);
    return res.status(400).json({ error: 'Username must be alphanumeric' });
  }

  // Sanitize inputs
  username = validator.escape(username);
  email = validator.normalizeEmail(email);

  try {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Connected to database');

    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log('User already exists:', existingUser);
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    console.log('Creating new user...');
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    // Save the user
    console.log('Saving user to database...');
    await user.save();

    console.log('User registered successfully:', user);

    res.status(200).json({ message: 'Registration successful!' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration', details: error.message });
  }
};