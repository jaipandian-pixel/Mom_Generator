# MoM Generator — Frontend + Backend + AWS

This project takes the original single-file `mom_generator_gemini_email_format.html`
and splits it into a proper 3-tier application:

| Layer    | Tech                     | Where it lives in this repo |
|----------|--------------------------|------------------------------|
| Frontend | Static HTML/CSS/JS       | `frontend/index.html`        |
| Backend  | Node.js + Express API    | `backend/`                   |
| Database | AWS DynamoDB (history)   | configured via `backend/.env`|
| Storage  | AWS S3 (transcripts)     | configured via `backend/.env`|

**Why split it up?** In the original file, the Gemini API key was hardcoded directly
in the browser-visible JavaScript — anyone viewing the page source could steal it and
run up your bill. Now the key lives only on the server (`backend/.env`), and history/
transcripts are stored permanently in the cloud instead of the browser's localStorage
(which is lost if you clear your browser data or switch devices).

## Quick start (run locally first, before deploying to AWS)

1. **Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # edit .env and fill in your AWS + Gemini credentials
   npm start
   ```
   Server runs at `http://localhost:4000`.

2. **Frontend**
   Just open `frontend/index.html` directly in your browser (double-click it).
   It already points to `http://localhost:4000/api` by default.

3. **AWS resources needed before the backend works:**
   - A DynamoDB table named `MoMHistory` (partition key: `id`, type String)
   - An S3 bucket for transcripts (any name you choose, set in `.env`)
   - A Gemini API key from https://aistudio.google.com/app/apikey

## Deploying for real (so anyone on the internet can use it)

See **`DEPLOYMENT_GUIDE.md`** — a full, step-by-step, beginner-friendly walkthrough
for hosting everything on AWS (EC2 for the backend, S3 static website for the frontend,
DynamoDB for history, S3 for transcripts).
