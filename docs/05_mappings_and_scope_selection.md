# Module 05: Mappings & Scope Selection

## Overview
The **Mappings & Scope Selection** panel serves as the central control dashboard for defining the exact shape and boundaries of data syncing. It translates customer integration objectives into structured relational entries.

## Primary Use Cases
- **Record Sync Scoping**: Allows scoping reps to pick exactly which data entities (e.g. Contacts, Invoices, Work Orders) belong in the integration.
- **Flow Direction Configuration**: Designates specific sync loops (Bidirectional, SaaS to HubSpot, or HubSpot to SaaS) to prevent data overwrite conflicts.
- **Frequency Setup**: Standardizes syncing schedules to set customer and engineering SLA expectations.

## Key Core Features
- **Interactive Scope Checkboxes**: Quick lists mapping core CRM entities to corresponding source tables.
- **Visual Direction Pickers**: Interactive buttons modeling flow loops (e.g., syncing contacts back-and-forth but sending invoices strictly one-way).
- **Execution Patterns**:
  - **Real-Time Webhooks**: Active triggers instantly syncing changes.
  - **Hourly Batches**: Standard interval queries for medium priority metadata.
  - **Daily Bulk Syncs**: High volume overnight schedules suitable for invoices and reporting dimensions.
- **Granular Confidence Indicators**: Displays calculated integration complexity rating percentages (e.g. 96% high feasibility for Contacts vs 81% for complex custom billing objects).

## References & Framework Targets
- Handled inside `src/components/UseCasePlanner.tsx` and `src/components/ObjectTable.tsx`.
- Maps and writes into `selectedObjects` and `mappings` state contexts.
