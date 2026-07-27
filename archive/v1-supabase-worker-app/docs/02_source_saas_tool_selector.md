# Module 02: Source SaaS Tool Selector

## Overview
The **Source SaaS Tool Selector** defines the external boundary of the scoped pipeline. It serves as the primary system selector that instructs the workspace which specific database schemas, objects, and API parameters to prepare for HubSpot association.

## Primary Use Cases
- **Target App Classification**: Categorizes the client's current SaaS tech stack by function (e.g. Billing, CRM, ERP, Helpdesk) to determine recommended syncing defaults.
- **Custom App Provisioning**: Allows the scoping representative to define an unlisted custom system, opening structural prompts to validate unique legacy REST or SOAP interfaces.

## Key Core Features
- **SaaS Tool Preset Grid**: Visually stunning high-contrast product array listing prominent platforms like Salesforce, Stripe, Shopify, Zendesk, Jira, NetSuite ERP, ConnectWise, Snowflake, Power BI, and ShipStation.
- **Custom Tool Definition Forms**: Fully accessible interactive prompt triggering manual configuration of custom properties, naming, and descriptions.
- **Categorization Badges**: Standardized visual indicators tracking system classifications.

## Growing Integration Support Ecosystem
This catalog is structured as an expandable dataset, allowing technical teams to quickly append new SaaS tooling guidelines to downstream generators:
```typescript
{
  id: "my_new_tool",
  name: "My New Tool",
  category: "ERP",
  icon: "Package",
  description: "Enterprise software synchronization defaults."
}
```

## References & Framework Targets
- Managed in production via `src/components/SaaSSelector.tsx`.
- Preset database schemas loaded directly from `src/data.ts`.
