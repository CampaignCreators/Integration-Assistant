# Module 07: Mapping & Sync Configurator

## Overview
The **Mapping & Sync Configurator** provides a granular, micro-level workspace where technical representatives align actual database column keys between the source application and target HubSpot properties.

## Primary Use Cases
- **Database Schema Mapping**: Ensures developers have actual column names (e.g. `company_uuid` ⇄ `hubspot_owner_id`) pre-scoped before writing query blocks.
- **Data Type Safety Checks**: Audits field pairing values to verify data types are fully compatible, preventing downstream runtime parsing errors.

## Key Core Features
- **Expandable Model Accordions**: Collapsible fields grouped logically by active database entity.
- **Granular Schema Fields Grid**: Supports defining:
  - **Source API Field**: The column or property key on the third-party source system.
  - **Target HubSpot Field**: The corresponding internal HubSpot API name.
  - **Data Type Declarations**: Choice of `String`, `Number`, `Boolean`, `Date`, or `Enum`.
- **Validation Alerts**: Discovers and flags unsafe alignments—such as syncing text fields into standard numeric currencies, showing immediate error suggestions.

## References & Framework Targets
- Managed dynamically inside `src/components/MappingPanel.tsx`.
- Validates data formats before feeding variables back to export structures.
