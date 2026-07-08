// services/dynamo.js
// Handles all reads/writes to the DynamoDB table that stores MoM history.
// Table schema (created in the setup guide):
//   Partition key: id (String)
//   Attributes: title, content, date, timestamp, wordCount, transcriptS3Key

const { PutCommand, ScanCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbDocClient } = require('../config/aws');

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'MoMHistory';

async function saveHistoryItem(item) {
  await ddbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
  return item;
}

async function getAllHistory() {
  const result = await ddbDocClient.send(
    new ScanCommand({ TableName: TABLE_NAME })
  );
  const items = result.Items || [];
  // newest first
  items.sort((a, b) => b.timestamp - a.timestamp);
  return items;
}

async function getHistoryItem(id) {
  const result = await ddbDocClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  return result.Item || null;
}

async function deleteHistoryItem(id) {
  await ddbDocClient.send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: { id } })
  );
}

async function clearAllHistory() {
  const items = await getAllHistory();
  for (const item of items) {
    await deleteHistoryItem(item.id);
  }
}

module.exports = {
  saveHistoryItem,
  getAllHistory,
  getHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
};
