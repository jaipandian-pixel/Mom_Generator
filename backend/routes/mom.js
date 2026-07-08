// routes/mom.js
// All API endpoints the frontend talks to.
//
//   POST   /api/generate        -> generate MoM from a transcript (and save it)
//   GET    /api/history         -> list all saved MoM entries
//   GET    /api/history/:id     -> view one entry (with full transcript text)
//   DELETE /api/history/:id     -> delete one entry
//   DELETE /api/history         -> delete all entries

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { generateMoM } = require('../services/gemini');
const { uploadTranscript, getTranscript } = require('../services/s3');
const {
  saveHistoryItem,
  getAllHistory,
  getHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
} = require('../services/dynamo');

// ── Generate a new MoM ──────────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const { transcript, title, autoSave } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const content = await generateMoM(transcript);
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const id = uuidv4();
    const now = Date.now();

    let savedEntry = null;

    // Only persist to S3 + DynamoDB if the user wants it saved
    if (autoSave) {
      const transcriptKey = await uploadTranscript(id, transcript);

      const item = {
        id,
        title: title || 'Meeting Minutes',
        content,
        wordCount,
        timestamp: now,
        date: new Date(now).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        transcriptS3Key: transcriptKey,
      };

      savedEntry = await saveHistoryItem(item);
    }

    res.json({ id, content, wordCount, saved: !!savedEntry, entry: savedEntry });
  } catch (err) {
    console.error('Error in /generate:', err);
    res.status(500).json({ error: err.message || 'Failed to generate MoM' });
  }
});

// ── Save an already-generated MoM (used by the explicit "Save" button) ─────
router.post('/history', async (req, res) => {
  try {
    const { title, content, transcript } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const id = uuidv4();
    const now = Date.now();
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    const transcriptKey = transcript ? await uploadTranscript(id, transcript) : null;

    const item = {
      id,
      title: title || 'Meeting Minutes',
      content,
      wordCount,
      timestamp: now,
      date: new Date(now).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      transcriptS3Key: transcriptKey,
    };

    const saved = await saveHistoryItem(item);
    res.json(saved);
  } catch (err) {
    console.error('Error in POST /history:', err);
    res.status(500).json({ error: err.message || 'Failed to save MoM' });
  }
});

// ── List all history ─────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const items = await getAllHistory();
    res.json(items);
  } catch (err) {
    console.error('Error in GET /history:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch history' });
  }
});

// ── Get one entry, including its original transcript from S3 ───────────────
router.get('/history/:id', async (req, res) => {
  try {
    const item = await getHistoryItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    let transcript = null;
    if (item.transcriptS3Key) {
      transcript = await getTranscript(item.transcriptS3Key);
    }

    res.json({ ...item, transcript });
  } catch (err) {
    console.error('Error in GET /history/:id:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch entry' });
  }
});

// ── Delete one entry ─────────────────────────────────────────────────────────
router.delete('/history/:id', async (req, res) => {
  try {
    await deleteHistoryItem(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /history/:id:', err);
    res.status(500).json({ error: err.message || 'Failed to delete entry' });
  }
});

// ── Delete all entries ───────────────────────────────────────────────────────
router.delete('/history', async (req, res) => {
  try {
    await clearAllHistory();
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /history:', err);
    res.status(500).json({ error: err.message || 'Failed to clear history' });
  }
});

module.exports = router;
