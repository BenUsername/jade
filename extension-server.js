const express = require('express');
const queryLLMHandler = require('./api/query-llm');

const app = express();

app.use(express.json());

app.post('/api/query-llm', queryLLMHandler);

// ... (add other routes and middleware as needed)

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});