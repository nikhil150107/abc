# Member 2 — Event Processor

Transforms **Contract 1 → Contract 2**.

## Pipeline
```
Raw Event → Ingestion → Normalization → PII Detection → Context Extraction → Processed Event
```

## PII Detection (MVP)
Regex/rule-based detection for:
- EMAIL
- PHONE
- PAN
- AADHAAR
- ADDRESS

## Run
```bash
npm install
cp .env.example .env
npm run dev
```

## Key Files
- `services/piiDetector.js` — Deterministic PII detection
- `services/eventProcessor.js` — Full processing pipeline
- `server.js` — POST `/api/events/ingest`
