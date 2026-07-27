# Module 01: Integration Blueprint Planner

## Overview
The **Integration Blueprint Planner** provides human-centric, natural-language gating for enterprise integration discovery. Rather than requiring solutions representatives to manually check hundreds of database checkboxes on day one, this module acts as a smart, automated ingestion portal.

## Primary Use Cases
- **Natural Language Discovery**: Allows solutions engineers and sales representatives to draft simple qualitative descriptions of the client's integration goal.
- **Transcript Upload & Text Analysis**: Ingests raw conversation transcripts from Zoom, Teams, or Gong, extracting relevant endpoints, entities, frequencies, and friction terms.
- **Automated Preset Initialization**: Evaluates raw inputs via a frequency-weighted matching engine to immediately configure standard SaaS tools, sync directionalities, and data fields.

## Key Core Features
- **Discovery Playground Inputs**: Dedicated workspace for rep text entries.
- **Interactive Transcript Presets**: Loaded with standard onboarding scenarios (e.g. Stripe recurrence billing sync or Salesforce customer loops).
- **Drag-and-Drop Uploader**: Native interface accepting standard plain-text transcripts (`.txt` files) modeling raw client feedback.
- **NLP Context Extraction**: Automatically determines parent integration systems (`shopify`, `stripe`, `netsuite`, `salesforce`) based on text weights.

## References & Framework Targets
- Handled primarily by `src/components/TranscriptUploader.tsx`.
- Bridges vocabulary analysis to map exact indices in `src/data.ts`.
