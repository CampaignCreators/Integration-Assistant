export interface Field {
  name: string;
  label: string;
  type: string;
  description: string;
  hubspotDefaultField: string;
}

export interface SaaSObject {
  id: string; // e.g. "salesforce_lead"
  name: string; // e.g. "Lead"
  apiName: string; // e.g. "Lead"
  description: string;
  recommendedHubSpotTarget: string; // e.g. "contact" (Contact), "company" (Company), "deal" (Deal), etc.
  category: "CRM" | "Billing" | "Support" | "E-commerce" | "Core";
  fields: Field[];
  suggestedFrequency: "real_time" | "hourly" | "daily" | "manual";
  syncRequirements: string;
}

export interface MarketplaceOption {
  id: string;
  name: string;
  provider: string;
  rating: number;
  reviewsCount: number;
  badge?: string;
  features: string[];
}

export interface SaasToolPreset {
  id: string; // e.g. "salesforce"
  name: string;
  description: string;
  logoColor: string; // tailwind color class
  category: string;
  objects: SaaSObject[];
}

export type SyncDirection = "saas_to_hs" | "hs_to_saas" | "bidirectional";
export type SyncFrequency = "real_time" | "hourly" | "daily" | "weekly" | "manual";

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  enabled: boolean;
}

export interface ObjectMapping {
  id: string; // unique mapping ID
  sourceObjectId: string;
  hubspotTargetObject: string; // e.g. "contact", "company", "deal", "ticket", or custom
  direction: SyncDirection;
  frequency: SyncFrequency;
  fieldMappings: FieldMapping[];
}
