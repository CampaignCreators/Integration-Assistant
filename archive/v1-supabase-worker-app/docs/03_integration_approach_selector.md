# Module 03: Integration Approach Selector

## Overview
The **Integration Approach Selector** serves as the decision-support brain of our workspace. It weighs the system requirements against real-world limitations to determine the optimal delivery approach: native integrations, middlewares, or fully custom scripts.

## Primary Use Cases
- **Delivery Strategy Selection**: Evaluates custom business needs to recommend either standard ecosystem apps, middleware pipelines, or custom web services.
- **Ecosystem Risk Assessment**: Flags known HubSpot App Marketplace limitations and customer feedback to protect development teams from scoping non-feasible native connects.

## Key Core Features
- **Aesthetic Comparison Columns**: Side-by-side technical profiling for:
  - **Native/Marketplace Connects**: Out-of-the-box native integrations published in the HubSpot App Marketplace.
  - **Middleware Frameworks**: Scalable visual orchestration using tools like **Celigo**, **Zapier**, or **Make**.
  - **Custom Code API Syncs**: Purpose-built Node.js, Python, or Go server-side microservices.
- **Interactive Multi-Provider Bulleting**: For tools containing multiple marketplace applications (e.g., Unific vs. Native Shopify), the interface displays a comparative list detailing rating, provider, reviews count, and bulleted features to select the ideal option.
- **Dynamic Friction Radar**: Automatically alerts the scoping team about known pain points (e.g., NetSuite native sync limits causing API exhaustion or multi-store constraints).

## References & Framework Targets
- Designed inside `src/components/ApproachSelector.tsx`.
- Synchronizes with `src/data.ts`'s `MARKETPLACE_OPTIONS_MAP` for actual ratings.
