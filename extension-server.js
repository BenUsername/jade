const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let latestContent = '';

app.post('/fetch-content', (req, res) => {
  const { domain, content } = req.body;
  latestContent = content;
  res.json({ success: true });
});

app.get('/fetch-content', (req, res) => {
  res.json({ content: latestContent });
});

app.listen(port, () => {
  console.log(`Extension server listening at http://localhost:${port}`);
});