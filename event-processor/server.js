require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { processEvent } = require('./services/eventProcessor');
const apiKeyMiddleware = require('./middleware/apiKeyMiddleware');

const app = express();
const PORT = process.env.PORT || 5001;
const COMPLIANCE_ENGINE_URL = process.env.COMPLIANCE_ENGINE_URL || 'http://localhost:5002';

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'event-processor', member: 2 });
});

app.post('/api/events/ingest', apiKeyMiddleware, async (req, res) => {
  try {
    const processedEvent = processEvent(req.body);

    const response = await fetch(`${COMPLIANCE_ENGINE_URL}/api/compliance/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedEvent),
    });

    const result = response.ok ? await response.json() : { error: 'Compliance engine unreachable' };

    res.status(200).json({
      success: true,
      contract: 'PROCESSED_COMPLIANCE_EVENT',
      processedEvent,
      complianceResult: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Member 2] Event Processor running on port ${PORT}`);
});
