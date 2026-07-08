// services/gemini.js
// Calls the Google Gemini API to turn a transcript into a Minutes of Meeting
// email. The API key lives ONLY on the server (in .env) — it is never sent
// to the browser, unlike the original single-file version.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

function buildPrompt(transcript) {
  return `You are an AI Meeting Minutes Generator.

Convert the following meeting transcript into a professional email-ready Minutes of Meeting (MoM).

Return ONLY in this format.

Hi Team,

Please find the Minutes of Meeting for today's meeting.

**Date:** <Meeting Date>

**Time:** <Meeting Time>

**Summary:**
Write one concise business paragraph summarizing the meeting.

**Key Decisions:**

* Decision 1
* Decision 2
* Decision 3

**Action Items:**

* Team/Owner: Task
* Team/Owner: Task
* Team/Owner: Task

**Next Meeting:**
Mention the next meeting date. If unavailable, write "To Be Confirmed".

Please let me know if any updates or corrections are required.

Thanks & Regards,

[Your Name]

Rules:
- Output only the email.
- Do not include Meeting Details, Agenda, Discussion Points, or tables.
- Keep the language concise and professional.

Meeting Transcript:

${transcript}`;
}

async function generateMoM(transcript) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set on the server. Add it to backend/.env');
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(transcript) }] }],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || 'Gemini API Error');
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate minutes.';
}

module.exports = { generateMoM };
