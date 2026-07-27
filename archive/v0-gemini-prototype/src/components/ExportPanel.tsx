import React, { useState, useMemo } from "react";
import { SaaSObject, ObjectMapping } from "../types";
import { Copy, Check, FileCode, CheckCircle, ExternalLink, Download, FileText, Info } from "lucide-react";
import { MARKETPLACE_OPTIONS_MAP } from "../data";

interface ExportPanelProps {
  toolName: string;
  selectedObjects: SaaSObject[];
  mappings: ObjectMapping[];
  approach: "native" | "middleware" | "custom";
  middlewarePlatform: "celigo" | "zapier" | "make";
  selectedMarketplaceOptionId?: string;
}

export default function ExportPanel({
  toolName,
  selectedObjects,
  mappings,
  approach,
  middlewarePlatform,
  selectedMarketplaceOptionId = "default"
}: ExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"json" | "markdown">("json");

  const hasMappings = selectedObjects.length > 0 && mappings.length > 0;

  // Retrieve current selected marketplace integration choice metadata
  const currentMarketplaceOption = useMemo(() => {
    const options = MARKETPLACE_OPTIONS_MAP[toolName.toLowerCase()] || [];
    if (selectedMarketplaceOptionId === "default") {
      return options[0] || null;
    }
    return options.find((o) => o.id === selectedMarketplaceOptionId) || options[0] || null;
  }, [toolName, selectedMarketplaceOptionId]);

  // Generate mapping JSON spec
  const mappingJsonSpec = useMemo(() => {
    if (!hasMappings) return "{}";

    const exported = {
      integrationName: approach === "native" && currentMarketplaceOption
        ? `${currentMarketplaceOption.name} Specification Blueprint`
        : `${toolName} to HubSpot Integration Blueprint`,
      exportedAt: new Date().toISOString().split("T")[0],
      sourceSystem: toolName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      targetSystem: "hubspot",
      approachSelected: approach,
      marketplaceAppDetails: approach === "native" && currentMarketplaceOption ? {
        id: currentMarketplaceOption.id,
        name: currentMarketplaceOption.name,
        provider: currentMarketplaceOption.provider,
        rating: currentMarketplaceOption.rating
      } : undefined,
      middlewarePlatform: approach === "middleware" ? middlewarePlatform : undefined,
      mappingsCount: mappings.length,
      mappings: mappings.map((mapping) => {
        const matchingObj = selectedObjects.find((o) => o.id === mapping.sourceObjectId);
        return {
          sourceObject: {
            id: mapping.sourceObjectId,
            name: matchingObj?.name || mapping.sourceObjectId,
            apiName: matchingObj?.apiName || "",
          },
          hubspotTargetObject: mapping.hubspotTargetObject,
          syncDirection: mapping.direction,
          syncFrequency: mapping.frequency,
          fieldMappings: mapping.fieldMappings
            .filter((f) => f.enabled)
            .map((f) => ({
              sourceField: f.sourceField,
              targetField: f.targetField
            }))
        };
      })
    };

    return JSON.stringify(exported, null, 2);
  }, [toolName, selectedObjects, mappings, hasMappings, approach, middlewarePlatform, currentMarketplaceOption]);

  // Generate markdown documentation report
  const mappingMarkdownReport = useMemo(() => {
    if (!hasMappings) return "No active mappings to document.";

    let md = "";
    if (approach === "native" && currentMarketplaceOption) {
      md += `# Integration Blueprint: ${currentMarketplaceOption.name} by ${currentMarketplaceOption.provider}\n`;
    } else {
      md += `# Integration Blueprint: ${toolName} ⇄ HubSpot CRM\n`;
    }
    md += `**Date:** ${new Date().toLocaleDateString()}\n`;
    md += `**Status:** Configured (Schema Validated)\n`;
    
    let approachDesc = "";
    if (approach === "native") {
      approachDesc = currentMarketplaceOption 
        ? `Official / Marketplace App: ${currentMarketplaceOption.name} (by ${currentMarketplaceOption.provider})`
        : "Official App Marketplace Connection";
    } else if (approach === "middleware") {
      approachDesc = `Middleware Orchestration via ${middlewarePlatform.toUpperCase()}`;
    } else {
      approachDesc = "Custom REST-API Synchronizer Service";
    }
    md += `**Integration Approach:** ${approachDesc}\n\n`;

    if (approach === "native" && currentMarketplaceOption) {
      md += `This integration documents the mapping and flow directions using the **${currentMarketplaceOption.name}** marketplace app connecting **${toolName}** and **HubSpot CRM**.\n\n`;
    } else {
      md += `This integration documents the mapping and flow directions between the **${toolName}** database schema and **HubSpot CRM** targets.\n\n`;
    }

    md += `## 1. Synchronization Summary\n\n`;
    md += `| Source ${toolName} Object | Target HubSpot Object | Sync Direction | Sync Frequency | Mapped Properties |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: |\n`;

    mappings.forEach((m) => {
      const obj = selectedObjects.find((o) => o.id === m.sourceObjectId);
      const activeFields = m.fieldMappings.filter((f) => f.enabled).length;
      const directionLabel = m.direction === "bidirectional" ? "Two-way (⇄)" : m.direction === "saas_to_hs" ? "SaaS ➔ HubSpot" : "HubSpot ➔ SaaS";
      const freqLabel = m.frequency.toUpperCase().replace("_", " ");

      md += `| ${obj?.name || m.sourceObjectId} (${obj?.apiName || ""}) | HubSpot ${m.hubspotTargetObject} | ${directionLabel} | ${freqLabel} | ${activeFields} mapped |\n`;
    });

    md += `\n## 2. Detailed Object Property Maps\n\n`;

    mappings.forEach((m) => {
      const obj = selectedObjects.find((o) => o.id === m.sourceObjectId);
      md += `### Flow: ${obj?.name} (${obj?.apiName}) ⇄ HubSpot ${m.hubspotTargetObject.toUpperCase()}\n`;
      md += `- **Suggested Interval Frequency:** ${m.frequency.replace("_", " ")}\n`;
      md += `- **Flow Logic Direction:** ${m.direction}\n`;
      if (obj?.syncRequirements) {
        md += `- **Requirements Notice:** _${obj.syncRequirements}_\n`;
      }
      md += `\n| Done | ${toolName} Field Property | HubSpot Target Field | Matching Rule / Type |\n`;
      md += `| :---: | :--- | :--- | :--- |\n`;

      m.fieldMappings.forEach((fm) => {
        const matchingField = obj?.fields.find((f) => f.name === fm.sourceField);
        md += `| ${fm.enabled ? "✅" : "❌"} | \`${fm.sourceField}\` | \`${fm.targetField}\` | ${matchingField?.type || "string"} |\n`;
      });
      md += `\n---\n\n`;
    });

    if (approach === "native") {
      if (currentMarketplaceOption) {
        md += `_Integration spec compiled automatically. Apply these standard properties mapping within the standard configurations of the **${currentMarketplaceOption.name}** app._`;
      } else {
        md += `_Integration spec compiled automatically. Apply these standard properties mapping within the HubSpot official app configuration forms._`;
      }
    } else if (approach === "middleware") {
      md += `_Integration spec compiled automatically. Import these mapping guidelines directly into your ${middlewarePlatform.toUpperCase()} trigger tasks schema._`;
    } else {
      md += `_Integration spec compiled automatically. Use these standard transaction coordinates to construct secure REST client serializers._`;
    }
    
    return md;
  }, [toolName, selectedObjects, mappings, hasMappings, approach, middlewarePlatform, currentMarketplaceOption]);

  // Copy to clipboard helper
  const handleCopy = () => {
    const textToCopy = activeTab === "json" ? mappingJsonSpec : mappingMarkdownReport;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="export-summary-panel" className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-6 backdrop-blur-md relative overflow-hidden">
      
      {/* Step 5 Export Header & Prospect Instruction Panel */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2 font-display">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-mono font-bold">5</span>
              Schema Spec Exports
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Extract your completed integration layout for engineering review or middleware loading.
            </p>
          </div>

          {hasMappings && (
            <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-850">
              <button
                type="button"
                onClick={() => setActiveTab("json")}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "json"
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/15"
                    : "bg-transparent text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                JSON Spec
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("markdown")}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "markdown"
                    ? "bg-orange-500/10 text-orange-400 border border-orange-505/15"
                    : "bg-transparent text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Markdown Report
              </button>
            </div>
          )}
        </div>

        {/* Prospect Instruction Callout */}
        <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-xs text-slate-300 space-y-2">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-display text-sm">
            <Info className="w-4 h-4 text-orange-400" />
            Prospect Instructions: How to Export and Use your Blueprint
          </h4>
          <p className="text-slate-400 leading-relaxed font-sans">
            Once you have mapped your required entities, you can generate your integration blueprint output:
          </p>
          <ul className="list-disc pl-5 text-slate-400 space-y-1 mt-1 font-sans">
            {approach === "native" && (
              <li>Use the <strong className="text-orange-400">JSON Spec</strong> configuration arrays as standard setup coordinates to manually align mapping options inside HubSpot official connected screens.</li>
            )}
            {approach === "middleware" && (
              <li>Choose <strong className="text-orange-400">JSON Spec</strong> to copy a structured system payload that developers can load into automated middleware connectors (such as <strong>{middlewarePlatform.toUpperCase()}</strong> or <strong>HubSpot Operations Hub</strong>).</li>
            )}
            {approach === "custom" && (
              <li>Choose <strong className="text-orange-400 font-sans">JSON Spec</strong> to extract clean entity mapping arrays to seed REST-API serializers or automated payload validation files inside Node/Python endpoints.</li>
            )}
            <li>Choose <strong className="text-orange-400">Markdown Report</strong> to download a formatted scoping document that can be shared with your account executives, integration consultants, or engineering team.</li>
          </ul>
        </div>
      </div>

      {!hasMappings ? (
        <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs font-mono">
          Configure active object mappings in previous steps to extract technical integration specifications.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-905 bg-slate-900 text-slate-350 hover:bg-slate-850 hover:text-slate-100 transition-colors flex items-center gap-1.5 text-[10px] font-medium font-sans border border-slate-800 cursor-pointer shadow-md"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-orange-400" />
                  Copy Spec
                </>
              )}
            </button>

            <pre className="p-5 rounded-xl bg-slate-950 text-slate-300 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-slate-850 filter shadow-2xl">
              <code>{activeTab === "json" ? mappingJsonSpec : mappingMarkdownReport}</code>
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/15 text-[11px] text-slate-300 font-sans flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <h4 className="font-semibold text-slate-105 text-slate-100 font-display">Integration blueprint ready for middleware triggers</h4>
              <p className="text-slate-400">
                You can import this structured mapping specifications directly to HubSpot CRM Operations Hub pipelines, custom Celigo/Zapier hooks, or server middleware integrations to sync <strong>{toolName}</strong> transactional data structures.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
