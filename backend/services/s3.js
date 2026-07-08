// services/s3.js
// Handles uploading raw meeting transcripts to S3, and reading them back.

const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../config/aws');

const BUCKET = process.env.S3_BUCKET || 'mom-generator-transcripts-jvp';

// Converts a readable stream into a string (used when reading a transcript back)
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

async function uploadTranscript(id, transcriptText) {
  const key = `transcripts/${id}.txt`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: transcriptText,
      ContentType: 'text/plain; charset=utf-8',
    })
  );
  return key;
}

async function getTranscript(key) {
  const result = await s3Client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  return streamToString(result.Body);
}

module.exports = { uploadTranscript, getTranscript };
