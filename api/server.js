const express = require('express');
const queryLLMHandler = require('./query-llm');

const app = express();

app.use(express.json());

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