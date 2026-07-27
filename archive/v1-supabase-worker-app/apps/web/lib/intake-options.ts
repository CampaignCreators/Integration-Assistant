import type {
  HubSpotObject,
  SyncDirection,
  SyncFrequency,
  VolumeBucket,
} from "@cc/shared";

/**
 * Plain-language option labels for the guided brief (spec §5.1.2).
 * The rep never has to type API jargon — every choice is described in
 * business terms with a short hint.
 */

export const DIRECTION_OPTIONS: {
  value: SyncDirection;
  label: string;
  hint: string;
}[] = [
  {
    value: "hubspot_to_target",
    label: "HubSpot → the other software",
    hint: "HubSpot is the source of truth; changes flow out to the other tool.",
  },
  {
    value: "target_to_hubspot",
    label: "The other software → HubSpot",
    hint: "The other tool is the source of truth; HubSpot receives the data.",
  },
  {
    value: "two_way",
    label: "Both directions",
    hint: "Changes in either system show up in the other. More complex to build.",
  },
];

export const FREQUENCY_OPTIONS: {
  value: SyncFrequency;
  label: string;
  hint: string;
}[] = [
  {
    value: "realtime",
    label: "Instantly",
    hint: "The moment a record changes. Needs the other tool to support webhooks.",
  },
  {
    value: "near_realtime",
    label: "Within a few minutes",
    hint: "Frequent checks for changes. A good default for most projects.",
  },
  { value: "hourly", label: "Every hour", hint: "Fine when data isn't time-sensitive." },
  { value: "daily", label: "Once a day", hint: "Cheapest and simplest to run." },
  {
    value: "manual",
    label: "Only when someone runs it",
    hint: "A person kicks off the sync — often used for one-time migrations.",
  },
];

export const OBJECT_OPTIONS: {
  value: HubSpotObject;
  label: string;
  hint: string;
}[] = [
  { value: "contacts", label: "People / contacts", hint: "Individual people and their details." },
  { value: "companies", label: "Companies", hint: "Organizations or accounts." },
  { value: "deals", label: "Deals / opportunities", hint: "Sales opportunities and their stages." },
  { value: "tickets", label: "Support tickets", hint: "Customer service requests." },
  { value: "products", label: "Products", hint: "Items in your product library." },
  { value: "line_items", label: "Line items", hint: "The individual products attached to a deal or quote." },
  { value: "custom", label: "Something else / custom records", hint: "Anything that isn't in this list — we'll flag it for review." },
];

export const VOLUME_OPTIONS: { value: VolumeBucket; label: string }[] = [
  { value: "lt_1k", label: "Fewer than 1,000" },
  { value: "1k_10k", label: "1,000 – 10,000" },
  { value: "10k_100k", label: "10,000 – 100,000" },
  { value: "gt_100k", label: "More than 100,000" },
];

export const TRIGGER_SUGGESTIONS = [
  "A new record is created",
  "An existing record is updated",
  "A deal moves to a new stage",
  "A form is submitted",
  "A payment or invoice is completed",
  "A support ticket is closed",
];

/** Autocomplete suggestions — free text is always allowed. */
export const COMMON_TOOLS = [
  "Salesforce",
  "Stripe",
  "Shopify",
  "QuickBooks",
  "NetSuite",
  "Xero",
  "Zendesk",
  "Intercom",
  "Jira",
  "Asana",
  "Monday.com",
  "Teamwork",
  "Slack",
  "Mailchimp",
  "Klaviyo",
  "ActiveCampaign",
  "Marketo",
  "Pardot",
  "Pipedrive",
  "Zoho CRM",
  "Microsoft Dynamics 365",
  "SAP",
  "Workday",
  "BambooHR",
  "Gusto",
  "Calendly",
  "Zoom",
  "DocuSign",
  "PandaDoc",
  "Recurly",
  "Chargebee",
  "Recharge",
  "WooCommerce",
  "BigCommerce",
  "Magento",
  "Square",
  "PayPal",
  "Twilio",
  "SendGrid",
  "Google Sheets",
  "Airtable",
  "Snowflake",
  "Segment",
  "Looker",
  "Tableau",
  "ServiceTitan",
  "Housecall Pro",
  "Procore",
  "Clio",
  "Mindbody",
];

export const ACCEPTED_FILE_EXTENSIONS = [".txt", ".md", ".docx", ".pdf", ".vtt", ".srt"];

export const DIRECTION_LABELS: Record<SyncDirection, string> = Object.fromEntries(
  DIRECTION_OPTIONS.map((o) => [o.value, o.label])
) as Record<SyncDirection, string>;

export const FREQUENCY_LABELS: Record<SyncFrequency, string> = Object.fromEntries(
  FREQUENCY_OPTIONS.map((o) => [o.value, o.label])
) as Record<SyncFrequency, string>;

export const OBJECT_LABELS: Record<string, string> = Object.fromEntries(
  OBJECT_OPTIONS.map((o) => [o.value, o.label])
);

export const VOLUME_LABELS: Record<VolumeBucket, string> = Object.fromEntries(
  VOLUME_OPTIONS.map((o) => [o.value, o.label])
) as Record<VolumeBucket, string>;
