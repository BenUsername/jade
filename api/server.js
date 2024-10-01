const express = require('express');
const queryLLMHandler = require('./query-llm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(express.json());

// Mock user database (replace this with your actual database logic)
const users = [];

// Add this near the top of your file, after defining the users array
users.push({
  username: 'testuser',
  email: 'test@example.com',
  password: '$2a$10$XQq2o7UDJeJf97aBB/4Oi.QQq2Xl2Xvn9VIwp1bZuMjZW0v5xP2Aq' // hashed password for 'password123'
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  // Check if user already exists
  if (users.find(user => user.username === username || user.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const newUser = { username, email, password: hashedPassword };
  users.push(newUser);

  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });

  // Find user
  const user = users.find(user => user.username === username);
  if (!user) {
    console.log('User not found');
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  // Check password
  const validPassword = await bcrypt.compare(password, user.password);
  console.log('Password valid:', validPassword);
  if (!validPassword) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  // Create and assign token
  const token = jwt.sign({ username: user.username }, 'your_jwt_secret');
  console.log('Login successful, token created');
  res.json({ token });
});

app.post('/api/query-llm', queryLLMHandler);

app.get('/api/get-history', (req, res) => {
  // Implement get-history logic here
  res.json({ message: "History endpoint not yet implemented" });
});

// Add other API routes here if needed

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;