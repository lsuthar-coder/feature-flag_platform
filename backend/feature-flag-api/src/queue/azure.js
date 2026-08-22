// src/queue/azure.js
// ─────────────────────────────────────────────
// Publishes flag change events to Azure Storage Queue.
//
// Queue name: flag-events
// Consumer: Azure Function flag-change-notifier
//   → reads message → sends Slack notification
//
// Why a queue instead of direct HTTP to Slack?
// Decoupling: if Slack is down, the message waits safely
// in the queue and is delivered when Slack recovers.
// The flag API doesn't care if notification delivery fails.
//
// Message shape:
// {
//   flagName:         "audio-codec",
//   action:           "variants_updated",
//   newState:         true,            // enabled/disabled for boolean flags
//   changedBy:        "admin@company.com",
//   environment:      "production",
//   timestamp:        "2024-..."
// }
// ─────────────────────────────────────────────
'use strict';

const { QueueServiceClient } = require('@azure/storage-queue');

// Lazy-initialised queue client
let queueClient = null;

function getQueueClient() {
  if (!queueClient) {
    if (!process.env.AZURE_QUEUE_CONN) {
      return null; // Not configured — skip silently (local dev)
    }
    queueClient = QueueServiceClient
      .fromConnectionString(process.env.AZURE_QUEUE_CONN)
      .getQueueClient('flag-events');
  }
  return queueClient;
}

/**
 * Publish a flag change event to the Azure Storage Queue.
 * Fire-and-forget — caller should .catch() this and log the error
 * without failing the main request.
 *
 * @param {object} data - event payload
 */
async function publishFlagEvent(data) {
  const client = getQueueClient();
  if (!client) return; // Azure Queue not configured — skip

  const message = {
    flagName:    data.flagName,
    action:      data.action,       // 'created'|'updated'|'deleted'|'enabled'|'disabled'|'variants_updated'|'override_added'|'override_removed'
    changedBy:   data.changedBy || 'system',
    environment: data.environment  || 'production',
    details:     data.details      || null,  // additional context e.g. { userId, variantKey }
    timestamp:   new Date().toISOString(),
  };

  // Azure Storage Queue requires messages to be base64-encoded
  const encoded = Buffer.from(JSON.stringify(message)).toString('base64');
  await client.sendMessage(encoded);
}

module.exports = { publishFlagEvent };
