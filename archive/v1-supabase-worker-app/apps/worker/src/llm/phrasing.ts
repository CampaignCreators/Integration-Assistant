import type { SyncDirection, SyncFrequency, VolumeBucket } from "@cc/shared";

/** Prose renderings of the brief's enums, for prompts and documents. */

export const DIRECTION_PHRASES: Record<SyncDirection, string> = {
  hubspot_to_target: "one-way, HubSpot out to the target system",
  target_to_hubspot: "one-way, the target system in to HubSpot",
  two_way: "two-way between HubSpot and the target system",
};

export const FREQUENCY_PHRASES: Record<SyncFrequency, string> = {
  realtime: "real time (as changes happen, via webhooks)",
  near_realtime: "near real time (within a few minutes)",
  hourly: "hourly",
  daily: "once a day",
  manual: "on demand, when someone runs it",
};

export const OBJECT_PHRASES: Record<string, string> = {
  contacts: "Contacts (people)",
  companies: "Companies",
  deals: "Deals",
  tickets: "Tickets",
  products: "Products",
  line_items: "Line Items",
  custom: "Custom objects / something not on the standard list",
};

export const VOLUME_PHRASES: Record<VolumeBucket, string> = {
  lt_1k: "fewer than 1,000 records",
  "1k_10k": "1,000 to 10,000 records",
  "10k_100k": "10,000 to 100,000 records",
  gt_100k: "more than 100,000 records",
};
