import React, { useState, useMemo } from "react";
import { Sparkles, Info, Check, CornerDownRight, ArrowRight, CornerRightDown, Workflow, BrainCircuit, FileText } from "lucide-react";
import { SaasToolPreset, SaaSObject, ObjectMapping, SyncFrequency, SyncDirection, FieldMapping } from "../types";
import { SAAS_PRESETS } from "../data";
import TranscriptUploader from "./TranscriptUploader";

interface UseCasePlannerProps {
  currentToolId: string;
  customTools: SaasToolPreset[];
  onApplyPreset: (toolId: string, enabledObjectIds: string[], directions: Record<string, SyncDirection>, frequencies: Record<string, SyncFrequency>) => void;
  onAddCustomPreset?: (preset: SaasToolPreset) => void;
}

interface UseCaseExample {
  title: string;
  subtitle: string;
  query: string;
  toolId: string;
}

const USE_CASE_EXAMPLES: UseCaseExample[] = [
  {
    title: "NetSuite ERP Financial Sync",
    subtitle: "Recommended for prospects syncing NetSuite records with HubSpot Deals & Invoices",
    query: "We are on NetSuite. We want two-way sync for Contacts and Companies so our accounts match perfectly. We also need NetSuite Opportunities synced as HubSpot Deals in real-time. Invoices should sync daily from NetSuite to HubSpot to let salespeople see payment status. No support tickets or orders are needed.",
    toolId: "netsuite"
  },
  {
    title: "Salesforce bidirectional CRM Sync",
    subtitle: "Classic enterprise integration between Salesforce sales cloud and HubSpot Marketing Hub",
    query: "I need to connect our Salesforce system. I want two-way sync for Accounts, Contacts, and Opportunities so any edits on either side update bi-directionally in nearly real-time. Unqualified Leads should import hourly from Salesforce to HubSpot Contacts.",
    toolId: "salesforce"
  },
  {
    title: "Stripe Recurring Subscription Setup",
    subtitle: "Perfect for SaaS companies syncing Stripe subscriptions & invoices to customer profiles",
    query: "We want Stripe customer invoices import-only on a daily basis so we see balance outstanding inside HubSpot. Stripe Subscriptions should sync in real-time so we can automate customer upgrades. Also, Stripe Customer profiles should sync bidirectionally.",
    toolId: "stripe"
  },
  {
    title: "ConnectWise IT Services Integration",
    subtitle: "For MSP companies syncing helpdesk service tickets, client companies, and billing agreements",
    query: "We use ConnectWise. We want to import client Companies hourly and sync Contacts bidirectionally. We need Service Tickets to import into HubSpot Tickets in real-time. Also, sync ConnectWise Agreements and IT Opportunities to HubSpot Deals.",
    toolId: "connectwise"
  },
  {
    title: "Snowflake Data Warehouse Enrichment",
    subtitle: "Extract firmographic warehouse tables, product usage metrics, and PQL events into HubSpot",
    query: "We run Snowflake. We want daily import of Customer Dimension Tables to HubSpot Companies for metric sync. We also want telemetry logs from our Usage Fact Table to sync daily to HubSpot Activities, and our Aggregated Leads Stream to load PQL Contacts hourly.",
    toolId: "snowflake"
  },
  {
    title: "Power BI Analytics Dashboard Sync",
    subtitle: "Sync compiled workspace datasets and analytics report metrics directly into HubSpot CRM",
    query: "We use Power BI. We want to import workspace Dataset models to HubSpot Companies daily. We also want to sync Report Insights and KPI summaries as customer activities hourly.",
    toolId: "powerbi"
  },
  {
    title: "ShipStation Logistics Tracking",
    subtitle: "Sync delivery ship dates, shipping statuses, and tracking numbers into HubSpot Tickets",
    query: "We use ShipStation for logistics. We need to import our Shipments structure as support tickets in real-time. Also, sync logistics Orders into HubSpot Orders in real-time.",
    toolId: "shipstation"
  }
];

export default function UseCasePlanner({ currentToolId, customTools, onApplyPreset, onAddCustomPreset }: UseCasePlannerProps) {
  const [useCaseText, setUseCaseText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedResult, setAnalyzedResult] = useState<any | null>(null);
  const [activePlannerTab, setActivePlannerTab] = useState<"interactive" | "transcripts">("interactive");

  const allTools = useMemo(() => {
    return [...SAAS_PRESETS, ...customTools];
  }, [customTools]);

  // Click on a sample use case card
  const handleSelectExample = (example: UseCaseExample) => {
    setUseCaseText(example.query);
    triggerAnalysis(example.query);
  };

  // Run the Heuristic NLP Analyzer
  const triggerAnalysis = (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    setIsAnalyzing(true);

    // Simulate standard, premium micro-delay for visual aesthetic
    setTimeout(() => {
      const lower = textToAnalyze.toLowerCase();

      // Split text into sentences using simple period/question/exclamation and trim
      const sentences = textToAnalyze
        .split(/[.!?]+/)
        .map(s => s.toLowerCase().trim())
        .filter(s => s.length > 0);

      // 1. Detect tool ID (Check highly specific brands FIRST, then fall back to generic tags)
      let matchedToolId = currentToolId;
      if (lower.includes("shopify")) {
        matchedToolId = "shopify";
      } else if (lower.includes("netsuite") || lower.includes("net suite")) {
        matchedToolId = "netsuite";
      } else if (lower.includes("salesforce") || lower.includes("sales force") || lower.includes("sfdc")) {
        matchedToolId = "salesforce";
      } else if (lower.includes("stripe")) {
        matchedToolId = "stripe";
      } else if (lower.includes("zendesk")) {
        matchedToolId = "zendesk";
      } else if (lower.includes("jira") || lower.includes("atlassian")) {
        matchedToolId = "jira";
      } else if (lower.includes("connectwise") || lower.includes("connect wise")) {
        matchedToolId = "connectwise";
      } else if (lower.includes("snowflake")) {
        matchedToolId = "snowflake";
      } else if (lower.includes("power_bi") || lower.includes("powerbi") || lower.includes("power bi") || lower.includes("pbi")) {
        matchedToolId = "powerbi";
      } else if (lower.includes("shipstation") || lower.includes("ship station")) {
        matchedToolId = "shipstation";
      }
      // If NO exact brand keyword exists in the text, fall back to secondary contextual terms
      else if (lower.includes("shop") || lower.includes("store") || lower.includes("e-commerce") || lower.includes("cart")) {
        matchedToolId = "shopify";
      } else if (lower.includes("payment") || lower.includes("subscription") || lower.includes("billing")) {
        matchedToolId = "stripe";
      } else if (lower.includes("crm") || lower.includes("lead") || lower.includes("pipeline") || lower.includes("sales cloud")) {
        matchedToolId = "salesforce";
      } else if (lower.includes("helpdesk") || lower.includes("ticket") || lower.includes("support")) {
        matchedToolId = "zendesk";
      } else if (lower.includes("bug") || lower.includes("sprint") || lower.includes("developer") || lower.includes("issue")) {
        matchedToolId = "jira";
      } else if (lower.includes("erp") || lower.includes("ns_") || lower.includes("suite") || lower.includes("ledger") || lower.includes("accounting") || lower.includes("invoice")) {
        matchedToolId = "netsuite";
      } else if (lower.includes("psa") || lower.includes("service board") || lower.includes("manage")) {
        matchedToolId = "connectwise";
      } else if (lower.includes("warehouse") || lower.includes("data lake") || lower.includes("query") || lower.includes("lake") || lower.includes("db")) {
        matchedToolId = "snowflake";
      } else if (lower.includes("dashboard") || lower.includes("bi") || lower.includes("report")) {
        matchedToolId = "powerbi";
      } else if (lower.includes("shipping") || lower.includes("fulfillment") || lower.includes("delivery") || lower.includes("shipment") || lower.includes("tracking") || lower.includes("logistics")) {
        matchedToolId = "shipstation";
      }

      const activeTool = allTools.find((t) => t.id === matchedToolId) || allTools[0];

      // 2. Identify sync intent for each object inside that tool
      const recommendedObjectIds: string[] = [];
      const recommendedDirections: Record<string, SyncDirection> = {};
      const recommendedFrequencies: Record<string, SyncFrequency> = {};
      const explanations: { objName: string; reason: string }[] = [];

      activeTool.objects.forEach((obj) => {
        const objId = obj.id;
        const nameLower = obj.name.toLowerCase();
        const apiLower = obj.apiName.toLowerCase();

        // Check if user explicitly excludes it
        let isExcluded = false;
        const exclusionKws = [
          `no ${nameLower}`, `no ${apiLower}`,
          `exclude ${nameLower}`, `exclude ${apiLower}`,
          `don't want ${nameLower}`, `don't need ${nameLower}`,
          `without ${nameLower}`, `ignore ${nameLower}`
        ];
        
        exclusionKws.forEach((kw) => {
          if (lower.includes(kw)) {
            isExcluded = true;
          }
        });

        // Also check if general synonyms are excluded
        if (objId === "ns_support_case" && (lower.includes("no case") || lower.includes("no ticket") || lower.includes("no support"))) isExcluded = true;
        if (objId === "ns_sales_order" && lower.includes("no order")) isExcluded = true;
        if (objId === "ns_invoice" && lower.includes("no invoice")) isExcluded = true;

        // Check if explicitly or implicitly requested
        let isRequested = false;
        const inclusionKws = [
          nameLower, apiLower, obj.recommendedHubSpotTarget.toLowerCase()
        ];

        // Specific mappings mapping override logic
        if (objId === "ns_contact") inclusionKws.push("contact", "individual", "people");
        if (objId === "ns_company") inclusionKws.push("company", "companies", "account", "customer");
        if (objId === "ns_opportunity") inclusionKws.push("opportunity", "deal", "pipeline");
        if (objId === "ns_invoice") inclusionKws.push("invoice", "billing");
        if (objId === "ns_sales_order") inclusionKws.push("order", "sales order");
        if (objId === "ns_item") inclusionKws.push("product", "item", "sku", "catalog");
        if (objId === "ns_support_case") inclusionKws.push("ticket", "case", "support");
        if (objId === "ns_activity") inclusionKws.push("activity", "call", "task", "calendar");

        if (objId === "stripe_customer") inclusionKws.push("customer", "profile");
        if (objId === "stripe_subscription") inclusionKws.push("subscription");
        if (objId === "stripe_invoice") inclusionKws.push("invoice", "billing");

        if (objId === "cw_company") inclusionKws.push("company", "companies", "client", "account");
        if (objId === "cw_contact") inclusionKws.push("contact", "individual", "coordinator");
        if (objId === "cw_ticket") inclusionKws.push("ticket", "service ticket", "helpdesk", "incident");
        if (objId === "cw_opportunity") inclusionKws.push("agreement", "opportunity", "contract", "deal");

        if (objId === "sfk_customer_dim") inclusionKws.push("dimension", "customer table", "customer_dim", "company", "firmographic");
        if (objId === "sfk_usage_fact") inclusionKws.push("telemetry", "usage", "fact", "engagement", "activity");
        if (objId === "sfk_leads_stream") inclusionKws.push("pql", "prospecting", "lead", "leads_stream", "growth");

        if (objId === "pbi_dataset") inclusionKws.push("dataset", "workspace dataset", "dataset title", "dataset id");
        if (objId === "pbi_report") inclusionKws.push("report", "dashboard", "insights", "summary", "reportSummary");

        if (objId === "ss_shipment") inclusionKws.push("shipment", "carrier", "tracking", "courier", "dispatch", "parcel");
        if (objId === "ss_order") inclusionKws.push("logistics order", "store order", "order", "parcel weight", "weight");

        inclusionKws.forEach((kw) => {
          if (lower.includes(kw)) {
            isRequested = true;
          }
        });

        // By default, if the use case matches general themes, auto-enable first key objects
        if (!isRequested && !isExcluded) {
          // Default enable primary objects like contacts or customers in normal context
          if (objId.includes("contact") || objId.includes("customer") || objId.includes("account")) {
            isRequested = true;
          }
        }

        if (isRequested && !isExcluded) {
          recommendedObjectIds.push(objId);

          // Find sentences mentioning this specific object
          const matchingSentences = sentences.filter((s) =>
            inclusionKws.some((kw) => s.includes(kw))
          );

          // Determine direction
          let dir: SyncDirection = "saas_to_hs"; // default import
          let dirReason = `From ${activeTool.name} to HubSpot`;

          if (matchingSentences.length > 0) {
            const combinedSentenceText = matchingSentences.join(" ");
            
            if (
              combinedSentenceText.includes("bi-directional") || 
              combinedSentenceText.includes("bidirectional") || 
              combinedSentenceText.includes("two-way") || 
              combinedSentenceText.includes("two way") || 
              combinedSentenceText.includes("both directions") || 
              combinedSentenceText.includes("both direction") ||
              combinedSentenceText.includes("sync back and forth") ||
              combinedSentenceText.includes("update both side")
            ) {
              dir = "bidirectional";
              dirReason = "Two-Way Sync";
            } else if (
              combinedSentenceText.includes("export") || 
              combinedSentenceText.includes("hubspot to") || 
              combinedSentenceText.includes("hs to") ||
              combinedSentenceText.includes(`to ${activeTool.name.toLowerCase()}`) ||
              combinedSentenceText.includes(`into ${activeTool.name.toLowerCase()}`)
            ) {
              dir = "hs_to_saas";
              dirReason = `From HubSpot to ${activeTool.name}`;
            } else if (
              combinedSentenceText.includes("import") || 
              combinedSentenceText.includes("one-way") || 
              combinedSentenceText.includes("one way") || 
              combinedSentenceText.includes("only") || 
              combinedSentenceText.includes(`${activeTool.name.toLowerCase()} to`) ||
              combinedSentenceText.includes(`from ${activeTool.name.toLowerCase()}`)
            ) {
              dir = "saas_to_hs";
              dirReason = `From ${activeTool.name} to HubSpot`;
            }
          } else {
            // General simple prompt fallback
            if (
              lower.includes("bi-directional") || 
              lower.includes("bidirectional") || 
              lower.includes("two-way") || 
              lower.includes("two way")
            ) {
              if (lower.split(/\s+/).length < 20) {
                dir = "bidirectional";
                dirReason = "Two-Way Sync";
              } else {
                dir = "saas_to_hs";
                dirReason = `From ${activeTool.name} to HubSpot`;
              }
            }
          }

          recommendedDirections[objId] = dir;

          // Determine frequency
          let freq: SyncFrequency = obj.suggestedFrequency;
          let freqReason = "Standard frequency";

          if (lower.includes("real-time") || lower.includes("realtime") || lower.includes("instant") || lower.includes("active trigger")) {
            freq = "real_time";
            freqReason = "⚡ Real-time webhooks";
          } else if (lower.includes("hourly") || lower.includes("hour")) {
            freq = "hourly";
            freqReason = "⏱️ Hourly batch sweep";
          } else if (lower.includes("daily") || lower.includes("day")) {
            freq = "daily";
            freqReason = "📅 Daily cron cycle";
          } else if (lower.includes("manual")) {
            freq = "manual";
            freqReason = "🎯 Manual trigger only";
          }

          recommendedFrequencies[objId] = freq;

          explanations.push({
            objName: obj.name,
            reason: `${dirReason} scheduled via ${freqReason}.`
          });
        }
      });

      setAnalyzedResult({
        tool: activeTool,
        activeObjects: activeTool.objects.filter((o) => recommendedObjectIds.includes(o.id)),
        directions: recommendedDirections,
        frequencies: recommendedFrequencies,
        explanations
      });
      setIsAnalyzing(false);
    }, 850);
  };

  const handleApplyConfig = () => {
    if (!analyzedResult) return;
    const objectIds = analyzedResult.activeObjects.map((o: SaaSObject) => o.id);
    onApplyPreset(
      analyzedResult.tool.id,
      objectIds,
      analyzedResult.directions,
      analyzedResult.frequencies
    );

    // Scroll smoothly to step 2 after applying
    setTimeout(() => {
      const step2Header = document.getElementById("object-selector-panel");
      if (step2Header) {
        step2Header.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  return (
    <div id="use-case-planner-container" className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md relative overflow-hidden space-y-6">
      <div className="absolute -left-20 -top-20 w-48 h-48 bg-orange-500/5 pointer-events-none rounded-full" />
      <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-orange-500/5 pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-display">
            <span className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-xs">
              <BrainCircuit className="w-4 h-4 animate-pulse text-orange-400" />
            </span>
            <span>A.I. Integration Blueprint Planner</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Describe your business sync goals in simple natural text or upload discovery call transcripts and notes. Our system will analyze your needs, pre-select the appropriate tools, activate objects, and build your draft pipeline specification.
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/15 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" /> PROSPECT PLAYGROUND
        </span>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-800/80 gap-1.5 pb-px font-sans">
        <button
          type="button"
          onClick={() => setActivePlannerTab("interactive")}
          className={`px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer rounded-t-lg -mb-px ${
            activePlannerTab === "interactive"
              ? "bg-slate-950/60 border-t border-x border-slate-800/80 text-orange-400"
              : "text-slate-450 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 leading-none text-orange-500" />
          <span>Interactive Scope Builder</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePlannerTab("transcripts")}
          className={`px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer rounded-t-lg -mb-px ${
            activePlannerTab === "transcripts"
              ? "bg-slate-950/60 border-t border-x border-slate-800/80 text-orange-400"
              : "text-slate-450 text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5 leading-none text-orange-500" />
          <span>Discovery Call Transcripts & Docs</span>
          <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20 leading-none">
            EXTRACTION LAB
          </span>
        </button>
      </div>

      {activePlannerTab === "interactive" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Input Panel */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative">
              <textarea
                id="txt-integration-usecase"
                rows={4}
                value={useCaseText}
                onChange={(e) => setUseCaseText(e.target.value)}
                placeholder="Example: We run NetSuite ERP. Sync our multi-entity Companies and Contacts bi-directionally every hour. Also import Invoices daily so they sync from NetSuite to HubSpot deal records, but please ignore support cases and tickets..."
                className="w-full text-slate-200 text-sm bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/40 outline-none transition-shadow placeholder-slate-650 resize-none font-sans"
              />
              {useCaseText.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setUseCaseText("");
                    setAnalyzedResult(null);
                  }}
                  className="absolute right-3.5 bottom-3.5 px-2.5 py-1 text-[10px] text-slate-450 hover:bg-slate-900 border border-slate-800 rounded bg-slate-950 cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                disabled={isAnalyzing || !useCaseText.trim()}
                onClick={() => triggerAnalysis(useCaseText)}
                className={`px-4 py-2.5 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg w-full sm:w-auto ${
                  useCaseText.trim()
                    ? "bg-orange-500 text-slate-950 hover:opacity-90 shadow-orange-500/10"
                    : "bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800 shadow-none"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                {isAnalyzing ? "Analyzing Request..." : "Analyze & Design Blueprint"}
              </button>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 leading-tight">
                <Info className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span>Or click one of the pre-configured prospect use cases below to test:</span>
              </div>
            </div>

            {/* Preset Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {USE_CASE_EXAMPLES.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectExample(example)}
                  className="text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-900/60 transition-all border border-slate-850 hover:border-slate-800 text-xs space-y-1 group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-200 group-hover:text-orange-400 font-display flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {example.title}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-orange-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-[10px] text-slate-450 font-sans leading-relaxed">
                    {example.subtitle}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right Recommended Structure Dashboard */}
          <div className="lg:col-span-12 xl:col-span-5 flex flex-col justify-between border border-slate-800 rounded-xl bg-slate-950/40 p-5 space-y-4 shadow-xl min-h-[320px] lg:col-span-5 relative overflow-hidden">
            {isAnalyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-t-orange-500 border-r-transparent border-slate-800 animate-spin" />
                  <BrainCircuit className="w-4 h-4 text-orange-400 absolute animate-pulse" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Simulating Cognitive Mapping...</h4>
                <p className="text-[11px] text-slate-500 max-w-xs font-sans">
                  Scanning terms, matching properties, and constructing optimal data direction matrices...
                </p>
              </div>
            ) : analyzedResult ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="border-b border-slate-900 pb-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                        Blueprint Proposal
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 mt-1.5 flex items-center gap-1.5 font-display">
                        {analyzedResult.tool.name} Integration Match
                      </h3>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${analyzedResult.tool.logoColor} text-white`}>
                      {analyzedResult.tool.name.charAt(0)}
                    </div>
                  </div>

                  {/* Proposal parameters list */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Recommended Objects Scope ({analyzedResult.activeObjects.length} enabled)
                    </h4>
                    <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1 font-sans">
                      {analyzedResult.activeObjects.map((obj: SaaSObject) => {
                        const dir = analyzedResult.directions[obj.id];
                        const toolName = analyzedResult.tool.name;
                        const dirLabel = dir === "bidirectional" 
                          ? "🔄 Two-Way Sync" 
                          : dir === "hs_to_saas" 
                            ? `📤 From HubSpot to ${toolName}` 
                            : `📥 From ${toolName} to HubSpot`;

                        return (
                          <div key={obj.id} className="p-2 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-between text-xs gap-3">
                            <div className="min-w-0">
                              <span className="font-bold text-slate-200 block truncate font-display">{obj.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">Target: HubSpot {obj.recommendedHubSpotTarget}</span>
                            </div>
                            <div className="flex flex-col items-end text-right">
                              <span className="text-[10px] font-medium text-orange-400 bg-orange-500/5 border border-orange-500/10 px-2 py-0.5 rounded">
                                {dirLabel}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                                {analyzedResult.frequencies[obj.id] === "real_time" ? "Instant (Webhook)" : analyzedResult.frequencies[obj.id]}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Next Instructions */}
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs text-slate-350 space-y-1 font-sans leading-relaxed">
                    <h5 className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" /> Proposed Design Complete!
                    </h5>
                    <p className="text-slate-400 text-[11px]">
                      Click <strong>Apply Recommended Workspace Config</strong> below. The system will pre-configure your entire integration. Next, continue scrolling down to confirm:
                    </p>
                    <ul className="list-disc pl-4 text-[10px] text-slate-400 mt-1 space-y-0.5">
                      <li>Confirm exact database objects in **Step 2**.</li>
                      <li>Detailed custom properties mapping in **Step 3**.</li>
                      <li>Verify visual live flows in the **Interactive ERD (Step 4)**.</li>
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyConfig}
                  className="w-full py-2.5 font-bold text-xs bg-orange-500 text-slate-950 hover:bg-orange-400 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-all"
                >
                  <span>Apply Recommended Workspace Config</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 select-none">
                <BrainCircuit className="w-8 h-8 text-slate-800 stroke-1.5 mb-2.5" />
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Idle Blueprint Model</h4>
                <p className="text-xs text-slate-550 max-w-xs mt-1.5 leading-relaxed font-sans">
                  Enter your integration requirements in the left text field or choose an example use case above. The engine will instantly build a custom workspace snapshot.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <TranscriptUploader
          currentToolId={currentToolId}
          customTools={customTools}
          onApplyPreset={onApplyPreset}
          onSetUseCaseText={setUseCaseText}
          onAddCustomPreset={onAddCustomPreset}
        />
      )}
    </div>
  );
}
