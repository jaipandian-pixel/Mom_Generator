// server.js
// Entry point for the backend API server.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const momRoutes = require('./routes/mom');

const app = express();

app.use(cors()); // allow the frontend (different origin/S3 bucket) to call this API
app.use(express.json({ limit: '2mb' })); // allow large transcripts in the request body

// Health check — useful to confirm the server is alive after deployment
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', momRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MoM Generator backend running on port ${PORT}`);
});
