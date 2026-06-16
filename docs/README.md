# HubSpot Scoping Tool - Module Documentation Index

Welcome to the comprehensive module scoping documentation guide. This directory contains detailed descriptions, primary use cases, and technical references for all structural modules powering our **HubSpot Integration Scoping & Blueprint Workspace**.

---

## Workspace Modules Index

| Module # | Module Documentation | Core Architectural Purpose |
| :--- | :--- | :--- |
| **01** | [Integration Blueprint Planner](./01_integration_blueprint_planner.md) | Captures project context via natural language inputs, raw notes, or call transcript discovery. |
| **02** | [Source SaaS Tool Selector](./02_source_saas_tool_selector.md) | Allows choosing standard ecosystem applications (Salesforce, Stripe, Shopify, NetSuite) or custom tools. |
| **03** | [Integration Approach Selector](./03_integration_approach_selector.md) | Dynamically recommends Native Marketplace Apps, No-Code/Low-Code Middleware, or Custom builds. |
| **04** | [Custom API Integration Connector](./04_custom_api_integration.md) | Evaluates API endpoints, webhook standards, rate bounds, and token auth feasibility. |
| **05** | [Mappings & Scope Selection](./05_mappings_and_scope_selection.md) | Mappings control table defining high-level object sync scopes, flows directionality, and frequencies. |
| **06** | [Blueprint ERD Visualizer](./06_blueprint_erd.md) | Generates dynamic, live-refreshing interactive entity-relationship flow diagramming. |
| **07** | [Mapping & Sync Configurator](./07_mapping_and_sync_configurator.md) | High-fidelity field property alignment panel verifying schemas and checking data type safety. |
| **08** | [Schema Spec Exports Developer Panel](./08_schema_spec_exports.md) | Produces standard JSON schemas and markdown briefs to streamline developer hand-off workflows. |
| **09** | [Integration Requirements Document](./09_integration_requirements_document_generator.md) | Executive scoping briefing compiler generating comprehensive SOW scoping sheets automatically. |

---

## General Technical Flow
Each of these modules operates on a shared react component state context, ensuring that updates to raw transcripts automatically cascade down to update recommended objects, mapping schemas, and the final printable SOW.
