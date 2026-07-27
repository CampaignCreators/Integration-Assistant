import React, { useMemo } from "react";
import { SaasToolPreset, SaaSObject, MarketplaceOption } from "../types";
import { 
  Star, ShieldAlert, CheckCircle2, AlertTriangle, Cpu, Workflow, 
  HelpCircle, Settings, ArrowRight, ExternalLink, ShieldCheck, ThumbsUp, Check
} from "lucide-react";
import { MARKETPLACE_OPTIONS_MAP } from "../data";

export type IntegrationApproachType = "native" | "middleware" | "custom";
export type MiddlewarePlatformType = "celigo" | "zapier" | "make";

interface ApproachSelectorProps {
  tool: SaasToolPreset;
  selectedObjects: SaaSObject[];
  approach: IntegrationApproachType;
  onChangeApproach: (approach: IntegrationApproachType) => void;
  middlewarePlatform: MiddlewarePlatformType;
  onChangeMiddlewarePlatform: (platform: MiddlewarePlatformType) => void;
  selectedMarketplaceOptionId?: string;
  onChangeMarketplaceOptionId?: (id: string) => void;
}

interface ApproachAdvice {
  rating: number;
  ratingCount: number;
  nativeStatus: "excellent" | "limited" | "not_supported" | "complex";
  nativeStatusText: string;
  nativeStatusBg: string;
  nativeStatusTextCol: string;
  ecosystemReviewSnippet: string;
  nativeLimitations: string[];
  recommendation: {
    approach: "native" | "middleware" | "custom";
    reason: string;
  };
}

export default function ApproachSelector({
  tool,
  selectedObjects,
  approach,
  onChangeApproach,
  middlewarePlatform,
  onChangeMiddlewarePlatform,
  selectedMarketplaceOptionId = "default",
  onChangeMarketplaceOptionId = () => {}
}: ApproachSelectorProps) {

  // Dynamic advice generator based on selected SaaS Tool
  const advice: ApproachAdvice = useMemo(() => {
    const toolId = tool.id.toLowerCase();
    
    // Fallback default
    const defaultAdvice: ApproachAdvice = {
      rating: 3.8,
      ratingCount: 140,
      nativeStatus: "limited",
      nativeStatusText: "Standard Limits",
      nativeStatusBg: "bg-amber-500/10 border-amber-500/25",
      nativeStatusTextCol: "text-amber-400",
      ecosystemReviewSnippet: "Standard objects map easily, but custom fields or unique transactional records require elevated API scopes and often fail to sync smoothly during rapid edits.",
      nativeLimitations: [
        "Bidirectional synchronization is restricted on custom fields.",
        "Custom fields are limited to primitive types (no rich nested schemas).",
        "Lacks dynamic logging - difficult to trace sync errors without specialized tools."
      ],
      recommendation: {
        approach: "middleware",
        reason: "Using a dedicated middleware option like Celigo or Make is highly recommended to bridge standard mapping constraints without custom server maintenance."
      }
    };

    if (toolId.includes("salesforce")) {
      return {
        rating: 4.6,
        ratingCount: 1640,
        nativeStatus: "excellent",
        nativeStatusText: "Highly Feasible (Ecosystem Favorite)",
        nativeStatusBg: "bg-emerald-500/10 border-emerald-500/25",
        nativeStatusTextCol: "text-emerald-400",
        ecosystemReviewSnippet: "The official Salesforce interface is robust and bidirectional. Reviews praise real-time contact sync but warn that massive batch updates (50k+ records) can hit Daily API limit caps under low-tier licenses.",
        nativeLimitations: [
          "Enterprise or Unlimited Salesforce tier is required to utilize full metadata endpoints.",
          "Custom object synchronization requires a paid HubSpot Enterprise upgrade.",
          "State and Country picklists often trigger sync blocks if formatting doesn't align."
        ],
        recommendation: {
          approach: "native",
          reason: "The native HubSpot-Salesforce Integration is extremely robust, fully supported, and officially maintained. Use native unless you need complex custom mapping formulas!"
        }
      };
    }

    if (toolId.includes("stripe")) {
      return {
        rating: 4.1,
        ratingCount: 420,
        nativeStatus: "excellent",
        nativeStatusText: "Highly Feasible",
        nativeStatusBg: "bg-emerald-500/10 border-emerald-500/25",
        nativeStatusTextCol: "text-emerald-400",
        ecosystemReviewSnippet: "Great for mapping Stripe checkouts to contact records and billing timelines. However, users report native syncing does not support complex multi-line invoicing setups or custom revenue-splitting models natively.",
        nativeLimitations: [
          "Cannot naturally write back CRM deals into Stripe invoices without custom scripts.",
          "Custom subscription tiers are occasionally merged, skewing MRR metrics in reports.",
          "Invoice refund events must be handled manually or through external state code."
        ],
        recommendation: {
          approach: "native",
          reason: "The native integration is brilliant for basic revenue/payment attribution. If your organization relies on wholesale parent-child accounts, implement Middleware."
        }
      };
    }

    if (toolId.includes("netsuite")) {
      return {
        rating: 2.7,
        ratingCount: 180,
        nativeStatus: "complex",
        nativeStatusText: "High Friction / Poor Reviews",
        nativeStatusBg: "bg-rose-500/10 border-rose-500/25",
        nativeStatusTextCol: "text-[#EF4444]",
        ecosystemReviewSnippet: "Ecosystem reviews highlight significant integration friction. Users complain about rigid schema structures, high latency, errors when resolving company parent relations, and expensive SuiteTalk API requirements.",
        nativeLimitations: [
          "Requires deep NetSuite administrative permissions and costly SuiteTalk licensing.",
          "Fails to synchronize custom ERP objects without massive complex scripting packages.",
          "Error messages in HubSpot are highly generic, making trace audits tedious."
        ],
        recommendation: {
          approach: "middleware",
          reason: "Due to poor reviews of the native connector's performance, middleware (such as Celigo NetSuite Integration App) is universally preferred in production."
        }
      };
    }

    if (toolId.includes("connectwise")) {
      return {
        rating: 3.1,
        ratingCount: 95,
        nativeStatus: "complex",
        nativeStatusText: "Rigid Integration Schema",
        nativeStatusBg: "bg-orange-500/10 border-orange-500/25",
        nativeStatusTextCol: "text-orange-400",
        ecosystemReviewSnippet: "Provides basic sync for client companies, but fails to handle ticketing or custom SLA activity metrics accurately. Users rate it 3.1 stars due to sync delays and duplicate records during matching operations.",
        nativeLimitations: [
          "Duplicate entries occur if matching by company domain isn't carefully enforced.",
          "Support for ticketing statuses and custom fields is highly limited.",
          "Field mapping alterations require full sync resets, causing downstream down-time."
        ],
        recommendation: {
          approach: "middleware",
          reason: "Recommend a Middleware platform (Zapier or Make) to handle custom ticketing objects and check schemas before writing them into HubSpot to prevent duplicates."
        }
      };
    }

    if (toolId.includes("jira")) {
      return {
        rating: 3.9,
        ratingCount: 310,
        nativeStatus: "limited",
        nativeStatusText: "Partially Suited",
        nativeStatusBg: "bg-amber-500/10 border-amber-500/25",
        nativeStatusTextCol: "text-amber-400",
        ecosystemReviewSnippet: "Very solid for linking Jira Service Desk tickets into HubSpot contacts and support loops. Lacks ability to sync custom Jira epic pipelines or complex multi-org project tables natively.",
        nativeLimitations: [
          "Custom fields inside Jira sub-tickets require manual mapping overrides.",
          "Attachment synchronization between platforms is not supported natively.",
          "Two-way comment streams occasionally create loops that exhaust monthly API rate allowances."
        ],
        recommendation: {
          approach: "middleware",
          reason: "Native Jira connector is excellent for basic ticket views in HubSpot. For multi-team custom workflow mapping, select Middleware."
        }
      };
    }

    if (toolId.includes("shopify")) {
      return {
        rating: 4.3,
        ratingCount: 930,
        nativeStatus: "excellent",
        nativeStatusText: "Highly Recommended for B2C",
        nativeStatusBg: "bg-emerald-500/10 border-emerald-500/25",
        nativeStatusTextCol: "text-emerald-400",
        ecosystemReviewSnippet: "Excellent for e-commerce brands syncing orders, abandoned carts, and lifetime value. Reviews note limitations mostly when dealing with B2B custom pricing plans or multiple local warehouses.",
        nativeLimitations: [
          "Cannot naturally split parent enterprise organizations into distinct company hierarchies.",
          "Custom checkout properties are not exported as standard contact variables.",
          "High volume discount coupon syncs cause slow-downs during seasonal sales (Black Friday)."
        ],
        recommendation: {
          approach: "native",
          reason: "For Standard retail, use the native Shopify integration—it is fast and officially optimized. For bespoke B2B portals, use Middleware or custom API endpoints."
        }
      };
    }

    if (toolId.includes("shipstation")) {
      return {
        rating: 3.4,
        ratingCount: 82,
        nativeStatus: "limited",
        nativeStatusText: "Basic Sync Only",
        nativeStatusBg: "bg-amber-500/10 border-amber-500/25",
        nativeStatusTextCol: "text-amber-400",
        ecosystemReviewSnippet: "Syncs shipment status and tracking links, but doesn't map custom logistics objects (like partial-refund logs or returning packages indices) without extensive modifications.",
        nativeLimitations: [
          "Mapping of multiple custom shipping rates is not supported.",
          "Cannot easily tie inventory statuses back into HubSpot Product Catalogs.",
          "Errors on invalid zip codes fail silently, requiring separate audit tracking."
        ],
        recommendation: {
          approach: "middleware",
          reason: "Choose Middleware if your company operates custom drop-shippers, splits fulfillment streams, or uses multiple ERP nodes alongside ShipStation."
        }
      };
    }

    if (toolId.includes("power_bi") || toolId.includes("powerbi")) {
      return {
        rating: 2.2,
        ratingCount: 65,
        nativeStatus: "not_supported",
        nativeStatusText: "Not Supported Natively",
        nativeStatusBg: "bg-rose-500/10 border-rose-500/25",
        nativeStatusTextCol: "text-[#EF4444]",
        ecosystemReviewSnippet: "There is no native bidirectional synchronizer App in the HubSpot Marketplace for raw Power BI datasets. Standard connections only embed static reports into dashboards, or use third-party data warehouses.",
        nativeLimitations: [
          "Cannot trigger HubSpot workflows based on BI dataset shifts without a database sync middleware.",
          "Requires separate Azure setup or expensive relational connectors to read live tables.",
          "Bi-directional sync of contacts, accounts or activities is entirely impossible natively."
        ],
        recommendation: {
          approach: "custom",
          reason: "Since no native App exists for bidirectional execution, custom REST endpoints or middleware (such as Snowflake/SQL connectors) must be configured."
        }
      };
    }

    if (toolId.includes("snowflake")) {
      return {
        rating: 2.0,
        ratingCount: 44,
        nativeStatus: "not_supported",
        nativeStatusText: "Reverse ETL Required",
        nativeStatusBg: "bg-rose-500/10 border-rose-500/25",
        nativeStatusTextCol: "text-[#EF4444]",
        ecosystemReviewSnippet: "No direct official out-of-the-box bi-directional App for data warehouses. Synchronizing variables requires specialized external tools (like Census or Hightouch) or middleware Pipelines.",
        nativeLimitations: [
          "Lacks native HubSpot UI app setup - must be administered from external systems.",
          "Requires secure SQL warehouse proxy paths to protect analytical tables.",
          "Real-time event capture runs are highly expensive on Snowflake computational query credits."
        ],
        recommendation: {
          approach: "middleware",
          reason: "Snowflake is a data warehouse. Syncing tables back into HubSpot CRM (Reverse-ETL) requires either an dedicated Middleware tool (Celigo / Hightouch) or a Custom Build."
        }
      };
    }

    if (toolId.startsWith("custom_tool_")) {
      return {
        rating: 0,
        ratingCount: 0,
        nativeStatus: "not_supported",
        nativeStatusText: "Independently Defined",
        nativeStatusBg: "bg-slate-800 text-slate-400 border-slate-700",
        nativeStatusTextCol: "text-slate-300",
        ecosystemReviewSnippet: "Custom proprietary software has no pre-built ecosystem marketplace connector. This dictates using either a programmable middleware (Zapier/Make) or building a custom API connection.",
        nativeLimitations: [
          "No out-of-the-box marketplace solution exists.",
          "Custom API security, session authentication, and schemas must be explicitly declared."
        ],
        recommendation: {
          approach: "custom",
          reason: "Because this is an independent custom tool, map your requirements and build custom proxy handlers or middleware pipelines to coordinate with HubSpot's API."
        }
      };
    }

    return defaultAdvice;
  }, [tool]);

  // Check if native setup will support the items in scope
  const nativeCompatibilityInfo = useMemo(() => {
    const hasCustomObjects = selectedObjects.some(obj => obj.id.startsWith("sfk_guided_") || obj.id.includes("custom_") || obj.category === "Core");
    const supportsObjects = advice.nativeStatus !== "not_supported";
    
    let isFullySupported = supportsObjects && !hasCustomObjects;
    let limitWarning = "";

    if (!supportsObjects) {
      limitWarning = `${tool.name} does not have an official marketplace CRM connector for bidirectional sync. Native approach is not feasible.`;
    } else if (hasCustomObjects) {
      limitWarning = `Some selected custom/dimension objects (e.g. ${selectedObjects.filter(o => o.category === "Core" || o.id.includes("custom")).map(o => o.name).join(", ")}) aren't supported on standard marketplace native integrations. High-tier HubSpot Enterprise and complex setup required.`;
      isFullySupported = false;
    }

    return {
      isFullySupported,
      limitWarning
    };
  }, [selectedObjects, advice, tool]);

  return (
    <div id="integration-approach-selector" className="p-5 sm:p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 shadow-xl space-y-6 backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
      
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 tracking-tight font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-mono font-bold">1.5</span>
            Select Integration Approach
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Choose how you plan to orchestrate the pipeline. Different paths will alter requirements, security standards, and architectures.
          </p>
        </div>
        <div className="flex items-center gap-1.5 py-1 px-2 bg-slate-950 border border-slate-850 rounded-lg text-[11px] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>Active System: <strong>{tool.name}</strong></span>
        </div>
      </div>

      {/* Primary Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* PATH 1: NATIVE APP MARKETPLACE */}
        <button
          type="button"
          onClick={() => onChangeApproach("native")}
          className={`text-left p-5 rounded-2xl border transition-all relative flex flex-col space-y-3 cursor-pointer ${
            approach === "native"
              ? "bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500"
              : "bg-slate-950/50 border-slate-850 hover:border-slate-800 hover:bg-slate-900/50"
          }`}
        >
          {approach === "native" && (
            <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-orange-500 text-slate-950 font-bold uppercase tracking-wider scale-90">
              Selected
            </span>
          )}
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-semibold text-emerald-400 block">Preferred Choice</span>
              <h4 className="text-sm font-bold text-slate-100 font-display">Native / Marketplace</h4>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed flex-grow">
            Configure the pre-built, officially maintained integration app from the HubSpot App Directory. Quickest to deployment.
          </p>

          <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-semibold font-mono">
            <span>Security: SaaS Hosted</span>
            <span className="text-slate-350 flex items-center gap-1">
              Rating: {advice.rating ? `${advice.rating} ★` : "N/A"}
            </span>
          </div>
        </button>

        {/* PATH 2: MIDDLEWARE ENGINE */}
        <button
          type="button"
          onClick={() => onChangeApproach("middleware")}
          className={`text-left p-5 rounded-2xl border transition-all relative flex flex-col space-y-3 cursor-pointer ${
            approach === "middleware"
              ? "bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500"
              : "bg-slate-950/50 border-slate-850 hover:border-slate-800 hover:bg-slate-900/50"
          }`}
        >
          {approach === "middleware" && (
            <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-orange-500 text-slate-950 font-bold uppercase tracking-wider scale-90">
              Selected
            </span>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-semibold text-cyan-400 block">Orchestrator Mode</span>
              <h4 className="text-sm font-bold text-slate-100 font-display">Automation Middleware</h4>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed flex-grow">
            Design an automated data pipe using Celigo, Zapier, or Make. Best for complex transformations, custom fields, and filters.
          </p>

          <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-semibold font-mono">
            <span>Security: Token Auth</span>
            <span className="text-slate-350">Platform Managed</span>
          </div>
        </button>

        {/* PATH 3: CUSTOM CODED BUILD */}
        <button
          type="button"
          onClick={() => onChangeApproach("custom")}
          className={`text-left p-5 rounded-2xl border transition-all relative flex flex-col space-y-3 cursor-pointer ${
            approach === "custom"
              ? "bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500"
              : "bg-slate-950/50 border-slate-850 hover:border-slate-800 hover:bg-slate-900/50"
          }`}
        >
          {approach === "custom" && (
            <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-orange-500 text-slate-950 font-bold uppercase tracking-wider scale-90">
              Selected
            </span>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-semibold text-orange-400 block">Engineering Power</span>
              <h4 className="text-sm font-bold text-slate-100 font-display">Custom API Build</h4>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed flex-grow">
            Program a bespoke bidirectional sync client in Node/Python. Unlimited customization, webhook payloads, and robust error retries.
          </p>

          <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-semibold font-mono">
            <span>Security: Full Control</span>
            <span className="text-slate-350">Private Server</span>
          </div>
        </button>

      </div>

      {/* Middleware platform subset selector */}
      {approach === "middleware" && (
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in text-xs">
          <div className="space-y-1">
            <span className="font-semibold text-slate-205 text-slate-200 block">Select Middleware Engine:</span>
            <p className="text-[11px] text-slate-400">Different middleware platforms will alter the visual node design guidelines.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
            {(["celigo", "zapier", "make"] as MiddlewarePlatformType[]).map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => onChangeMiddlewarePlatform(platform)}
                className={`px-3 py-1.5 font-bold rounded capitalize font-sans transition-all text-[11px] cursor-pointer ${
                  middlewarePlatform === platform
                    ? "bg-orange-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Native / Marketplace Options Selector block */}
      {approach === "native" && (MARKETPLACE_OPTIONS_MAP[tool.id.toLowerCase()] || []).length > 0 && (
        <div id="marketplace-provider-selector" className="space-y-3 p-5 bg-slate-950/65 rounded-2xl border border-slate-850 animate-fade-in text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-900">
            <div>
              <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest block">Available App Providers</span>
              <h4 className="text-sm font-bold text-slate-100 font-display mt-0.5">Select Marketplace Setup</h4>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded bg-slate-900 text-slate-450 border border-slate-850 text-slate-400">
              Multiple Ecosystem Options Detected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(MARKETPLACE_OPTIONS_MAP[tool.id.toLowerCase()] || []).map((option) => {
              const defaultOptionId = (MARKETPLACE_OPTIONS_MAP[tool.id.toLowerCase()] || [])[0]?.id;
              const isSelected = selectedMarketplaceOptionId === option.id || (selectedMarketplaceOptionId === "default" && option.id === defaultOptionId);
              
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChangeMarketplaceOptionId(option.id)}
                  className={`text-left p-4 rounded-xl border transition-all flex flex-col space-y-3 relative cursor-pointer group ${
                    isSelected
                      ? "bg-orange-500/5 border-[#F97316] shadow-md shadow-orange-500/5"
                      : "bg-slate-900/40 border-slate-855/80 border-slate-900 hover:border-slate-800 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-orange-450 transition-colors">
                          {option.name}
                        </span>
                        {option.badge && (
                          <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded tracking-wider">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        Published by <strong className="text-slate-400">{option.provider}</strong>
                      </span>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                      <div className="flex items-center gap-1 text-orange-400">
                        <Star className="w-3 h-3 fill-orange-400 stroke-orange-400" />
                        <span className="text-xs font-bold">{option.rating}</span>
                      </div>
                      <span className="text-[8px] font-mono text-slate-500">({option.reviewsCount} reviews)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-900 w-full flex-grow">
                    <span className="text-[10px] font-bold text-slate-400 font-sans tracking-wide block">Key Capabilities:</span>
                    <ul className="space-y-1.5 text-slate-400 text-[10px] pl-1">
                      {option.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-relaxed text-slate-300">
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isSelected && (
                    <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* DYNAMIC FEEDBACK SECTION: Marketplace Review & Schema Support Checks */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 text-xs text-slate-300 space-y-4 font-sans">
        
        {/* Marketplace Star Score & Bad Reviews Summary */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-900">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase font-mono bg-slate-900 text-slate-300">
                HubSpot Marketplace Analytics
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${advice.nativeStatusBg} ${advice.nativeStatusTextCol}`}>
                {advice.nativeStatusText}
              </span>
            </div>

            <p className="text-xs text-slate-350 leading-relaxed">
              <strong>Ecosystem Sentiment:</strong> &ldquo;{advice.ecosystemReviewSnippet}&rdquo;
            </p>

            <div className="text-[11px] text-rose-400 bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Verified Native Friction Cases:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                {advice.nativeLimitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>

          {advice.rating > 0 && (
            <div className="flex-shrink-0 bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-center flex flex-col justify-center items-center h-full min-w-36">
              <span className="text-[10px] font-mono font-semibold text-slate-500 block uppercase tracking-wider mb-1">Ecosystem Rating</span>
              <div className="flex items-center gap-1 text-orange-400">
                <span className="font-display font-extrabold text-2xl tracking-tight text-white">{advice.rating}</span>
                <span className="text-sm">/ 5</span>
              </div>
              <div className="flex items-center gap-0.5 mt-1.5 text-orange-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(advice.rating)
                        ? "fill-orange-400 stroke-orange-400 animate-pulse"
                        : "text-slate-700"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-2 block">({advice.ratingCount} user ratings)</span>
            </div>
          )}
        </div>

        {/* Validation Check Summary (Confirming reviews and object compatibility) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
          
          {/* Item 1: Objects compatibility list checks */}
          <div className="space-y-2 p-3 bg-slate-900/30 rounded-lg border border-slate-900">
            <span className="font-bold font-display text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 
              Compatibility & Objects Scope Checks
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your selected active integration elements are:
            </p>
            {selectedObjects.length === 0 ? (
              <span className="text-[11px] font-mono italic text-slate-550 block">No object pipelines selected.</span>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedObjects.map((obj) => {
                  const isCustom = obj.id.startsWith("sfk_guided_") || obj.id.includes("custom_") || obj.category === "Core";
                  return (
                    <span 
                      key={obj.id} 
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                        isCustom 
                          ? "bg-amber-500/5 text-amber-400 border-amber-500/20" 
                          : "bg-emerald-500/5 text-emerald-400 border-emerald-500/10"
                      }`}
                      title={isCustom ? "Custom records require raised API tiers natively" : "Standard object mapping compatible"}
                    >
                      {obj.name}
                      <span className="text-[8px] opacity-70">({isCustom ? "Custom Schema" : "Standard"})</span>
                    </span>
                  );
                })}
              </div>
            )}
            
            {!nativeCompatibilityInfo.isFullySupported && nativeCompatibilityInfo.limitWarning && (
              <div className="p-2 rounded bg-rose-500/5 text-rose-400 border border-rose-500/10 text-[10px] mt-2 flex items-start gap-1.5 leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{nativeCompatibilityInfo.limitWarning}</span>
              </div>
            )}
          </div>

          {/* Item 2: Final Advice Summary Callout */}
          <div className="p-3 bg-orange-500/5 border border-orange-500/15 rounded-lg flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="font-bold text-orange-400 flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-orange-400" />
                Expert Architect Recommendation
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {advice.recommendation.reason}
              </p>
            </div>
            
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onChangeApproach(advice.recommendation.approach)}
                className="text-[10px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 hover:underline cursor-pointer transition-all"
              >
                Auto-apply advised path
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
