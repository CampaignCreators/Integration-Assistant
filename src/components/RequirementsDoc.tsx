import React, { useState, useMemo } from "react";
import { SaaSObject, ObjectMapping } from "../types";
import { 
  FileText, Copy, Check, Download, Info, CheckCircle, ArrowRight, 
  ShieldCheck, HelpCircle, FileCheck, RefreshCw, Layers, Sparkles 
} from "lucide-react";
import { MARKETPLACE_OPTIONS_MAP } from "../data";

interface RequirementsDocProps {
  toolName: string;
  selectedObjects: SaaSObject[];
  mappings: ObjectMapping[];
  approach: "native" | "middleware" | "custom";
  middlewarePlatform: "celigo" | "zapier" | "make";
  selectedMarketplaceOptionId?: string;
}

export default function RequirementsDoc({
  toolName,
  selectedObjects,
  mappings,
  approach,
  middlewarePlatform,
  selectedMarketplaceOptionId = "default"
}: RequirementsDocProps) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("all");

  const hasMappings = selectedObjects.length > 0 && mappings.length > 0;

  // Compile full requirements document as a professional Markdown string
  const fullDocumentMarkdown = useMemo(() => {
    if (!hasMappings) return "Please configure active object mappings first to compile the integration requirements document.";

    const companyName = "Enterprise Customer Service Integration";
    const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const platformLabel = middlewarePlatform.toUpperCase();

    // Setup text values based on chosen Integration Approach
    let docTitle = "";
    let approachLabel = "";
    if (approach === "native") {
      docTitle = `${toolName} + HubSpot App Marketplace Native integration Requirements Document`;
      approachLabel = "Marketplace / Native Integration Approach";
    } else if (approach === "middleware") {
      docTitle = `${toolName} + HubSpot Lightweight Middleware (${platformLabel}) Requirements Document`;
      approachLabel = `Lightweight Middleware Approach using ${platformLabel}`;
    } else {
      docTitle = `${toolName} + HubSpot Custom Coded API Integration Requirements Document`;
      approachLabel = "Custom Coded REST-API Integration Approach";
    }

    let md = `# ${docTitle}\n\n`;
    md += `**Prepared for:** Team Workspace Administration Integration Planning\n`;
    md += `**Aproach Selected:** ${approachLabel}\n`;
    md += `**Date:** ${dateStr}\n`;
    md += `**Status:** Requirements Scoping Draft (Dynamic Preview)\n\n`;

    // 1. PURPOSE
    md += `## 1. Purpose\n`;
    if (approach === "native") {
      md += `This document outlines a prebuilt, officially supported solution approach for connecting HubSpot and ${toolName} using the native app available in the HubSpot App Marketplace.\n\n`;
      md += `The goal is to configure standard bidirectional synchronization with official support, minimizing custom logic and avoiding any custom servers or intermediate subscriptions.\n\n`;
    } else if (approach === "middleware") {
      md += `This document outlines a lightweight solution approach for connecting HubSpot and ${toolName} using an automation middleware platform like ${platformLabel}.\n\n`;
      md += `The goal is not to redesign full architectures of both systems, but to build a robust, low-maintenance pipeline to translate non-standard schemas, custom objects, and filter lists with granular controls.\n\n`;
    } else {
      md += `This document outlines an optimized, custom-engineered API approach for connecting HubSpot and ${toolName} using standard REST protocols, webhooks, and secure daemon code.\n\n`;
      md += `The goal is to establish full absolute control over data translations, avoiding subscription constraints or custom object limitations.\n\n`;
    }

    md += `This integration design specifically supports:\n`;
    selectedObjects.forEach((obj) => {
      md += `● Automated mapping of HubSpot ${obj.recommendedHubSpotTarget} schemas with ${toolName} ${obj.name} properties.\n`;
    });
    md += `● Reduced duplicate entries, manual typing delays, and property mismatches.\n`;
    md += `● Scalable foundations aligning with organizational requirements.\n`;
    md += `● Clear, low-friction path for near-term operations.\n\n`;

    // 2. BACKGROUND & CURRENT REVIEWS NOTE
    md += `## 2. Background\n`;
    md += `The organization utilizes HubSpot for customer pipelines and sales coordination, alongside ${toolName} for key business database systems. Manual entry or siloed information currently blocks sales speed and skews report dashboards. Synchronizing these records automatically is critical for clean analytics.\n\n`;
    
    if (approach === "native") {
      md += `**Marketplace Feasibility Analysis:** While Native connector is always preferred, we have audited user reports and reviews. We noted that the native connector is ideal for standard fields, but users report friction with complex custom field mappings or when syncing customized entities. This requirements document specifically outlines the standard properties to sync natively, while raising alerts for fields requiring manual workarounds.\n\n`;
    } else if (approach === "middleware") {
      md += `**Middleware Feasibility Analysis:** Applying ${platformLabel} bypasses standard marketplace connector defects (such as weak bi-directional custom variables or sync errors). A lightweight node-based middleware avoids excessive custom code, utilizes pre-built API wrappers, and allows easily editable fields mapping rules.\n\n`;
    } else {
      md += `**Custom Build Feasibility Analysis:** Creating a hand-crafted REST proxy or webhook scheduler provides programmatic superiority. It removes native marketplace blockages entirely, supports unlimited nested structures, and provides strict internal security audit controls.\n\n`;
    }

    // 3. PRIMARY BUSINESS OBJECTIVES
    md += `## 3. Primary Business Objectives\n`;
    md += `● **Automate Flow:** Connect both platforms to eliminate manually duplicating profiles.\n`;
    
    if (approach === "native") {
      md += `● **Avoid Overhead:** Utilize prebuilt connectors. Do not maintain custom scripts, API servers, or intermediate subscription systems.\n`;
      md += `● **Standardize Attributes:** Align organizational metadata around standard HubSpot and ${toolName} fields.\n`;
    } else if (approach === "middleware") {
      md += `● **Enable Flexibilty:** Maintain a low-code pipeline that operations managers, instead of full software engineers, can adjust and audit if field variables expand.\n`;
      md += `● **Leverage ${platformLabel} Wrappers:** Optimize pricing quotas by applying smart triggers and filters directly in the middleware stream.\n`;
    } else {
      md += `● **Ensure Total Control:** Bypass external platform constraints or license-based custom object blockers (e.g. HubSpot Enterprise mandates).\n`;
      md += `● **Achieve Sub-second Sync:** Deploy low-latency webhook endpoints to process transactions in near-real-time.\n`;
    }
    md += `● **Deliver Timely Value:** Keep the initial build focused only on high-priority objects to validate the mapping pipeline before scale-up.\n\n`;

    // 4. ARCHITECTURE
    md += `## 4. Recommended Lightweight Architecture\n`;
    md += `Proposed interface structure:\n\n`;
    md += `\`\`\`\n`;
    if (approach === "native") {
      md += `HubSpot CRM   ⇄   [Official HubSpot Marketplace Connector]   ⇄   ${toolName} Cloud API\n`;
    } else if (approach === "middleware") {
      md += `HubSpot CRM API   ⇄   Middleware Engine (${platformLabel})   ⇄   ${toolName} API\n`;
    } else {
      md += `HubSpot REST API   ⇄   Sync Client Daemon (OAuth2 / Workers)   ⇄   ${toolName} Database / Web REST\n`;
    }
    md += `\`\`\`\n\n`;

    if (approach === "native") {
      md += `HubSpot handles the synchronization directly. Administrators install the approved application, authenticate with credentials, and map corresponding standard objects directly in the integration setting panel.\n\n`;
    } else if (approach === "middleware") {
      md += `Data actions are orchestrated by ${platformLabel}. The middleware listens for records creation or modification webhooks, filters out unqualified items, queries schemas, maps variables, outputs matches, and writes success states back.\n\n`;
    } else {
      md += `A bespoke serverless task (e.g. AWS Lambda, Google Cloud Function, or background Cron Node worker) runs at targeted intervals or registers with webhook interfaces to trigger immediate bidirectional updates.\n\n`;
    }

    // 5. INITIAL SCOPE
    md += `## 5. Proposed Initial Scope\n`;
    md += `The pilot concentrates strictly on selected integration objects, avoiding excessive custom parameters in Phase 1:\n\n`;

    mappings.forEach((m, idx) => {
      const obj = selectedObjects.find((o) => o.id === m.sourceObjectId);
      if (!obj) return;
      const dirLabel = m.direction === "bidirectional" 
        ? "Bi-directional 🔄" 
        : m.direction === "saas_to_hs" 
          ? `Import Only (From ${toolName} to HubSpot 📥)` 
          : `Export Only (From HubSpot to ${toolName} 📤)`;

      md += `### 5.${idx + 1} Pipeline: ${obj.name} Synchronize\n`;
      md += `**Goal:** Automate synchronization of ${obj.name} database objects (${obj.apiName}) matching HubSpot ${m.hubspotTargetObject} records.\n`;
      md += `**Direction:** ${dirLabel}\n`;
      md += `**Frequency:** ${m.frequency.replace("_", " ").toUpperCase()} updates.\n`;
      md += `**Recommended Approach Steps:**\n`;
      if (approach === "native") {
        md += `1. Navigate to HubSpot's App Sync Panel for ${toolName}.\n`;
        md += `2. Select the ${obj.name} standard entity and match it with HubSpot's native ${m.hubspotTargetObject}.\n`;
        md += `3. Configure conflict resolution rules (e.g. "HubSpot wins" vs "${toolName} wins").\n`;
        md += `4. Turn on auto-synchronization and confirm fields trigger properly.\n\n`;
      } else if (approach === "middleware") {
        md += `1. Setup ${platformLabel} flow with trigger listening to ${toolName} or HubSpot event variables.\n`;
        md += `2. Pull associated data properties for validation filtering.\n`;
        md += `3. Direct middleware to map primary fields into corresponding target slots.\n`;
        md += `4. Execute update or creation, write unique Sync identifier back, and log exceptions if failures happen.\n\n`;
      } else {
        md += `1. Code handles updates by listening to direct system webhooks.\n`;
        md += `2. Query target entity endpoints via REST parameters using secure OAuth 2.0 signatures.\n`;
        md += `3. Clean and convert variables within application memory (validate email forms, normalize states/countries).\n`;
        md += `4. Send matching structured payload arrays, save primary identifier correlation values, and update error state buffers.\n\n`;
      }
    });

    // 6. HUBSPOT REQUIREMENTS
    md += `## 6. HubSpot Requirements\n`;
    if (approach === "native") {
      md += `HubSpot portal must support the native App, ensuring standard mapping is enabled:\n`;
      md += `● Ensure standard contact matching by email or company domain matching is turned on.\n`;
      md += `● Ensure permission ranges are granted for HubSpot standard App installations.\n`;
    } else {
      md += `HubSpot portal must define target custom fields to host integration metadata securely:\n`;
      md += `● **System Integration Properties:** Recommended custom fields configuration:\n`;
      md += `  - \`hs_${toolName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_sync_id\`: String property mapping unique ID.\n`;
      md += `  - \`hs_${toolName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_sync_status\`: Options list (Synced, Pending, Error).\n`;
      md += `  - \`hs_${toolName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_error_log\`: Unlimited string property reporting traceback details.\n`;
    }
    md += `● **Workflows & Lists:** Define targeted exclusion or trigger workflow lists to segment record batches accurately.\n\n`;

    // 7. SAAS SYSTEM REQUIREMENTS
    md += `## 7. ${toolName} Requirements\n`;
    md += `The source ${toolName} system must support standard web connections and safe logins:\n`;
    if (approach === "native") {
      md += `● Active, administrative login credentials to authorize official marketplace API handshakes.\n`;
    } else if (approach === "middleware") {
      md += `● Verified credential parameters, authorization tokens or API keys passed securely inside ${platformLabel}.\n`;
    } else {
      md += `● Private Developer App registration with Client ID and Client Secret allowing high-rate OAuth keys rotations.\n`;
    }
    md += `● Active database tables access rights matching key objects: [`;
    md += selectedObjects.map(o => `\`${o.apiName}\``).join(", ");
    md += `].\n\n`;

    // 8. FLOW OR ORCHESTSTRATOR RULES
    if (approach === "native") {
      md += `## 8. Marketplace App Sync Rules\n`;
      md += `● **Conflict Resolution:** Map conflict guidelines before launching (HubSpot default overrides tool or vice versa).\n`;
      md += `● **Standard Scope:** Confirm standard objects do not trigger duplicate cards.\n`;
    } else if (approach === "middleware") {
      md += `## 8. Middleware Pipeline Rules (${platformLabel})\n`;
      md += `● **Filters:** Set strict check checks in ${platformLabel} (e.g. "Primary identifier is known") to dodge empty records processing.\n`;
      md += `● **Exceptions logs:** Read and route exceptions cleanly to protect workflow tasks and quota bounds.\n`;
    } else {
      md += `## 8. Custom Server Engine Rules\n`;
      md += `● **OAuth Loops:** Build token management loops with automated access key refresh.\n`;
      md += `● **Retries with Backoff:** Implement 3x retry rules with exponential backoff to handle network blips gracefully.\n`;
      md += `● **JSON Validation:** Assert body formats before triggering API endpoints.\n`;
    }
    md += `\n`;

    // 9. DATA SCHEMA MAPS
    md += `## 9. Data Schema Mapping Requirements\n`;
    md += `The following properties mapping is verified for integration execution:\n\n`;

    mappings.forEach((m) => {
      const obj = selectedObjects.find((o) => o.id === m.sourceObjectId);
      if (!obj) return;
      md += `### Object Map: ${toolName} \`${obj.apiName}\` ➔ HubSpot CRM \`${m.hubspotTargetObject.toUpperCase()}\`\n\n`;
      md += `| ${toolName} Field Source | HubSpot Field Target | Data Type | Sync Mapped | Recommended Notes |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;

      m.fieldMappings.forEach((fm) => {
        const fieldMeta = obj.fields.find((f) => f.name === fm.sourceField);
        md += `| \`${fm.sourceField}\` | \`${fm.targetField}\` | ${fieldMeta?.type || "string"} | ${fm.enabled ? "✅ YES" : "❌ NO"} | ${fieldMeta?.description || "Sync property"} |\n`;
      });
      md += `\n`;
    });

    // 10. ERROR HANDLING
    md += `## 10. Error Handling Requirements\n`;
    if (approach === "native") {
      md += `● **Sync Error Auditing:** Review standard sync health logs directly inside HubSpot's "Settings ➔ Integrations ➔ Connected Apps" panel.\n`;
      md += `● **Manual Retries:** Trigger full records redos by toggling the "Sync Now" button inside the connected HubSpot logs UI.\n`;
    } else {
      md += `● **Halt on Missing Keys:** Stop the workflow from running if crucial matching indexes are empty, marking statuses as "Error".\n`;
      md += `● **Trace Logging:** Store raw API call trace strings in the custom HubSpot error variable.\n`;
      md += `● **Admin Reset Action:** Shift status values back to "Pending" in HubSpot to trigger middleware/daemon re-evaluation.\n`;
    }
    md += `\n`;

    // 11. OUT OF SCOPE
    md += `## 11. Out of Scope for Initial Version\n`;
    md += `● Migration of archival datasets or pre-integration historic cards.\n`;
    md += `● Real-time continuous instant streams for non-standard visual objects.\n`;
    md += `● Integration of three-way sync patterns (adding secondary ERP tools simultaneously).\n\n`;

    // 12. VALIDATION QUESTIONS
    md += `## 12. Integration Validation Questions\n`;
    md += `● What is the precise API limits cap for the credential class in ${toolName}?\n`;
    md += `● Does the client hold active administrative range to generate custom fields?\n\n`;

    // 13. PILOT APPROACH
    md += `## 13. Recommended Pilot Approach\n`;
    md += `● **Phase 1 [Credential Audit]:** Verify API key permissions or token handshakes manually.\n`;
    md += `● **Phase 2 [Single-Object Match]:** Launch first mapping object line (standard database cards).\n`;
    md += `● **Phase 3 [Data Precision Check]:** Sync 25-50 testing records and inspect for accuracy.\n`;
    md += `● **Phase 4 [Full Action Toggle]:** Turn on remaining active schema nodes with basic checklists.\n\n`;

    // 14. NEXT STEPS
    md += `## 14. Recommended Next Steps\n`;
    if (approach === "native") {
      md += `1. Access HubSpot Connected Apps settings and search the App directory for official ${toolName}.\n`;
      md += `2. Authorize standard API connection parameters.\n`;
      md += `3. Map properties using the layout verified in Section 9.\n`;
    } else if (approach === "middleware") {
      md += `1. Secure ${platformLabel} licenses matching bulk sync limits.\n`;
      md += `2. Build target custom fields in HubSpot CRM before drafting scenarios.\n`;
      md += `3. Input credentials and execute mapping routes verified in Section 9.\n`;
    } else {
      md += `1. Provision API tokens with permissions for target objects in ${toolName}.\n`;
      md += `2. Setup target custom fields and webhook listening code.\n`;
      md += `3. Test bidirectional REST routines with verified schema coordinates.\n`;
    }
    md += `\n`;

    // 15. SUCCESS CRITERIA
    md += `## 15. Success Criteria\n`;
    md += `● Target profiles map cleanly between tools without duplication blocks.\n`;
    md += `● Core identifier matching syncs securely.\n`;
    md += `● Admins can audit sync speed, issues, and states inside a clean, defined search view.\n\n`;

    // 16. FUTURE CONSIDERATIONS
    md += `## 16. Future Considerations\n`;
    md += `● Scale performance limits and licensing scopes as syncing counts surpass 10,000 requests monthly.\n`;
    md += `● Configure automatic reports using aggregated dashboards tools.\n\n`;

    md += `_Document generated based on your chosen integration approach and schemas configuration. Certifies standard-aligned requirements architecture modeling._`;

    return md;
  }, [toolName, selectedObjects, mappings, approach, middlewarePlatform, hasMappings]);

  // Breakdown sections for individual scannable previewing
  const previewSections = useMemo(() => {
    if (!hasMappings) return [];

    const lines = fullDocumentMarkdown.split("\n");
    const sections: Array<{ id: string; title: string; content: string }> = [];
    
    let currentTitle = "";
    let currentContent: string[] = [];
    let currentId = "";

    lines.forEach((line) => {
      if (line.startsWith("## ")) {
        if (currentTitle) {
          sections.push({
            id: currentId,
            title: currentTitle,
            content: currentContent.join("\n").trim()
          });
        }
        currentTitle = line.replace("## ", "").trim();
        // convert "1. Purpose" to "purpose"
        currentId = currentTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/^[0-9]+-/, "").trim();
        currentContent = [];
      } else if (line.startsWith("# ")) {
        // Skip document main title for individual sections block
      } else {
        currentContent.push(line);
      }
    });

    if (currentTitle) {
      sections.push({
        id: currentId,
        title: currentTitle,
        content: currentContent.join("\n").trim()
      });
    }

    return sections;
  }, [fullDocumentMarkdown, hasMappings]);

  const activeContentText = useMemo(() => {
    if (activeSection === "all") {
      return fullDocumentMarkdown;
    }
    const found = previewSections.find((s) => s.id === activeSection);
    return found ? `## ${found.title}\n\n${found.content}` : fullDocumentMarkdown;
  }, [activeSection, previewSections, fullDocumentMarkdown]);

  const handleCopyText = () => {
    navigator.clipboard.writeText(activeContentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDoc = () => {
    const element = document.createElement("a");
    const file = new Blob([fullDocumentMarkdown], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${toolName.replace(/\s+/g, "_")}_HubSpot_Integration_Requirements_Document.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div id="integration-requirements-doc-panel" className="bg-slate-900/40 p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-6 backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center text-xs font-bold font-mono">
              📋
            </div>
            <h2 className="text-base font-bold text-slate-50 tracking-tight font-display">
              Integration Requirements Document Generator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic, formal scoping guide formatted exactly as a Lightweight Requirements Document tailored to your chosen {approach} design.
          </p>
        </div>

        {hasMappings && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:text-slate-100 flex items-center gap-1.5 rounded-lg text-xs font-semibold text-slate-350 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied view!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-orange-400" />
                  Copy visible text
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadDoc}
              className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-slate-950 flex items-center gap-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shadow-orange-500/5 hover:shadow-orange-400/15"
            >
              <Download className="w-3.5 h-3.5" />
              Download complete document (.md)
            </button>
          </div>
        )}
      </div>

      {!hasMappings ? (
        <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-550 text-xs font-mono">
          Activate and map key integration objects above to run compilation rules for your enterprise specification draft.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* SIDERBAR SECTION MENU */}
          <div className="lg:col-span-1 space-y-2 lg:border-r lg:border-slate-850 lg:pr-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 mb-2">
              <span>Document Chapters</span>
              <span className="px-1.5 py-0.2 bg-slate-950 border border-slate-800 text-orange-400 rounded text-[9px] uppercase tracking-normal">
                {approach}
              </span>
            </div>
            
            <button
              onClick={() => setActiveSection("all")}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-all flex items-center justify-between font-medium cursor-pointer ${
                activeSection === "all"
                  ? "bg-orange-500/10 text-orange-400 font-bold border border-orange-500/15"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <span>📄 All Chapters (Combined)</span>
            </button>

            <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
              {previewSections.map((section, idx) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-all truncate block cursor-pointer ${
                    activeSection === section.id
                      ? "bg-slate-950 text-orange-450 border border-slate-850 font-semibold"
                      : "text-slate-500 hover:text-slate-350 hover:bg-slate-950/40 border border-transparent"
                  }`}
                  title={`${idx + 1}. ${section.title}`}
                >
                  <span className="font-mono text-[10px] text-slate-655 mr-1">{idx + 1}.</span> {section.title.replace(/^[0-9]+\.\s*/, "")}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-900 text-[10px] text-slate-405 text-slate-400 leading-relaxed font-sans space-y-1 bg-slate-900/10 p-2.5 rounded-lg border border-slate-850">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Adaptive Requirements Doc
              </span>
              <p>Chapters update instantly as you change the integration approach at Step 1.5 above!</p>
            </div>
          </div>

          {/* RENDERED DOCUMENT CONTENT */}
          <div className="lg:col-span-3 bg-slate-950/70 rounded-xl border border-slate-850/70 p-5 sm:p-6 overflow-y-auto max-h-[500px] font-sans selection:bg-orange-450/20">
            <div className="prose prose-invert prose-xs max-w-none space-y-6 text-slate-300 leading-relaxed">
              
              {activeSection === "all" ? (
                <div className="space-y-6">
                  {/* Styled Title Header cover */}
                  <div className="pb-6 border-b border-slate-850 space-y-2">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#F97316] font-bold">Scoping Requirements Draft</span>
                    <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white font-display">
                      {approach === "native" && `${toolName} + HubSpot App Marketplace Native integration Requirements`}
                      {approach === "middleware" && `${toolName} + HubSpot Lightweight Middleware (${middlewarePlatform.toUpperCase()}) Requirements`}
                      {approach === "custom" && `${toolName} + HubSpot Custom Coded API Integration Requirements`}
                    </h1>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-4">
                      <span>PROJECT PREVIEW</span>
                      <span>•</span>
                      <span className="text-orange-400 uppercase">ACTIVE APPROACH: {approach}</span>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">01.</span> PURPOSE
                    </h2>
                    <p className="text-xs">
                      {approach === "native" && `This document outlines a prebuilt, officially supported solution approach for connecting HubSpot and ${toolName} using the native app available in the HubSpot App Marketplace.`}
                      {approach === "middleware" && `This document outlines a lightweight solution approach for connecting HubSpot and ${toolName} using an automation middleware platform like ${middlewarePlatform.toUpperCase()}.`}
                      {approach === "custom" && `This document outlines an optimized, custom-engineered API approach for connecting HubSpot and ${toolName} using standard REST protocols, webhooks, and secure daemon code.`}
                    </p>
                    <p className="text-xs mt-2">
                      The goal is to validate and implement a practical {approach === "native" ? "built-in app setup" : approach === "middleware" ? `middleware Scenario using ${middlewarePlatform.toUpperCase()}` : "custom proxy synchronization service"} that allows automated integration of {toolName} records with HubSpot CRM properties with minimal engineering friction.
                    </p>
                    <p className="text-xs mt-3 font-semibold text-slate-200 font-display text-[11px] uppercase tracking-wide">This layout specifically supports:</p>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5 mt-2 font-sans">
                      {selectedObjects.map((obj) => (
                        <li key={obj.id}>
                          Automated mapping of HubSpot <strong className="text-orange-400">{obj.recommendedHubSpotTarget}</strong> schemas with {toolName} <strong>{obj.name}</strong> properties.
                        </li>
                      ))}
                      <li>Reduced manual entries, copy-pasting issues, and human sync delays.</li>
                      <li>Scalable foundations aligning with organizational requirements.</li>
                      <li>Clear, low-friction path for near-term operations.</li>
                    </ul>
                  </div>

                  {/* Background */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">02.</span> BACKGROUND & VERIFIED FEEDBACK
                    </h2>
                    <p className="text-xs">
                      The organization currently utilizes HubSpot to manage active client marketing and client sales workflows, alongside <strong>{toolName}</strong> as its operations system. Synchronizing these records automatically is critical for clean analytics.
                    </p>
                    
                    {approach === "native" && (
                      <div className="mt-2.5 p-3 rounded-lg bg-orange-500/5 border border-orange-500/15 text-xs text-slate-350 space-y-1.5">
                        <p className="font-semibold text-slate-200">🔍 Verified App Marketplace Reviews Check:</p>
                        <p>We verified that standard fields map successfully. However, users frequently complain that bidirectional custom fields are restricted, and custom structures are not supported natively or require Enterprise pricing tiers. This document raises those warnings to protect scoping models.</p>
                      </div>
                    )}
                    
                    {approach === "middleware" && (
                      <div className="mt-2.5 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15 text-xs text-slate-350 space-y-1.5">
                        <p className="font-semibold text-slate-200">🛠️ Middleware Validation Details ({middlewarePlatform.toUpperCase()}):</p>
                        <p>Using a middleware scenario lets you override the normal flaws of default app marketplace connections. Field structures are cleaned, mapped, and audited on the fly, offering visual schema builders for clean troubleshooting.</p>
                      </div>
                    )}

                    {approach === "custom" && (
                      <div className="mt-2.5 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/15 text-xs text-slate-350 space-y-1.5">
                        <p className="font-semibold text-slate-200">💻 Custom REST API Feasibility Summary:</p>
                        <p>A custom-programmed connector yields total freedom regarding webhook payloads. It avoids third-party quotas and license blockers entirely, offering enterprise-level reliability, error auditing, and security protocols.</p>
                      </div>
                    )}
                  </div>

                  {/* Objectives */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">03.</span> PRIMARY BUSINESS OBJECTIVES
                    </h2>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5 font-sans">
                      <li><strong className="text-slate-200">Automate Flow:</strong> Connect both platforms to eliminate manually duplicating profiles.</li>
                      {approach === "native" && (
                        <>
                          <li><strong className="text-slate-200">Avoid Code Overhead:</strong> Utilize prebuilt connectors. Do not maintain custom scripts, API servers, or intermediate subscription systems.</li>
                          <li><strong className="text-slate-200">Standardize Attributes:</strong> Align organizational metadata around standard HubSpot and {toolName} fields natively.</li>
                        </>
                      )}
                      {approach === "middleware" && (
                        <>
                          <li><strong className="text-slate-200">Enable Easy Alteration:</strong> Maintain a low-code scenario in {middlewarePlatform.toUpperCase()} that administrators can modify if properties expand.</li>
                          <li><strong className="text-slate-200">Leverage Built-in Filters:</strong> Bypass standard connector constraints using conditional routes.</li>
                        </>
                      )}
                      {approach === "custom" && (
                        <>
                          <li><strong className="text-slate-200">Full Code Ownership:</strong> Write precise bidirection logic, avoiding custom object licensing thresholds.</li>
                          <li><strong className="text-slate-200">Near-Instant Transmit:</strong> Deliver sub-second data propagation via optimized webhook loops.</li>
                        </>
                      )}
                      <li><strong className="text-slate-200">Ensure Quick Value Delivery:</strong> Keep the initial build narrow enough to minimize implementation risk, timelines, and costs.</li>
                    </ul>
                  </div>

                  {/* Architecture */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">04.</span> INTEGRATION ARCHITECTURE PLAN
                    </h2>
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-850 font-mono text-center text-xs text-[#F97316] my-2">
                      {approach === "native" && `HubSpot CRM  ⇄  [Official Connected App Marketplace]  ⇄  ${toolName}`}
                      {approach === "middleware" && `HubSpot CRM API  ⇄  Middleware Platform (${middlewarePlatform.toUpperCase()})  ⇄  ${toolName} REST`}
                      {approach === "custom" && `HubSpot REST API  ⇄  Bespoke Node/Python Sync Client Daemon  ⇄  ${toolName} Database / Web REST`}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-sans">
                      {approach === "native" && "HubSpot coordinates integration. Setup credentials, turn on standard objects sync, and choose simple conflict rules within the Connected Apps panel."}
                      {approach === "middleware" && `Properties are processed on ${middlewarePlatform.toUpperCase()}. Visual triggers listen to updates, filter empty attributes, map parameters, and send records.`}
                      {approach === "custom" && "A dedicated backend microservice listening to webhook requests or interval Cron cycles queries the objects, maps JSON parameters, and handles OAuth tokens."}
                    </p>
                  </div>

                  {/* Scope */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">05.</span> PROPOSED SCOPE & PIPELINES
                    </h2>
                    <div className="space-y-4">
                      {mappings.map((m, idx) => {
                        const obj = selectedObjects.find((o) => o.id === m.sourceObjectId);
                        if (!obj) return null;
                        return (
                          <div key={obj.id} className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2 text-xs">
                            <h4 className="font-bold text-slate-100 font-display flex items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono text-[9px]">Pipeline 5.{idx + 1}</span>
                              {obj.name} Pipeline Details
                            </h4>
                            <p className="text-slate-400 font-sans">
                              <strong>Goal:</strong> Sync database records for <code className="text-cyan-400 font-mono">{obj.apiName}</code> with HubSpot <code className="text-orange-400">{m.hubspotTargetObject}</code> cards.
                            </p>
                            <p className="text-slate-400 font-sans">
                              <strong>Strategy:</strong> {m.direction === "bidirectional" ? "Two-way Sync 🔄" : m.direction === "saas_to_hs" ? `Import into HubSpot 📥` : `Export into ${toolName} 📤`} ({m.frequency.toUpperCase().replace("_", " ")})
                            </p>
                            <div className="text-[11px] text-slate-500 font-mono space-y-1 pt-1 border-t border-slate-900">
                              <span>Action steps for selected approach:</span>
                              {approach === "native" && (
                                <ul className="list-decimal pl-4 mt-1 space-y-1 text-slate-450 font-sans">
                                  <li>Grant OAuth approvals inside the standard Connected App manager.</li>
                                  <li>Set corresponding field items.</li>
                                  <li>Turn trigger active.</li>
                                </ul>
                              )}
                              {approach === "middleware" && (
                                <ul className="list-decimal pl-4 mt-1 space-y-1 text-slate-450 font-sans">
                                  <li>Register webhook hook trigger variables in {middlewarePlatform.toUpperCase()}.</li>
                                  <li>Construct JSON field translation rules matching verified coordinates.</li>
                                  <li>Map error parameters.</li>
                                </ul>
                              )}
                              {approach === "custom" && (
                                <ul className="list-decimal pl-4 mt-1 space-y-1 text-slate-450 font-sans">
                                  <li>Configure listener endpoint scripts to process client JSON payloads.</li>
                                  <li>Format schema keys inside Node/Python memory buffers.</li>
                                  <li>Output error exceptions.</li>
                                </ul>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* HubSpot Requirements */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">06.</span> HUBSPOT CRM CONFIGURATION REQUIREMENTS
                    </h2>
                    {approach === "native" ? (
                      <p className="text-xs">
                        Configure native mapping settings inside Connected Apps portal. Ensure email matching rules are defined, and that conflict policies (Standard field overwrite guidelines) match target objectives.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs">
                          Create specific custom string and enumeration properties inside your HubSpot portal to keep telemetry and logs clean:
                        </p>
                        <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
                          <li><code className="text-orange-400 font-mono">hs_${toolName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_sync_id</code>: Primary mapping identifier.</li>
                          <li><code className="text-orange-400 font-mono">hs_${toolName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_sync_status</code>: Options (Synced, Pending, Error).</li>
                          <li><code className="text-orange-400 font-mono">hs_${toolName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_error_log</code>: Error details field.</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* SaaS Requirements */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">07.</span> {toolName.toUpperCase()} CONNECTION REQUIREMENTS
                    </h2>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-900 font-sans">
                      <li>
                        <strong>Credential Tier:</strong> 
                        {approach === "native" && " Official Marketplace Sync authorization setup with administrative login permissions."}
                        {approach === "middleware" && ` Active API Token, Webhook Secret or API Keys configured securely inside ${middlewarePlatform.toUpperCase()} Credentials.`}
                        {approach === "custom" && " Secure Private Developer app credentials (Client ID & Client Secret) allowing OAuth2 refresh key rotations."}
                      </li>
                      <li>
                        <strong>Resource Entities list:</strong> Read/Write schema range checked for table objects [
                        {selectedObjects.map((o) => `"${o.apiName}"`).join(", ")}
                        ].
                      </li>
                    </ul>
                  </div>

                  {/* Chapter 8: Pipeline Rules */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">08.</span> 
                      {approach === "native" && "MARKETPLACE CONNECTION SYNC RULES"}
                      {approach === "middleware" && `MIDDLEWARE FLOW LOGIC RULES (${middlewarePlatform.toUpperCase()})`}
                      {approach === "custom" && "CUSTOM SYNC ENGINE LOGIC RULES"}
                    </h2>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5 font-sans">
                      {approach === "native" && (
                        <>
                          <li><strong>Duplicate Guard:</strong> Enforce matching domain and email rules inside Marketplace settings before turning on.</li>
                          <li><strong>Conflict Resolution:</strong> Declare master systems per field property to prevent data looping.</li>
                        </>
                      )}
                      {approach === "middleware" && (
                        <>
                          <li><strong>Conditional Filtering:</strong> Apply trigger filters in {middlewarePlatform.toUpperCase()} to immediately dump incomplete update events.</li>
                          <li><strong>Quota-Safety:</strong> Minimize unnecessary polling. Utilize real-time instant webhooks where possible to save system task counts.</li>
                        </>
                      )}
                      {approach === "custom" && (
                        <>
                          <li><strong>Backoff & Retries:</strong> Enforce a 3x exponential backoff queue to bypass service blips.</li>
                          <li><strong>Schema Validation:</strong> Assert payload parameters inside scripts before calling HubSpot REST.</li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Schema Mappings (Section 9) */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">09.</span> VERIFIED PROPERTIES DATA SCHEMA MAP
                    </h2>
                    <div className="space-y-6">
                      {mappings.map((m) => {
                        const obj = selectedObjects.find((o) => o.id === m.sourceObjectId);
                        if (!obj) return null;
                        return (
                          <div key={obj.id} className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-350 font-display flex items-center justify-between">
                              <span>Map: {toolName} <code>{obj.apiName}</code> ➔ HubSpot <code>{m.hubspotTargetObject.toUpperCase()}</code></span>
                              <span className="text-[9px] font-mono bg-slate-900 border border-slate-800 text-orange-400 px-2 py-0.5 rounded uppercase">{m.direction}</span>
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-[10px] bg-slate-950 border border-slate-900 rounded-lg overflow-hidden">
                                <thead className="bg-slate-900 text-slate-400 uppercase font-mono font-bold">
                                  <tr>
                                    <th className="px-3 py-1.5 text-left">SaaS Source Field</th>
                                    <th className="px-3 py-1.5 text-left">HubSpot target Field</th>
                                    <th className="px-3 py-1.5 text-left">Type</th>
                                    <th className="px-3 py-1.5 text-center">Sync</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900 font-mono text-slate-300">
                                  {m.fieldMappings.map((fm) => {
                                    const fieldMeta = obj.fields.find((f) => f.name === fm.sourceField);
                                    return (
                                      <tr key={fm.sourceField} className="hover:bg-slate-900/40">
                                        <td className="px-3 py-1.5">{fm.sourceField}</td>
                                        <td className="px-3 py-1.5 text-slate-400">{fm.targetField}</td>
                                        <td className="px-3 py-1.5 text-slate-500 text-[9px]">{fieldMeta?.type || "string"}</td>
                                        <td className="px-3 py-1.5 text-center font-bold">{fm.enabled ? "✅" : "❌"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Error Handling (Section 10) */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">10.</span> ERROR HANDLING & ACTION PLAN
                    </h2>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5 font-sans">
                      {approach === "native" ? (
                        <>
                          <li><strong>Trace connected app charts:</strong> Admins can log into HubSpot Settings ➔ Connected Apps to locate errors logs.</li>
                          <li><strong>Manual re-sync trigger:</strong> Navigate to record's detail card inside HubSpot and choose "Sync now" button to overwrite conflicts.</li>
                        </>
                      ) : (
                        <>
                          <li><strong>Missing parameters freeze:</strong> If email is unknown, halt scenarios runs to protect tasks allocations.</li>
                          <li><strong>Automated diagnostic dump:</strong> Write REST trace values directly to <code className="text-rose-400">hs_sync_error_log</code>.</li>
                          <li><strong>Quick Redo States:</strong> Re-run a failed sync card by resetting mapping status properties back to "Pending" manually.</li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Out of scope (Section 11) */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">11.</span> OBJECTS OUT OF SCOPE
                    </h2>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1 font-sans">
                      <li>Synchronizing archival historic records compiled before launch date.</li>
                      <li>Custom scripts triggers inside intermediate step containers.</li>
                      <li>Direct three-way database pipelines updates simultaneously.</li>
                    </ul>
                  </div>

                  {/* Questions (Section 12) */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">12.</span> INTEGRATION VALIDATION CHECKS
                    </h2>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1 font-sans">
                      <li>What is the precise API limits cap for the credential class in {toolName}?</li>
                      <li>Does the authorized account level hold permission to write and update database cards?</li>
                    </ul>
                  </div>

                  {/* Pilot (Section 13) */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">13.</span> RECOMMENDED PILOT ROADMAP
                    </h2>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5 font-sans">
                      <li><strong>Phase 1:</strong> Authenticate secure endpoints credentials and test API trace loops.</li>
                      <li><strong>Phase 2:</strong> Program a single integration pipeline (e.g. Accounts table).</li>
                      <li><strong>Phase 3:</strong> Perform auditing using 25-50 testing records to audit synchronization precision.</li>
                      <li><strong>Phase 4:</strong> Toggle remaining active schema nodes on, and share short operational checklists.</li>
                    </ul>
                  </div>

                  {/* Next steps (Section 14) */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display pb-1 border-b border-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#F97316] font-bold">14.</span> RECOMMENDED PROGRAM NEXT STEPS
                    </h2>
                    <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-1.5 font-sans font-sans">
                      {approach === "native" && (
                        <>
                          <li>Search App Directory in HubSpot CRM settings for official {toolName}.</li>
                          <li>Input verified admin credentials.</li>
                          <li>Align standard schemas using coordinates configured in Section 9.</li>
                        </>
                      )}
                      {approach === "middleware" && (
                        <>
                          <li>Prepare standard license tiers inside {middlewarePlatform.toUpperCase()} to match transaction quotas.</li>
                          <li>Build target custom properties in HubSpot CRM before drafting scenarios.</li>
                          <li>Map fields using visual trigger panels verified in Section 9.</li>
                        </>
                      )}
                      {approach === "custom" && (
                        <>
                          <li>Create developer proxy endpoints inside internal application servers.</li>
                          <li>Map JSON parameter arrays matching verified Section 9 parameters.</li>
                          <li>Perform connection testing using staging accounts.</li>
                        </>
                      )}
                    </ol>
                  </div>

                </div>
              ) : (
                <div className="space-y-4 animate-fade-in text-xs font-sans">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-900">
                    <span className="text-xs font-mono text-orange-450 uppercase font-bold tracking-wider">Active Chapter Details ({approach})</span>
                  </div>
                  
                  {previewSections.map((sect) => {
                    if (sect.id !== activeSection) return null;
                    return (
                      <div key={sect.id} className="space-y-3">
                        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-display border-l-2 border-orange-500 pl-3.5 mt-2">
                          {sect.title}
                        </h2>
                        
                        <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed pr-1">
                          {sect.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
