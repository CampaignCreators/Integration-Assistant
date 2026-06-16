import { SaasToolPreset, MarketplaceOption } from "./types";

export const SAAS_PRESETS: SaasToolPreset[] = [
  {
    id: "salesforce",
    name: "Salesforce CRM",
    description: "Sync leads, accounts, contacts, and opportunities to align CRM data across sales pipelines.",
    logoColor: "bg-sky-500",
    category: "CRM & Sales",
    objects: [
      {
        id: "sf_lead",
        name: "Lead",
        apiName: "Lead",
        description: "Prospects or potential sales contacts that haven't been qualified yet.",
        recommendedHubSpotTarget: "contact",
        category: "CRM",
        suggestedFrequency: "real_time",
        syncRequirements: "Requires email and last name. Unqualified leads sync to contact list with 'Lead' status.",
        fields: [
          { name: "Id", label: "Lead ID", type: "string (id)", description: "Unique Salesforce Lead identifier.", hubspotDefaultField: "salesforceinstanceid" },
          { name: "FirstName", label: "First Name", type: "string", description: "Given name of the lead.", hubspotDefaultField: "firstname" },
          { name: "LastName", label: "Last Name", type: "string", description: "Family name of the lead.", hubspotDefaultField: "lastname" },
          { name: "Email", label: "Email Address", type: "string (email)", description: "Primary email address of the lead.", hubspotDefaultField: "email" },
          { name: "Phone", label: "Phone Number", type: "string (phone)", description: "Lead phone number including area code.", hubspotDefaultField: "phone" },
          { name: "Company", label: "Company Name", type: "string", description: "Name of the lead's company.", hubspotDefaultField: "company" },
          { name: "LeadSource", label: "Lead Source", type: "picklist", description: "Source from where the lead was generated (e.g., Web, Referral).", hubspotDefaultField: "hs_analytics_source" },
          { name: "Status", label: "Lead Status", type: "picklist", description: "Current stage of the lead in the qualifications cycle.", hubspotDefaultField: "hs_lead_status" },
          { name: "CreatedDate", label: "Created Date", type: "datetime", description: "Date and time when the lead record was created.", hubspotDefaultField: "createdate" }
        ]
      },
      {
        id: "sf_contact",
        name: "Contact",
        apiName: "Contact",
        description: "Qualified individuals associated with accounts.",
        recommendedHubSpotTarget: "contact",
        category: "CRM",
        suggestedFrequency: "real_time",
        syncRequirements: "Requires matches on primary email address. Typically uni-directional or bi-directional with conflict resolution.",
        fields: [
          { name: "Id", label: "Contact ID", type: "string (id)", description: "Unique Salesforce Contact identifier.", hubspotDefaultField: "salesforcecontactid" },
          { name: "FirstName", label: "First Name", type: "string", description: "Given name of the contact.", hubspotDefaultField: "firstname" },
          { name: "LastName", label: "Last Name", type: "string", description: "Family name of the contact.", hubspotDefaultField: "lastname" },
          { name: "Email", label: "Email Address", type: "string (email)", description: "Contact's primary email address.", hubspotDefaultField: "email" },
          { name: "Phone", label: "Office Phone", type: "string (phone)", description: "Office direct line phone number.", hubspotDefaultField: "phone" },
          { name: "MobilePhone", label: "Mobile Phone", type: "string (phone)", description: "Contact's cellular number.", hubspotDefaultField: "mobilephone" },
          { name: "Title", label: "Job Title", type: "string", description: "The professional title of this contact.", hubspotDefaultField: "jobtitle" },
          { name: "AccountId", label: "Account ID", type: "string (reference)", description: "The ID of the parent Salesforce Account.", hubspotDefaultField: "associatedcompanyid" },
          { name: "LastModifiedDate", label: "Last Modified Date", type: "datetime", description: "Timestamp of last modification in Salesforce.", hubspotDefaultField: "lastmodifieddate" }
        ]
      },
      {
        id: "sf_account",
        name: "Account",
        apiName: "Account",
        description: "Companies, organizations, or households involved in the business relationship.",
        recommendedHubSpotTarget: "company",
        category: "CRM",
        suggestedFrequency: "hourly",
        syncRequirements: "Synced via Account Name match. Strongly recommended for sync so contacts are grouped correctly.",
        fields: [
          { name: "Id", label: "Account ID", type: "string (id)", description: "Unique Salesforce Account ID.", hubspotDefaultField: "salesforceaccountid" },
          { name: "Name", label: "Account Name", type: "string", description: "Name of the organization.", hubspotDefaultField: "name" },
          { name: "Website", label: "Website URL", type: "string (url)", description: "The web address of the organization.", hubspotDefaultField: "domain" },
          { name: "Industry", label: "Industry Sector", type: "picklist", description: "The industry segment the company operates in.", hubspotDefaultField: "industry" },
          { name: "NumberOfEmployees", label: "Employee Count", type: "integer", description: "Number of full-time employees in the company.", hubspotDefaultField: "numberofemployees" },
          { name: "AnnualRevenue", label: "Annual Revenue", type: "currency", description: "The firm's annual sales figures.", hubspotDefaultField: "annualrevenue" },
          { name: "BillingCity", label: "Billing City", type: "string", description: "The city of the billing address.", hubspotDefaultField: "city" },
          { name: "BillingCountry", label: "Billing Country", type: "string", description: "The country of the billing address.", hubspotDefaultField: "country" }
        ]
      },
      {
        id: "sf_opportunity",
        name: "Opportunity",
        apiName: "Opportunity",
        description: "Sales transactions, deals, and revenue pipelines in progress.",
        recommendedHubSpotTarget: "deal",
        category: "CRM",
        suggestedFrequency: "real_time",
        syncRequirements: "Requires associated Account to sync model correctly. Stages must be mapped to HubSpot Deal pipelines.",
        fields: [
          { name: "Id", label: "Opportunity ID", type: "string (id)", description: "Unique Salesforce Deal identifier.", hubspotDefaultField: "salesforcedealid" },
          { name: "Name", label: "Opportunity Name", type: "string", description: "Descriptive name for the deal.", hubspotDefaultField: "dealname" },
          { name: "StageName", label: "Sales Stage", type: "picklist", description: "The phase of the sale, e.g. Qualification, Closed Won.", hubspotDefaultField: "dealstage" },
          { name: "Amount", label: "Amount / Value", type: "currency", description: "Total currency value of the opportunity.", hubspotDefaultField: "amount" },
          { name: "CloseDate", label: "Estimated Close Date", type: "date", description: "Date when sales cycle is expected to conclude.", hubspotDefaultField: "closedate" },
          { name: "Probability", label: "Win Probability (%)", type: "percent", description: "The probability percentage of winning the deal.", hubspotDefaultField: "hs_deal_stage_probability" },
          { name: "OwnerId", label: "Owner ID", type: "string (reference)", description: "The Salesforce Sales Rep owning this record.", hubspotDefaultField: "hubspot_owner_id" }
        ]
      }
    ]
  },
  {
    id: "omnia360",
    name: "Omnia 360",
    description: "Sync telecom subscriber profiles, monthly billing invoices, and trouble tickets for BSS/OSS alignment.",
    logoColor: "bg-teal-600",
    category: "Billing & OSS",
    objects: [
      {
        id: "omnia_account",
        name: "Subscriber Account",
        apiName: "SubscriberAccount",
        description: "Telecommunication subscriber demographics, active broadband credentials, and addresses.",
        recommendedHubSpotTarget: "company",
        category: "CRM",
        suggestedFrequency: "hourly",
        syncRequirements: "Synchronizes based on billing account reference. Updates HubSpot Company billing and contact parameters.",
        fields: [
          { name: "accountId", label: "Account Ref ID", type: "string (id)", description: "Unique subscriber billing identifier.", hubspotDefaultField: "salesforceaccountid" },
          { name: "subscriberName", label: "Subscriber Name", type: "string", description: "Registered customer or corporate customer name.", hubspotDefaultField: "name" },
          { name: "serviceAddress", label: "Service Address", type: "string", description: "Standard physical service execution address.", hubspotDefaultField: "address" },
          { name: "broadbandPlan", label: "Broadband Plan", type: "string", description: "Suballocated telecom packages and service speeds.", hubspotDefaultField: "industry" },
          { name: "status", label: "Account Status", type: "picklist", description: "Operational status states: Active, Suspended, Pending, Cancelled.", hubspotDefaultField: "hs_lead_status" }
        ]
      },
      {
        id: "omnia_invoice",
        name: "Service Invoice",
        apiName: "ServiceInvoice",
        description: "Monthly customer telecom invoices and data/broadband usage telemetry bills.",
        recommendedHubSpotTarget: "invoice",
        category: "Billing",
        suggestedFrequency: "daily",
        syncRequirements: "Imports invoice entries daily without write-back. Maps billing cycle timestamps.",
        fields: [
          { name: "invoiceNumber", label: "Invoice Number", type: "string", description: "Primary bill run document index.", hubspotDefaultField: "subject" },
          { name: "totalOwed", label: "Total Amount Owed", type: "currency", description: "Consolidated bill balance outstanding.", hubspotDefaultField: "amount" },
          { name: "paymentDueDate", label: "Due Date", type: "date", description: "Due date boundary for subscription fees.", hubspotDefaultField: "closedate" },
          { name: "pastDueAmount", label: "Past Due Balance", type: "currency", description: "Outstanding unpaid payments in telecom cycle.", hubspotDefaultField: "amount" }
        ]
      },
      {
        id: "omnia_ticket",
        name: "Trouble Ticket",
        apiName: "TroubleTicket",
        description: "Standard telecom service complaints, active outages, and connection diagnostics.",
        recommendedHubSpotTarget: "ticket",
        category: "Support",
        suggestedFrequency: "real_time",
        syncRequirements: "Real-time sync ensures HubSpot support staff are informed of active subscriber repair tickets.",
        fields: [
          { name: "ticketId", label: "Trouble Ticket ID", type: "string (id)", description: "Unique catalog support ticket ID.", hubspotDefaultField: "zendesk_ticket_id" },
          { name: "issueSubject", label: "Issue Subject", type: "string", description: "Short description of broadband connection issue.", hubspotDefaultField: "subject" },
          { name: "severityLevel", label: "Severity Level", type: "picklist", description: "Incident priority flag: Low, Medium, High, Outage.", hubspotDefaultField: "hs_ticket_priority" },
          { name: "ticketStatus", label: "Ticket Status", type: "picklist", description: "Trouble ticket state: Open, Working, Delayed, Closed.", hubspotDefaultField: "hs_ticket_state" }
        ]
      }
    ]
  },
  {
    id: "stripe",
    name: "Stripe Billing",
    description: "Map customers, subscriptions, invoices, and payment events to track lifetime value directly in HubSpot.",
    logoColor: "bg-indigo-600",
    category: "Finance & Billing",
    objects: [
      {
        id: "stripe_customer",
        name: "Customer",
        apiName: "customer",
        description: "Billing contact record in Stripe associated with cards, tokens, and invoices.",
        recommendedHubSpotTarget: "contact",
        category: "Billing",
        suggestedFrequency: "real_time",
        syncRequirements: "Mapped based on unique Email identifier. Helps link payments directly manually or via CRM extension.",
        fields: [
          { name: "id", label: "Customer ID", type: "string (id)", description: "Unique Stripe identifier starting with cus_.", hubspotDefaultField: "stripe_customer_id" },
          { name: "email", label: "Email Address", type: "string (email)", description: "Customer primary email address.", hubspotDefaultField: "email" },
          { name: "name", label: "Full Name", type: "string", description: "Cardholder or company billing name.", hubspotDefaultField: "firstname" },
          { name: "phone", label: "Phone", type: "string", description: "Customer billing phone.", hubspotDefaultField: "phone" },
          { name: "currency", label: "Preferred Currency", type: "string (3-letter)", description: "Default currency for billing checkout.", hubspotDefaultField: "stripe_preferred_currency" },
          { name: "balance", label: "Outstanding Balance", type: "integer (cents)", description: "Balance currently owed or credited.", hubspotDefaultField: "stripe_account_balance" },
          { name: "delinquent", label: "Is Delinquent?", type: "boolean", description: "Whether the customer has overdue invoices.", hubspotDefaultField: "stripe_delinquent_status" }
        ]
      },
      {
        id: "stripe_subscription",
        name: "Subscription",
        apiName: "subscription",
        description: "Periodic recurring subscription plans associated with customers.",
        recommendedHubSpotTarget: "deal",
        category: "Billing",
        suggestedFrequency: "real_time",
        syncRequirements: "Best mapped into a Recurring Revenue pipeline or a Custom Object to prevent polluting standard deals.",
        fields: [
          { name: "id", label: "Subscription ID", type: "string (id)", description: "Unique Stripe subscription identifier (sub_).", hubspotDefaultField: "stripe_subscription_id" },
          { name: "customer", label: "Customer ID Link", type: "string (reference)", description: "The customer ID owning this subscription.", hubspotDefaultField: "stripe_customer_id" },
          { name: "status", label: "Subscription Status", type: "string (status)", description: "Status fields: active, past_due, canceled, trialing.", hubspotDefaultField: "subscription_status" },
          { name: "current_period_end", label: "Next Renewal Date", type: "datetime", description: "Date when current billing cycle ends.", hubspotDefaultField: "subscription_renewal_date" },
          { name: "quantity", label: "Seat License count", type: "integer", description: "Number of units or seats purchased.", hubspotDefaultField: "subscription_seats" },
          { name: "plan_id", label: "Plan Product Reference", type: "string", description: "Specific price and plan identifier linked to billing.", hubspotDefaultField: "subscription_plan_name" }
        ]
      },
      {
        id: "stripe_invoice",
        name: "Invoice",
        apiName: "invoice",
        description: "Itemized billing document issued to customers for payment statements.",
        recommendedHubSpotTarget: "ticket",
        category: "Billing",
        suggestedFrequency: "real_time",
        syncRequirements: "Synces to custom invoice properties or automatically logs as Timeline Events for target Contacts.",
        fields: [
          { name: "id", label: "Invoice ID", type: "string (id)", description: "Unique invoice identifier starting with in_.", hubspotDefaultField: "stripe_invoice_id" },
          { name: "number", label: "Invoice Number", type: "string", description: "Structured receipt/billing code (e.g. INV-1049).", hubspotDefaultField: "invoice_number" },
          { name: "amount_due", label: "Amount Due", type: "integer (cents)", description: "Total price currently due for payment.", hubspotDefaultField: "invoice_amount_due" },
          { name: "amount_paid", label: "Amount Paid", type: "integer (cents)", description: "Total amount collected on this invoice.", hubspotDefaultField: "invoice_amount_paid" },
          { name: "paid", label: "Paid Confirm Status", type: "boolean", description: "Whether checkout was completed successfully.", hubspotDefaultField: "invoice_is_paid" },
          { name: "invoice_pdf", label: "Download Link", type: "string (url)", description: "Web Link directory for the hosted invoice PDF copy.", hubspotDefaultField: "invoice_pdf_url" }
        ]
      }
    ]
  },
  {
    id: "zendesk",
    name: "Zendesk Support",
    description: "Align support customer records and connect helpdesk tickets directly to customer success profiles in HubSpot.",
    logoColor: "bg-emerald-600",
    category: "Customer Support",
    objects: [
      {
        id: "zd_ticket",
        name: "Ticket",
        apiName: "ticket",
        description: "Customer service request or inquiry handled by agents.",
        recommendedHubSpotTarget: "ticket",
        category: "Support",
        suggestedFrequency: "real_time",
        syncRequirements: "Creates corresponding HubSpot Service Tickets. Essential for account health visibility to sales reps.",
        fields: [
          { name: "id", label: "Ticket ID", type: "integer", description: "Numeric Zendesk unique identifier.", hubspotDefaultField: "zendesk_ticket_id" },
          { name: "subject", label: "Ticket Title/Subject", type: "string", description: "Summary label entered by user or agent.", hubspotDefaultField: "subject" },
          { name: "description", label: "Initial Text Body", type: "string (text)", description: "The content of the initial problem assertion.", hubspotDefaultField: "content" },
          { name: "status", label: "Ticket Status", type: "string (status)", description: "Values: new, open, pending, solved, closed.", hubspotDefaultField: "hs_ticket_state" },
          { name: "priority", label: "Ticket Priority", type: "string", description: "Urgency values: low, normal, high, urgent.", hubspotDefaultField: "hs_ticket_priority" },
          { name: "requester_id", label: "Customer (Requester)", type: "string (reference)", description: "The user submitting the ticket.", hubspotDefaultField: "associatedcontactid" },
          { name: "organization_id", label: "Organization ID Link", type: "string (reference)", description: "Associated customer business group.", hubspotDefaultField: "associatedcompanyid" },
          { name: "updated_at", label: "Last Updated Timestamp", type: "datetime", description: "Time of the most recent service reply or alteration.", hubspotDefaultField: "hs_last_modified_date" }
        ]
      },
      {
        id: "zd_user",
        name: "User",
        apiName: "user",
        description: "Customers or staff members active in the support portal.",
        recommendedHubSpotTarget: "contact",
        category: "Support",
        suggestedFrequency: "daily",
        syncRequirements: "Only end-users should be synchronized. Internal staff/agents must be filtered out during runtime pipeline.",
        fields: [
          { name: "id", label: "Contact User ID", type: "string (id)", description: "Zendesk unique member ID.", hubspotDefaultField: "zendesk_user_id" },
          { name: "name", label: "Full Name", type: "string", description: "First and last name of the user.", hubspotDefaultField: "firstname" },
          { name: "email", label: "Email", type: "string (email)", description: "The main login credentials or responder email.", hubspotDefaultField: "email" },
          { name: "role", label: "Member Portal Role", type: "string", description: "Role values: end-user, agent, admin.", hubspotDefaultField: "user_role_type" },
          { name: "phone", label: "Support Phone", type: "string", description: "User primary phone profile.", hubspotDefaultField: "phone" },
          { name: "time_zone", label: "Preferred Timezone", type: "string", description: "Current timezone configured.", hubspotDefaultField: "timezone" }
        ]
      }
    ]
  },
  {
    id: "shopify",
    name: "Shopify Store",
    description: "Connect retail storefront actions. Synchronize customer transactions, discount usage, and order status summaries.",
    logoColor: "bg-lime-600",
    category: "E-commerce",
    objects: [
      {
        id: "sh_order",
        name: "Order",
        apiName: "Order",
        description: "A customer purchase transaction consisting of products, billing state, and fulfillment stages.",
        recommendedHubSpotTarget: "deal",
        category: "E-commerce",
        suggestedFrequency: "real_time",
        syncRequirements: "Best mapped into a specific 'Shopify Checkout' deals pipeline to calculate ROI and customer acquisition cost.",
        fields: [
          { name: "id", label: "Order ID", type: "string (id)", description: "The unique order checkout ID.", hubspotDefaultField: "shopify_order_id" },
          { name: "name", label: "Order Number Tag", type: "string", description: "Standard store identifier, e.g. #1024.", hubspotDefaultField: "dealname" },
          { name: "total_price", label: "Total Sale Amount", type: "currency", description: "Total checkout amount paid by buyer.", hubspotDefaultField: "amount" },
          { name: "financial_status", label: "Payment Status", type: "string", description: "Values: paid, pending, partially_refunded, voided.", hubspotDefaultField: "order_payment_status" },
          { name: "fulfillment_status", label: "Fulfillment State", type: "string", description: "Cargo state: fulfilled, null, partial, restocked.", hubspotDefaultField: "order_fulfillment_status" },
          { name: "customer_id", label: "Customer Link Code", type: "string (reference)", description: "Buyer identification reference node.", hubspotDefaultField: "associatedcontactid" },
          { name: "created_at", label: "Purchase Timestamp", type: "datetime", description: "Precise timestamp buyer initiated payment.", hubspotDefaultField: "closedate" }
        ]
      },
      {
        id: "sh_customer",
        name: "Customer Profile",
        apiName: "Customer",
        description: "Shopify buyer account including shipping addresses and cart behaviors.",
        recommendedHubSpotTarget: "contact",
        category: "E-commerce",
        suggestedFrequency: "real_time",
        syncRequirements: "Map marketing consent check box status. Never send email blasts to opt-out purchasers.",
        fields: [
          { name: "id", label: "Shopify Customer ID", type: "string (id)", description: "Unique buyer database identifier.", hubspotDefaultField: "shopify_customer_id" },
          { name: "email", label: "Email", type: "string (email)", description: "Buyer's account matching key.", hubspotDefaultField: "email" },
          { name: "first_name", label: "First Name", type: "string", description: "Buyer first name.", hubspotDefaultField: "firstname" },
          { name: "last_name", label: "Last Name", type: "string", description: "Buyer last name.", hubspotDefaultField: "lastname" },
          { name: "orders_count", label: "Lifetime Order Count", type: "integer", description: "Cumulative successfully placed orders.", hubspotDefaultField: "number_of_completed_orders" },
          { name: "total_spent", label: "Lifetime Value (LTV)", type: "currency", description: "Total value of all storefront purchases made.", hubspotDefaultField: "total_revenue_spent" },
          { name: "accepts_marketing", label: "Email Opt-In Yes/No", type: "boolean", description: "Has the buyer consented to newsletters?", hubspotDefaultField: "hs_email_optout" }
        ]
      }
    ]
  },
  {
    id: "jira",
    name: "Jira Cloud",
    description: "Align product management and software bug reporting records directly with customer support tickets and client success reps.",
    logoColor: "bg-blue-600",
    category: "Product & Engineering",
    objects: [
      {
        id: "jira_issue",
        name: "Issue / Issue Task",
        apiName: "issue",
        description: "A customer bug report, task assignment, epic milestones, or engineering ticket.",
        recommendedHubSpotTarget: "ticket",
        category: "Core",
        suggestedFrequency: "real_time",
        syncRequirements: "Maps custom escalation ticket pathways. Sales reps can query live engineering tickets representing customer blocker states.",
        fields: [
          { name: "id", label: "Issue ID", type: "string", description: "Unique task record identification.", hubspotDefaultField: "jira_issue_id" },
          { name: "key", label: "Issue Key Code", type: "string", description: "Structured index e.g. PROJ-104.", hubspotDefaultField: "subject" },
          { name: "summary", label: "Title Summary", type: "string", description: "Headline describing tasks or engineering flaws.", hubspotDefaultField: "hs_ticket_body" },
          { name: "status_name", label: "Jira Status State", type: "string", description: "Lifecycle steps e.g. Backlog, In Progress, QA, Solved.", hubspotDefaultField: "hs_ticket_state" },
          { name: "priority", label: "Escalation Level", type: "string", description: "Urgency categorization fields.", hubspotDefaultField: "hs_ticket_priority" },
          { name: "assignee_name", label: "Assigned Dev", type: "string", description: "Active engineer working on resolving issue.", hubspotDefaultField: "jira_developer_assignee" },
          { name: "resolution_date", label: "Resolution Date", type: "datetime", description: "Timestamp indicating issue was successfully solved.", hubspotDefaultField: "closed_date" }
        ]
      }
    ]
  },
  {
    id: "netsuite",
    name: "NetSuite ERP",
    description: "Sync enterprise customer accounts, personnel contact records, opportunities, invoicing, sales orders, item catalogs, and service cases between NetSuite ERP and HubSpot CRM.",
    logoColor: "bg-amber-600",
    category: "Finance & ERP",
    objects: [
      {
        id: "ns_contact",
        name: "Contacts and Individuals",
        apiName: "contact",
        description: "Qualified individual professional profile cards, emails, and address directories associated with clients.",
        recommendedHubSpotTarget: "contact",
        category: "CRM",
        suggestedFrequency: "real_time",
        syncRequirements: "Two-way mapping of individuals. Primarily matched via unique Email address to associate with HubSpot Contacts.",
        fields: [
          { name: "externalId", label: "Contact ID", type: "string (id)", description: "Unique individual key tracking ID in NetSuite.", hubspotDefaultField: "salesforcecontactid" },
          { name: "firstName", label: "First Name", type: "string", description: "Given name of the associated person.", hubspotDefaultField: "firstname" },
          { name: "lastName", label: "Last Name", type: "string", description: "Family / surname of the associated person.", hubspotDefaultField: "lastname" },
          { name: "email", label: "Email Address", type: "string (email)", description: "Primary contact email address used as key identification.", hubspotDefaultField: "email" },
          { name: "phone", label: "Business Phone", type: "string (phone)", description: "Direct office telephone line of the employee.", hubspotDefaultField: "phone" },
          { name: "title", label: "Professional Title", type: "string", description: "Functional title for executive mapping segmentation.", hubspotDefaultField: "jobtitle" },
          { name: "company", label: "Company Association", type: "string (reference)", description: "Reference pairing contact to the parent customer company record.", hubspotDefaultField: "associatedcompanyid" }
        ]
      },
      {
        id: "ns_company",
        name: "Companies",
        apiName: "company",
        description: "Standard customer, prospect, partner, or lead company profiles representing corporate business structures.",
        recommendedHubSpotTarget: "company",
        category: "CRM",
        suggestedFrequency: "hourly",
        syncRequirements: "Two-way matching of accounts. Deduplicated by corporate email domain name or NetSuite company entity identifier.",
        fields: [
          { name: "externalId", label: "Company ID", type: "string (id)", description: "Unique organizational NetSuite entity key.", hubspotDefaultField: "salesforceaccountid" },
          { name: "companyName", label: "Company Name", type: "string", description: "Legal registered title of the corporate client.", hubspotDefaultField: "name" },
          { name: "url", label: "Web Address URL", type: "string (url)", description: "Corporate website domain of the organization.", hubspotDefaultField: "domain" },
          { name: "phone", label: "Office Phone", type: "string (phone)", description: "Main corporate telephone directory number.", hubspotDefaultField: "phone" },
          { name: "subsidiary", label: "Subsidiary ID", type: "integer", description: "Internal Subsidiary identifier for multi-entity companies.", hubspotDefaultField: "industry" },
          { name: "balance", label: "Outstanding Balance", type: "currency", description: "Outstanding multi-period balance currently owed by customer.", hubspotDefaultField: "annualrevenue" }
        ]
      },
      {
        id: "ns_opportunity",
        name: "Opportunities",
        apiName: "opportunity",
        description: "Committed sales lead estimations, forecasted deal values, and buying cycle pipeline stages.",
        recommendedHubSpotTarget: "deal",
        category: "CRM",
        suggestedFrequency: "real_time",
        syncRequirements: "Two-way mapping of active Opportunities with HubSpot Deals. Sync status pipelines, monetary values, and close dates.",
        fields: [
          { name: "externalId", label: "Opportunity ID", type: "string (id)", description: "Unique sales project key identifier.", hubspotDefaultField: "salesforcedealid" },
          { name: "title", label: "Opportunity Title", type: "string", description: "Standard naming label for CRM sales projects.", hubspotDefaultField: "dealname" },
          { name: "amount", label: "Project Projected Value", type: "currency", description: "Expected financial value expected on sales closure.", hubspotDefaultField: "amount" },
          { name: "entity", label: "Target Account Reference", type: "string (reference)", description: "Parent corporate customer reference linked to the opportunity.", hubspotDefaultField: "associatedcompanyid" },
          { name: "expectedCloseDate", label: "Expected Close Date", type: "date", description: "Target deadline by which transaction is estimated to conclude.", hubspotDefaultField: "closedate" },
          { name: "probability", label: "Win Probability (%)", type: "percent", description: "Weighted percentage representing likelihood of winning deal.", hubspotDefaultField: "hs_deal_stage_probability" }
        ]
      },
      {
        id: "ns_invoice",
        name: "Invoices",
        apiName: "invoice",
        description: "Legal financial billing requests and collection logs issued to clients representing debts to be settled.",
        recommendedHubSpotTarget: "invoice",
        category: "Billing",
        suggestedFrequency: "daily",
        syncRequirements: "One-way integration importing NetSuite billing invoices to HubSpot CRM invoice records. Includes balance dues and paid collections status.",
        fields: [
          { name: "externalId", label: "Invoice ID", type: "string (id)", description: "Unique tax-compliant invoice database key identifier.", hubspotDefaultField: "invoice_number" },
          { name: "tranId", label: "Invoice Number Label", type: "string", description: "Structured record reference label, e.g. INV-10041.", hubspotDefaultField: "invoice_number" },
          { name: "amountRemaining", label: "Balance Outstanding", type: "currency", description: "Outstanding payment dollar amount left as uncollected.", hubspotDefaultField: "invoice_amount_due" },
          { name: "amountPaid", label: "Revenue Collected", type: "currency", description: "Total collected portion on this invoice.", hubspotDefaultField: "invoice_amount_paid" },
          { name: "statusRef", label: "Collection Status", type: "picklist", description: "Payment status references: paid, open, partiallyPaid, voided.", hubspotDefaultField: "invoice_is_paid" },
          { name: "dueDate", label: "Due Date Deadline", type: "date", description: "Deadline for payments to clear collections without fees.", hubspotDefaultField: "closedate" }
        ]
      },
      {
        id: "ns_sales_order",
        name: "Sales Orders",
        apiName: "salesOrder",
        description: "Confirmed customer checkout transacting documents, items catalogs, and shipping fulfillment schedules.",
        recommendedHubSpotTarget: "order",
        category: "Billing",
        suggestedFrequency: "hourly",
        syncRequirements: "One-way pipeline mapping ERP confirmed Sales Orders to HubSpot Orders. Links lines of transactions upon shipping fulfillment.",
        fields: [
          { name: "externalId", label: "Sales Order ID", type: "string (id)", description: "Unique ERP checkout order key identifier.", hubspotDefaultField: "salesforcedealid" },
          { name: "tranId", label: "Transaction Label", type: "string", description: "Standard audit code, e.g. SO-35210.", hubspotDefaultField: "dealname" },
          { name: "total", label: "Total Order Price", type: "currency", description: "Cumulative transaction price booked upon checkout.", hubspotDefaultField: "amount" },
          { name: "orderStatus", label: "Fulfillment Stage", type: "picklist", description: "Fulfillment stages: pendingApproval, pendingFulfillment, billed, closed.", hubspotDefaultField: "dealstage" },
          { name: "entity", label: "Customer Connection Link", type: "string (reference)", description: "The customer ID reference matching the transaction.", hubspotDefaultField: "associatedcompanyid" }
        ]
      },
      {
        id: "ns_item",
        name: "Items and Products",
        apiName: "item",
        description: "Product catalog components encompassing assembly, inventory, kit, reseller items, and digital or support service packages.",
        recommendedHubSpotTarget: "product",
        category: "Core",
        suggestedFrequency: "daily",
        syncRequirements: "Two-way matching of items library including assembly, inventory, kit, resale, and service structures with HubSpot Products (SKUs).",
        fields: [
          { name: "externalId", label: "Item ID", type: "string (id)", description: "Unique NetSuite inventory resource reference identifier.", hubspotDefaultField: "hs_product_id" },
          { name: "itemId", label: "Item Sku Code", type: "string", description: "Technical indexing SKU reference string code.", hubspotDefaultField: "name" },
          { name: "displayName", label: "Detailed Item Label", type: "string", description: "Friendly human label displayed on customer invoice layouts.", hubspotDefaultField: "description" },
          { name: "price", label: "Base Store Price", type: "currency", description: "Standard default price unit charged for single item purchase.", hubspotDefaultField: "price" },
          { name: "itemType", label: "NetSuite Item Model", type: "string", description: "ERP categorization values: assembly, inventory, kit, non_inventory, service.", hubspotDefaultField: "hs_sku" }
        ]
      },
      {
        id: "ns_support_case",
        name: "Support Cases",
        apiName: "supportCase",
        description: "Customer service cases, support requests, and help desk ticket files managed within the ERP.",
        recommendedHubSpotTarget: "ticket",
        category: "Support",
        suggestedFrequency: "real_time",
        syncRequirements: "Two-way linkage between NetSuite support cases and HubSpot Service Desk Tickets. Auto-associates support ticket priorities and details.",
        fields: [
          { name: "externalId", label: "Support Case ID", type: "string (id)", description: "Unique case technical table ID.", hubspotDefaultField: "zendesk_ticket_id" },
          { name: "caseNumber", label: "Case Auditable Label", type: "string", description: "Logical folder numbering, e.g. CASE-2051.", hubspotDefaultField: "subject" },
          { name: "title", label: "Problem Subject Heading", type: "string", description: "Help desk topic headline summarizing client concern.", hubspotDefaultField: "subject" },
          { name: "status", label: "Case Stage", type: "string (status)", description: "Case lifetime stages: open, escalated, solved, closed.", hubspotDefaultField: "hs_ticket_state" },
          { name: "priority", label: "Severity Category", type: "string", description: "Severity values: critical, standard, low.", hubspotDefaultField: "hs_ticket_priority" }
        ]
      },
      {
        id: "ns_activity",
        name: "Calls, Events, and Tasks",
        apiName: "activity",
        description: "Logged communication streams comprising sales calls, calendars, meeting schedules, and outstanding to-do tasks.",
        recommendedHubSpotTarget: "activity",
        category: "Core",
        suggestedFrequency: "hourly",
        syncRequirements: "Two-way sync of communications activity timelines. Binds calendar calls, external scheduled events, and tasks to Contacts.",
        fields: [
          { name: "externalId", label: "Activity ID", type: "string (id)", description: "Unique enterprise communications history key.", hubspotDefaultField: "hs_activity_id" },
          { name: "title", label: "Activity Heading", type: "string", description: "Brief description outlining the schedule scope or task goals.", hubspotDefaultField: "hs_activity_title" },
          { name: "message", label: "Logged Comments", type: "string (text)", description: "Internal descriptive logs, feedback, or brief summary notes.", hubspotDefaultField: "hs_activity_notes" },
          { name: "activityType", label: "Channel Type", type: "string", description: "Differentiating flags: Call, Event, Task.", hubspotDefaultField: "hs_activity_type" }
        ]
      }
    ]
  },
  {
    id: "connectwise",
    name: "ConnectWise PSA",
    description: "Sync ticketing, clients, contact records, and service agreements from your ConnectWise Professional Services Automation (PSA) platform into HubSpot CRM pipelines.",
    logoColor: "bg-orange-600",
    category: "IT Support & PSA",
    objects: [
      {
        id: "cw_company",
        name: "Companies",
        apiName: "Company",
        description: "IT accounts, active business clients, and prospects managed inside ConnectWise.",
        recommendedHubSpotTarget: "company",
        category: "CRM",
        suggestedFrequency: "hourly",
        syncRequirements: "Primary matching on Company ID or website address domain. Keeps IT portals mapped to HubSpot corporate profiles.",
        fields: [
          { name: "id", label: "Company ID", type: "integer", description: "Internal identifier representing the company in ConnectWise.", hubspotDefaultField: "salesforceaccountid" },
          { name: "name", label: "Company Name", type: "string", description: "Legal entity name of the client.", hubspotDefaultField: "name" },
          { name: "identifier", label: "Company Code Tag", type: "string", description: "ConnectWise human-readable unique company identification string.", hubspotDefaultField: "name" },
          { name: "status", label: "Company Status", type: "string", description: "Account lifecycle status: Active, Inactive, Blocked, Prospect.", hubspotDefaultField: "industry" },
          { name: "website", label: "Website Address URL", type: "string (url)", description: "The main corporate domain address.", hubspotDefaultField: "domain" },
          { name: "phoneNumber", label: "Office Number", type: "string", description: "Primary company direct line telephone number.", hubspotDefaultField: "phone" }
        ]
      },
      {
        id: "cw_contact",
        name: "Contacts",
        apiName: "Contact",
        description: "Stakeholders, engineers, corporate coordinators, and client contacts associated with IT companies.",
        recommendedHubSpotTarget: "contact",
        category: "CRM",
        suggestedFrequency: "real_time",
        syncRequirements: "Primary matching via email address. Automatically associates Contacts with the correct target HubSpot CRM corporate Companies.",
        fields: [
          { name: "id", label: "Contact ID", type: "integer", description: "Unique ConnectWise database contact identifier.", hubspotDefaultField: "salesforcecontactid" },
          { name: "firstName", label: "First Name", type: "string", description: "First name of the client representative.", hubspotDefaultField: "firstname" },
          { name: "lastName", label: "Last Name", type: "string", description: "Last name of the client representative.", hubspotDefaultField: "lastname" },
          { name: "email", label: "Email Address", type: "string (email)", description: "The user primary email address.", hubspotDefaultField: "email" },
          { name: "phone", label: "Direct Phone", type: "string", description: "Main work phone direct line.", hubspotDefaultField: "phone" },
          { name: "title", label: "Professional Title", type: "string", description: "The professional title of this contact.", hubspotDefaultField: "jobtitle" }
        ]
      },
      {
        id: "cw_ticket",
        name: "Service Tickets",
        apiName: "ServiceTicket",
        description: "Active helpdesk service tickets, incident inquiries, and IT support files submitted by clients.",
        recommendedHubSpotTarget: "ticket",
        category: "Support",
        suggestedFrequency: "real_time",
        syncRequirements: "Aligns IT helpdesk workflows. Maps tickets to HubSpot Service Tickets to display client escalation states to reps.",
        fields: [
          { name: "id", label: "Ticket ID", type: "integer", description: "Unique auditable ConnectWise manage Service Ticket identification code.", hubspotDefaultField: "zendesk_ticket_id" },
          { name: "summary", label: "Problem Heading", type: "string", description: "Brief issue summary header logged by the customer or dispatcher.", hubspotDefaultField: "subject" },
          { name: "status", label: "Service Lifecycle Status", type: "string", description: "Helpdesk status stages: New, Assigned, In Progress, Waiting on Client, Closed.", hubspotDefaultField: "hs_ticket_state" },
          { name: "priority", label: "Severity Priority", type: "string", description: "Urgency values: P1 Critical, P2 High, P3 Medium, P4 Low.", hubspotDefaultField: "hs_ticket_priority" },
          { name: "dateEntered", label: "Created Datetime", type: "datetime", description: "Timestamp when the helpdesk ticket was created.", hubspotDefaultField: "createdate" }
        ]
      },
      {
        id: "cw_opportunity",
        name: "Agreements and IT Opportunities",
        apiName: "Opportunity",
        description: "IT service agreements, software licenses, consulting agreements, and proactive hardware sales pipelines.",
        recommendedHubSpotTarget: "deal",
        category: "CRM",
        suggestedFrequency: "hourly",
        syncRequirements: "Syncs sales pipelines and retainer bookings to HubSpot Deals. Includes deal sizing, stages, and recurring revenue estimates.",
        fields: [
          { name: "id", label: "Opportunity ID", type: "integer", description: "Unique deal reference ID in ConnectWise.", hubspotDefaultField: "salesforcedealid" },
          { name: "name", label: "Deal Title", type: "string", description: "Descriptive label for this active IT sales project.", hubspotDefaultField: "dealname" },
          { name: "stage", label: "Pipeline Stage", type: "string", description: "ConnectWise pipeline stages mapped to HubSpot pipelines.", hubspotDefaultField: "dealstage" },
          { name: "revenue", label: "Opportunity Value", type: "currency", description: "Estimated transaction value or recurring service fees.", hubspotDefaultField: "amount" },
          { name: "closeDate", label: "Expected Close Date", type: "date", description: "Estimated completion date for contract sealing.", hubspotDefaultField: "closedate" }
        ]
      }
    ]
  },
  {
    id: "snowflake",
    name: "Snowflake Data Lake",
    description: "Export structured customer dimension models, product usage telemetry fact tables, and aggregated PQL streams directly from Snowflake warehouse views to enrich HubSpot custom records.",
    logoColor: "bg-cyan-500",
    category: "Data Lakes & Warehouses",
    objects: [
      {
        id: "sfk_customer_dim",
        name: "Customer Dimension Table",
        apiName: "CUSTOMER_DIM",
        description: "Clean customer, account, and organization attributes compiled across backend database tables.",
        recommendedHubSpotTarget: "company",
        category: "Core",
        suggestedFrequency: "daily",
        syncRequirements: "Typically scheduled as a daily or nightly batch job. Enriches HubSpot companies with warehouse computed KPIs.",
        fields: [
          { name: "CUSTOMER_KEY", label: "Warehouse Key ID", type: "string (key)", description: "Snowflake unique natural or surrogate account database key.", hubspotDefaultField: "salesforceaccountid" },
          { name: "COMPANY_NAME", label: "Account Corporate Name", type: "string", description: "Standard legally registered company name.", hubspotDefaultField: "name" },
          { name: "DOMAIN", label: "Website Domain URL", type: "string", description: "Primary web address used as clean mapping key.", hubspotDefaultField: "domain" },
          { name: "LIFETIME_VALUE_USD", label: "Warehouse calculated LTV", type: "currency", description: "Calculated historical spending aggregated from billing systems in warehouse.", hubspotDefaultField: "annualrevenue" },
          { name: "ACTIVE_SEATS_COUNT", label: "Active Software Seats", type: "integer", description: "The compiled concurrent user volume.", hubspotDefaultField: "numberofemployees" }
        ]
      },
      {
        id: "sfk_usage_fact",
        name: "Product Usage Telemetry Fact",
        apiName: "USAGE_FACT_AGG",
        description: "Processed daily telemetry tracking usage score benchmarks, query frequencies, and feature adoption indices.",
        recommendedHubSpotTarget: "activity",
        category: "Core",
        suggestedFrequency: "daily",
        syncRequirements: "Synchronizes product engagement indices into HubSpot Activities for reps to prioritize high-engagement accounts.",
        fields: [
          { name: "METRIC_ID", label: "Warehouse ID String", type: "string", description: "Database transaction surrogate identifier.", hubspotDefaultField: "hs_activity_id" },
          { name: "USER_EMAIL", label: "Account Email Match", type: "string (email)", description: "The email address of the active platform user.", hubspotDefaultField: "email" },
          { name: "DAILY_QUERIES_COUNT", label: "API Query Count", type: "integer", description: "Total daily system search or api requests processed.", hubspotDefaultField: "hs_activity_title" },
          { name: "LAST_LOGIN_TIMESTAMP", label: "Last System Login", type: "datetime", description: "Latest system dashboard activity timestamp logs.", hubspotDefaultField: "hs_activity_notes" }
        ]
      },
      {
        id: "sfk_leads_stream",
        name: "Aggregated Qualified Leads Stream",
        apiName: "LEADS_STREAM_V",
        description: "Live product-qualified lead stream (PQLs) synthesized based on high-growth product engagement models.",
        recommendedHubSpotTarget: "contact",
        category: "CRM",
        suggestedFrequency: "hourly",
        syncRequirements: "Automates sales prospecting. Identifies qualified workspace accounts from telemetry logs to create HubSpot Contacts hourly.",
        fields: [
          { name: "LEAD_ID", label: "Lead Unique ID", type: "string", description: "Technical record identifier from warehouse stream view.", hubspotDefaultField: "salesforcecontactid" },
          { name: "EMAIL", label: "Primary Email Address", type: "string (email)", description: "Database record primary contact address.", hubspotDefaultField: "email" },
          { name: "FIRST_NAME", label: "First Name", type: "string", description: "Extracted first name from the user registration log.", hubspotDefaultField: "firstname" },
          { name: "LAST_NAME", label: "Last Name", type: "string", description: "Extracted last name from the user registration log.", hubspotDefaultField: "lastname" },
          { name: "PQL_SCORE", label: "Engagement PQL Score", type: "integer", description: "Aggregated user product-qualification ranking score.", hubspotDefaultField: "hs_lead_status" }
        ]
      }
    ]
  },
  {
    id: "powerbi",
    name: "Power BI Workspace",
    description: "Sync aggregate intelligence, KPI dashboards, customer report metrics, and executive workspace datasets directly out of Microsoft Power BI pipelines into high-visibility HubSpot fields.",
    logoColor: "bg-yellow-500",
    category: "Analytics & Reporting",
    objects: [
      {
        id: "pbi_dataset",
        name: "Workspace Datasets",
        apiName: "Dataset",
        description: "Refreshed dataset configurations representing model calculations, transactional aggregates, and core analytics indicators.",
        recommendedHubSpotTarget: "company",
        category: "Core",
        suggestedFrequency: "daily",
        syncRequirements: "Refreshes custom company property metrics once daily following scheduled warehouse recalculations.",
        fields: [
          { name: "datasetId", label: "Dataset ID", type: "string (id)", description: "Unique Power BI workspace dataset reference key.", hubspotDefaultField: "salesforceaccountid" },
          { name: "datasetName", label: "Dataset Title", type: "string", description: "Descriptive label of the compiled dataset model.", hubspotDefaultField: "name" },
          { name: "configuredByEmail", label: "Configured By", type: "string (email)", description: "Owner email address authorizing the model.", hubspotDefaultField: "email" },
          { name: "lastRefreshTime", label: "Last Refresh Time", type: "datetime", description: "Timestamp of the latest system dataset update.", hubspotDefaultField: "lastmodifieddate" },
          { name: "customerEngagementIndex", label: "Customer Engagement Index", type: "integer", description: "Calculated target client metric calculated by the BI workspace.", hubspotDefaultField: "annualrevenue" }
        ]
      },
      {
        id: "pbi_report",
        name: "Report Insights & KPIs",
        apiName: "ReportSummary",
        description: "High-level report views count, embedded links, and corporate workspace metrics representing team usage analytics.",
        recommendedHubSpotTarget: "activity",
        category: "Core",
        suggestedFrequency: "hourly",
        syncRequirements: "Fills outbound dashboard reports usage parameters in HubSpot Activities timelines for executive analytics oversight.",
        fields: [
          { name: "reportId", label: "Report ID", type: "string (id)", description: "Unique identifier of the Power BI report dashboard.", hubspotDefaultField: "hs_activity_id" },
          { name: "reportName", label: "Report Name", type: "string", description: "Display label of the Power BI report.", hubspotDefaultField: "hs_activity_title" },
          { name: "reportViewsCount", label: "Report Views Count", type: "integer", description: "Cumulative dashboard visits logged by viewers.", hubspotDefaultField: "hs_activity_type" },
          { name: "reportEmbedUrl", label: "Report Embed URL", type: "string (url)", description: "Secure report frame embedding URL.", hubspotDefaultField: "hs_activity_notes" }
        ]
      }
    ]
  },
  {
    id: "shipstation",
    name: "ShipStation Logistics",
    description: "Synchronize order fulfillments, package shipping status, parcel tracking numbers, and delivery logs between ShipStation warehouse tools and HubSpot backend CRM boards.",
    logoColor: "bg-indigo-950",
    category: "Shipping & Fulfillment",
    objects: [
      {
        id: "ss_shipment",
        name: "Shipments",
        apiName: "Shipment",
        description: "Dispatched parcels, freight shipments, and package tracking indices generated from warehouse shipping labels.",
        recommendedHubSpotTarget: "ticket",
        category: "Support",
        suggestedFrequency: "real_time",
        syncRequirements: "Real-time notifications of package departures. Keeps customer success tickets automatically updated with carrier status.",
        fields: [
          { name: "shipmentId", label: "Shipment ID", type: "integer", description: "Unique ShipStation internal database shipment ID.", hubspotDefaultField: "zendesk_ticket_id" },
          { name: "carrierTrackingNumber", label: "Tracking Number", type: "string", description: "Primary carrier logistical identification code (e.g. FedEx, UPS).", hubspotDefaultField: "subject" },
          { name: "shippingCarrierCode", label: "Shipping Carrier", type: "string", description: "Courier service identifier name.", hubspotDefaultField: "hs_ticket_priority" },
          { name: "deliveryServiceTier", label: "Service Speed Tier", type: "string", description: "Logistics delivery priority speed (e.g. Ground, Next-Day).", hubspotDefaultField: "hs_ticket_priority" },
          { name: "shipmentDispatchedDate", label: "Dispatched Datetime", type: "datetime", description: "Timestamp of package logistics transition handoff.", hubspotDefaultField: "createdate" },
          { name: "shippingStatusLabel", label: "Shipping Status State", type: "string", description: "Real-time cargo state (e.g. Shipped, In-Transit, Delivered).", hubspotDefaultField: "hs_ticket_state" }
        ]
      },
      {
        id: "ss_order",
        name: "Logistics Orders",
        apiName: "LogisticsOrder",
        description: "Raw orders imported into ShipStation awaiting labels generation, weights calculations, and shipping address validations.",
        recommendedHubSpotTarget: "order",
        category: "E-commerce",
        suggestedFrequency: "real_time",
        syncRequirements: "Links shipping labels and fulfillment records directly back to HubSpot Order states.",
        fields: [
          { name: "orderId", label: "Order ID", type: "integer", description: "The ShipStation internal database order identifier.", hubspotDefaultField: "salesforcedealid" },
          { name: "storeOrderNumber", label: "Store Order Number", type: "string", description: "The original e-commerce store billing identifier.", hubspotDefaultField: "dealname" },
          { name: "warehouseOrderStatus", label: "Logistics Status Stage", type: "string", description: "Current logistics stage: await_payment, await_shipment, shipped, cancelled.", hubspotDefaultField: "dealstage" },
          { name: "recipientFullName", label: "Recipient Full Name", type: "string", description: "Full name of target delivery recipient.", hubspotDefaultField: "dealname" },
          { name: "parcelWeightOunces", label: "Parcel Weight (oz)", type: "integer", description: "Total weight of packaged cargo items.", hubspotDefaultField: "amount" }
        ]
      }
    ]
  }
];

export const HUBSPOT_OBJECT_PRESETS = [
  { id: "contact", name: "HubSpot Contacts", icon: "User", description: "Manage individual buyer files, communication feeds, and contact forms." },
  { id: "company", name: "HubSpot Companies", icon: "Building2", description: "Store business organization cards matching accounts." },
  { id: "deal", name: "HubSpot Deals", icon: "DollarSign", description: "Represent and log pipeline deal contracts, stages, and forecast quotas." },
  { id: "ticket", name: "HubSpot Tickets", icon: "LifeBuoy", description: "Track active support feedback records linked directly to clients." },
  { id: "invoice", name: "HubSpot Invoices", icon: "FileText", description: "Synchronize customer billing schedules, tax items, and outstanding balances." },
  { id: "order", name: "HubSpot Orders", icon: "ShoppingBag", description: "Represent and trace standard sales order purchases, fulfillments, and checkouts." },
  { id: "product", name: "HubSpot Products", icon: "Box", description: "Manage standard SKU catalogs, product configurations, definitions, and pricing." },
  { id: "activity", name: "HubSpot Activities", icon: "Calendar", description: "Record historical client contact events, phone logs, calendars, and to-do tasks." },
  { id: "custom_invoice", name: "Custom Object: Stripe Invoice", icon: "Receipt", description: "Store custom layout invoice record attachments in HubSpot." },
  { id: "custom_subscription", name: "Custom Object: Stripe subscription", icon: "Repeat", description: "Track contract license renewals and LTV metrics." }
];

export const MARKETPLACE_OPTIONS_MAP: Record<string, MarketplaceOption[]> = {
  shopify: [
    {
      id: "shopify_hs",
      name: "Official Shopify Integration",
      provider: "HubSpot",
      rating: 4.3,
      reviewsCount: 930,
      badge: "Official & Free",
      features: [
        "Sync Shopify products, contacts, and orders direct to native CRM deals in real time.",
        "Automatic abandoned checkout tracking with built-in email automation triggers.",
        "Out-of-the-box contact list segmentation matching active buyer status and ecommerce metrics.",
        "Deduplicates customers matching email coordinates with HubSpot contact standards."
      ]
    },
    {
      id: "shopify_unific",
      name: "Shopify Integration by Unific",
      provider: "Unific",
      rating: 4.5,
      reviewsCount: 140,
      badge: "Advanced B2B Sync",
      features: [
        "Multi-store support syncing several distinct Shopify storefront locations into a single HubSpot account.",
        "Advanced coupon and discount synchronization linked to custom behavioral triggers.",
        "Extended B2B order routing supporting complex wholesale checkout properties and tax states.",
        "Historical data deep-backfill indexing all older orders into custom timeline segments."
      ]
    }
  ],
  stripe: [
    {
      id: "stripe_hs",
      name: "Stripe Billing (Official)",
      provider: "HubSpot",
      rating: 4.1,
      reviewsCount: 420,
      badge: "Official & Free",
      features: [
        "Create customers directly in Stripe using contacts or company cards built inside HubSpot.",
        "Process payments seamlessly on HubSpot native quotes and send transactions directly to Stripe.",
        "Embed and list subscription cycles, invoice status logs directly inside contact timeline feeds."
      ]
    },
    {
      id: "stripe_depositfix",
      name: "Stripe Checkout & Forms by DepositFix",
      provider: "DepositFix",
      rating: 4.8,
      reviewsCount: 125,
      badge: "Custom Checkouts",
      features: [
        "Allows direct payments checkout embedded inside standard HubSpot Landing pages.",
        "Dual-engine support: process Stripe cards and PayPal checkouts side-by-side in custom forms.",
        "Map custom fields during charge collections into custom properties (e.g. donations, attributes)."
      ]
    }
  ],
  netsuite: [
    {
      id: "netsuite_hs",
      name: "NetSuite Integration (Official)",
      provider: "HubSpot",
      rating: 2.7,
      reviewsCount: 180,
      badge: "Basic Connection",
      features: [
        "Simple data synchronization for corporate client companies, individual contacts, and inventory products.",
        "Sync NetSuite transactions directly with corresponding pipeline deals.",
        "Warning: Ecosystem reviews mention rigid mapping fields and API limit exhaustion warnings."
      ]
    },
    {
      id: "netsuite_celigo",
      name: "Celigo NetSuite Integration App",
      provider: "Celigo",
      rating: 4.7,
      reviewsCount: 220,
      badge: "Ecosystem Favorite",
      features: [
        "Pre-built, highly adaptive workflows handling complex parent-child hierarchy resolutions perfectly.",
        "Bidirectional updates across customized ERP tables, assemblies, and custom fields.",
        "Enterprise-grade error management dashboard supporting real-time tracking and retry queues."
      ]
    }
  ],
  zendesk: [
    {
      id: "zendesk_hs",
      name: "Zendesk Support Integration",
      provider: "HubSpot",
      rating: 3.9,
      reviewsCount: 310,
      badge: "Official Live-Viewer",
      features: [
        "Directly view ticket logs and priority indicators on HubSpot contact CRM timelines.",
        "Automate lists and emails using ticket creation, update, and closing statuses."
      ]
    },
    {
      id: "zendesk_piesync",
      name: "Zendesk Sync by PieSync (HubSpot)",
      provider: "HubSpot",
      rating: 4.4,
      reviewsCount: 85,
      badge: "Bidirectional CRM Sync",
      features: [
        "Real-time bidirectional contact database synchronization with smart field mappings.",
        "Allows merging tags, user roles, and agent notes directly with HubSpot profile variables."
      ]
    }
  ],
  omnia360: [
    {
      id: "omnia360_marketplace_none",
      name: "Omnia 360 Integration (Unavailable)",
      provider: "None",
      rating: 1.5,
      reviewsCount: 1,
      badge: "No Certified App",
      features: [
        "⚠️ Zero marketplace integrations are available for CHR Solutions' Omnia 360 in the HubSpot App Directory.",
        "Requires building a custom REST API integration or utilizing enterprise middleware (e.g. Workato, MuleSoft).",
        "Ecosystem records warn that linking telecom-grade customer account meters and historical BSS bills to HubSpot requires dynamic object mapping."
      ]
    }
  ]
};
