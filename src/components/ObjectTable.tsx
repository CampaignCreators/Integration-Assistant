import React, { useState } from "react";
import { SaaSObject, SaasToolPreset } from "../types";
import { Search, Info, Check, CheckSquare, Square, Plus, Trash2, HelpCircle, ArrowRight, Table, Database, RefreshCw, Sparkles } from "lucide-react";

interface ObjectTableProps {
  tool: SaasToolPreset;
  selectedObjectIds: string[];
  onToggleObjectSelection: (objectId: string) => void;
  onAddCustomObject: (obj: SaaSObject) => void;
  onDeleteCustomObject: (objId: string) => void;
}

export default function ObjectTable({
  tool,
  selectedObjectIds,
  onToggleObjectSelection,
  onAddCustomObject,
  onDeleteCustomObject
}: ObjectTableProps) {
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredObject, setHoveredObject] = useState<SaaSObject | null>(null);
  const [showAddCustomObj, setShowAddCustomObj] = useState(false);
  
  // Custom Object states
  const [newObjName, setNewObjName] = useState("");
  const [newObjApi, setNewObjApi] = useState("");
  const [newObjDesc, setNewObjDesc] = useState("");
  const [newFieldsInput, setNewFieldsInput] = useState("id:String:Unique Identifier\nname:String:Entity Name\nemail:String:Email address");

  // Snowflake Dynamic Configurator states
  const [snowflakeIngestCount, setSnowflakeIngestCount] = useState(2);
  const [snowflakeExportCount, setSnowflakeExportCount] = useState(1);
  const [snowflakeIngestTables, setSnowflakeIngestTables] = useState<Array<{ name: string; target: "company" | "contact" | "deal" | "ticket" | "activity" }>>([
    { name: "SFK_CUSTOMER_DIM", target: "company" },
    { name: "SFK_USAGE_FACT_AGG", target: "activity" }
  ]);
  const [snowflakeExportTables, setSnowflakeExportTables] = useState<Array<{ name: string; source: "company" | "contact" | "deal" | "ticket" }>>([
    { name: "HUBSPOT_DEALS_EXPORT", source: "deal" }
  ]);
  const [showSnowflakeSuccess, setShowSnowflakeSuccess] = useState(false);

  const handleUpdateIngestCount = (newCount: number) => {
    if (newCount < 1 || newCount > 5) return;
    setSnowflakeIngestCount(newCount);
    setSnowflakeIngestTables((prev) => {
      const copy = [...prev];
      if (newCount > copy.length) {
        for (let i = copy.length; i < newCount; i++) {
          const targets: Array<"company" | "contact" | "deal" | "ticket" | "activity"> = ["company", "contact", "deal", "ticket", "activity"];
          const defaultTarget = targets[i % targets.length];
          copy.push({
            name: i === 2 ? "SFK_LEADS_STREAM" : `SFK_LOGS_INGEST_TABLE_${i + 1}`,
            target: defaultTarget
          });
        }
      } else if (newCount < copy.length) {
        copy.splice(newCount);
      }
      return copy;
    });
  };

  const handleUpdateExportCount = (newCount: number) => {
    if (newCount < 0 || newCount > 5) return;
    setSnowflakeExportCount(newCount);
    setSnowflakeExportTables((prev) => {
      const copy = [...prev];
      if (newCount > copy.length) {
        for (let i = copy.length; i < newCount; i++) {
          const sources: Array<"company" | "contact" | "deal" | "ticket"> = ["company", "contact", "deal", "ticket"];
          const defaultSource = sources[i % sources.length];
          copy.push({
            name: `HUBSPOT_${defaultSource.toUpperCase()}_EXPORT`,
            source: defaultSource
          });
        }
      } else if (newCount < copy.length) {
        copy.splice(newCount);
      }
      return copy;
    });
  };

  const handleApplySnowflakeLayout = () => {
    // 1. Find all custom/guided Snowflake tables currently active
    const snowflakeCustomObjs = tool.objects.filter(
      (obj) => obj.id.startsWith("sfk_guided_") || obj.id.includes("snowflake_custom_")
    );

    // 2. Remove them sequentially
    snowflakeCustomObjs.forEach((obj) => {
      onDeleteCustomObject(obj.id);
    });

    // 3. Helper to build authentic SQL schemas
    const getFieldsForTarget = (target: string, isExport: boolean = false) => {
      const prefix = isExport ? "HS_" : "SFK_";
      if (target === "company") {
        return [
          { name: `${prefix}COMPANY_KEY`, label: "Company Key ID", type: "string (key)", description: "Unique account database key identifier.", hubspotDefaultField: "salesforceaccountid" },
          { name: `${prefix}COMPANY_NAME`, label: "Corporate Legal Title", type: "string", description: "Standard legally registered business name.", hubspotDefaultField: "name" },
          { name: `${prefix}DOMAIN_URL`, label: "Domain Address", type: "string", description: "Primary corporate web domain used as sync key.", hubspotDefaultField: "domain" },
          { name: `${prefix}REVENUE_ARR`, label: "Warehouse Estimated ARR", type: "currency", description: "Standard business annual recurring spending score.", hubspotDefaultField: "annualrevenue" },
          { name: `${prefix}CUSTOMER_TIER`, label: "Calculated Value Tier", type: "string", description: "Enterprise tier rating grouped in Snowflake.", hubspotDefaultField: "industry" }
        ];
      } else if (target === "contact") {
        return [
          { name: `${prefix}USER_KEY`, label: "User Key ID", type: "string (key)", description: "Unique individual record key identifier.", hubspotDefaultField: "salesforcecontactid" },
          { name: `${prefix}EMAIL`, label: "User Contact Email", type: "string (email)", description: "Primary login email address used as matching index.", hubspotDefaultField: "email" },
          { name: `${prefix}FIRST_NAME`, label: "Given First Name", type: "string", description: "Extracted first name from system records.", hubspotDefaultField: "firstname" },
          { name: `${prefix}LAST_NAME`, label: "Family Last Name", type: "string", description: "Extracted last name from system records.", hubspotDefaultField: "lastname" },
          { name: `${prefix}SIGNUP_DATE`, label: "Workspace Join Date", type: "date", description: "Signup logs date compiled in warehouse database.", hubspotDefaultField: "createdate" }
        ];
      } else if (target === "deal") {
        return [
          { name: `${prefix}DEAL_KEY`, label: "Opportunity Key ID", type: "string (key)", description: "Unique contract database key reference.", hubspotDefaultField: "salesforcedealid" },
          { name: `${prefix}DEAL_TITLE`, label: "Strategic Project Title", type: "string", description: "Sales engagement label of client contract.", hubspotDefaultField: "dealname" },
          { name: `${prefix}STAGED_VALUE`, label: "Expected Contract Worth", type: "currency", description: "Financial estimate calculated on analytics models.", hubspotDefaultField: "amount" },
          { name: `${prefix}CRON_STAGE`, label: "Pipeline Stage Tag", type: "string", description: "Active system sales progression phase.", hubspotDefaultField: "dealstage" },
          { name: `${prefix}CLOSE_ESTIMATE`, label: "Estimated Close Date", type: "date", description: "Calculated close date predicted by analytical tools.", hubspotDefaultField: "closedate" }
        ];
      } else if (target === "ticket") {
        return [
          { name: `${prefix}INCIDENT_KEY`, label: "Incident Key ID", type: "string (key)", description: "Unique database helpdesk ticket record index.", hubspotDefaultField: "zendesk_ticket_id" },
          { name: `${prefix}SUMMARY_HEADER`, label: "Log Subject Line", type: "string", description: "Helpdesk ticket incident header overview.", hubspotDefaultField: "subject" },
          { name: `${prefix}WORKFLOW_STAGE`, label: "Engineering Lifecycle Stage", type: "string", description: "Active status flag of ticketing file.", hubspotDefaultField: "hs_ticket_state" },
          { name: `${prefix}PRIORITY`, label: "Support Severity Code", type: "string", description: "System urgency levels defined by admins.", hubspotDefaultField: "hs_ticket_priority" }
        ];
      } else { // activity
        return [
          { name: `${prefix}EVENT_KEY`, label: "Active Event Key", type: "string (key)", description: "Telemetry unique execution log key reference.", hubspotDefaultField: "hs_activity_id" },
          { name: `${prefix}USER_EMAIL`, label: "Identity Email Match", type: "string (email)", description: "Active user principal login.", hubspotDefaultField: "email" },
          { name: `${prefix}ENGAGEMENT_SCORE`, label: "Weekly Click Activity", type: "integer", description: "Calculated system action score compiled.", hubspotDefaultField: "hs_activity_title" },
          { name: `${prefix}LAST_ACTION_NAME`, label: "Telemetry Description", type: "string", description: "Label detailing latest user action executed.", hubspotDefaultField: "hs_activity_notes" }
        ];
      }
    };

    // 4. Inject newly configured Ingest Tables
    snowflakeIngestTables.forEach((table, index) => {
      const apiNameClean = table.name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") || `SFK_INGEST_TABLE_${index + 1}`;
      const nameClean = apiNameClean.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");

      const customObj: SaaSObject = {
        id: `sfk_guided_ingest_${Date.now()}_${index}`,
        name: nameClean,
        apiName: apiNameClean,
        description: `Ingested data lake table mapped from Snowflake warehouse into HubSpot ${table.target} fields.`,
        recommendedHubSpotTarget: table.target,
        category: "Core",
        suggestedFrequency: "daily",
        syncRequirements: `Aggregated daily Snowflake data load. Syncs parameters into target HubSpot CRM properties automatically.`,
        fields: getFieldsForTarget(table.target, false)
      };

      onAddCustomObject(customObj);
    });

    // 5. Inject newly configured Export Tables
    snowflakeExportTables.forEach((table, index) => {
      const apiNameClean = table.name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") || `HUBSPOT_EXPORT_TABLE_${index + 1}`;
      const nameClean = apiNameClean.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");

      const customObj: SaaSObject = {
        id: `sfk_guided_export_${Date.now()}_${index}`,
        name: nameClean,
        apiName: apiNameClean,
        description: `Export target logging customer data from HubSpot ${table.source} cards back into Snowflake relational databases.`,
        recommendedHubSpotTarget: table.source,
        category: "CRM",
        suggestedFrequency: "daily",
        syncRequirements: `Nightly reverse-ETL load pipeline. Automatically appends client records modifications onto warehouse database schemas.`,
        fields: getFieldsForTarget(table.source, true)
      };

      onAddCustomObject(customObj);
    });

    // Set success feedback state
    setShowSnowflakeSuccess(true);
    setTimeout(() => {
      setShowSnowflakeSuccess(false);
    }, 4500);
  };

  // Get unique categories for filters
  const categories = ["All", ...Array.from(new Set(tool.objects.map((obj) => obj.category)))];

  const filteredObjects = tool.objects.filter((obj) => {
    const matchesCategory = filterCategory === "All" || obj.category === filterCategory;
    const matchesSearch =
      obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.apiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateCustomObj = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjName.trim() || !newObjApi.trim()) return;

    // Parse fields
    const parsedFields = newFieldsInput
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [fName, fType, fDesc] = line.split(":");
        return {
          name: fName?.trim() || "field_id",
          label: fName?.trim() || "Field Label",
          type: fType?.trim() || "string",
          description: fDesc?.trim() || "Custom object field properties",
          hubspotDefaultField: fName?.toLowerCase().replace(/[^a-z]/g, "") || "hs_custom_proc"
        };
      });

    const customObj: SaaSObject = {
      id: `${tool.id}_custom_${Date.now()}`,
      name: newObjName,
      apiName: newObjApi,
      description: newObjDesc || "User defined custom database object entities.",
      recommendedHubSpotTarget: "contact",
      category: "CRM",
      suggestedFrequency: "hourly",
      syncRequirements: "User defined custom fields mapped to HubSpot CRM.",
      fields: parsedFields.length > 0 ? parsedFields : [{ name: "id", label: "Unique ID", type: "string", description: "Primary Key identity field", hubspotDefaultField: "salesforceinstanceid" }]
    };

    onAddCustomObject(customObj);
    
    // reset
    setNewObjName("");
    setNewObjApi("");
    setNewObjDesc("");
    setNewFieldsInput("id:String:Unique Identifier\nname:String:Entity Name");
    setShowAddCustomObj(false);
  };

  return (
    <div id="object-selector-panel" className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-6 backdrop-blur-md relative overflow-hidden">
      <div className="absolute -right-20 -top-20 w-48 h-48 bg-orange-500/5 pointer-events-none rounded-full" />
      
      {/* Scope Selector Header & Prospect Instruction Panel */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2 font-display">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-mono font-bold">2</span>
              Mappings and Scope Selection
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select the data tables and entity collections from <span className="font-semibold text-orange-400">{tool.name}</span> that you need to synchronize.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCustomObj(!showAddCustomObj)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/25 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Object
          </button>
        </div>

        {/* Prospect Instruction Callout */}
        <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-xs text-slate-300 space-y-2">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-display text-sm">
            <Info className="w-4 h-4 text-orange-400" />
            Prospect Instructions: How to Scoped your Data Entities
          </h4>
          <p className="text-slate-400 leading-relaxed font-sans">
            Review the available database tables below. Toggle the checkmark next to each entity to include or exclude it from your integration scope. If your business depends on custom tables or custom ERP records not listed here, use the <strong className="text-orange-400">"Add Custom Object"</strong> button to outline your additional schemas.
          </p>
        </div>
      </div>

      {/* Snowflake Dynamic Warehouse Builder block */}
      {tool.id === "snowflake" && (
        <div id="snowflake-warehouse-configurator" className="p-5 sm:p-6 rounded-xl bg-slate-950/80 border border-cyan-500/20 shadow-lg shadow-cyan-950/15 relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-base animate-pulse">
                ❄️
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-display flex items-center gap-1.5">
                  Snowflake Data Warehouse Schema Generator
                </h3>
                <p className="text-[11px] text-slate-450">
                  Configure custom dimension views and ingest/export pipelines to align with HubSpot.
                </p>
              </div>
            </div>
            <span className="text-[9px] px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold uppercase tracking-wider">
              Warehouse Mode Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* INGEST COMPONENT */}
            <div className="space-y-3.5 bg-slate-900/30 p-4 rounded-xl border border-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-display">
                  📥 Ingest tables (Snowflake ➔ HubSpot)
                </span>
                <div className="flex items-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-850 gap-2.5 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => handleUpdateIngestCount(snowflakeIngestCount - 1)}
                    disabled={snowflakeIngestCount === 1}
                    className="w-5 h-5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:text-slate-100 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-200">{snowflakeIngestCount}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateIngestCount(snowflakeIngestCount + 1)}
                    disabled={snowflakeIngestCount === 5}
                    className="w-5 h-5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:text-slate-100 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {snowflakeIngestTables.map((table, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-900 text-xs">
                    <div>
                      <label className="block text-[9px] font-mono font-semibold text-slate-500 uppercase mb-0.5">Table/View Name</label>
                      <input
                        type="text"
                        value={table.name}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setSnowflakeIngestTables((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, name: val } : t))
                          );
                        }}
                        className="w-full bg-slate-930 border border-slate-850 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500/40 focus:outline-none uppercase font-mono font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono font-semibold text-slate-500 uppercase mb-0.5">HubSpot CRM Target</label>
                      <select
                        value={table.target}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setSnowflakeIngestTables((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, target: val } : t))
                          );
                        }}
                        className="w-full bg-slate-930 border border-slate-850 rounded px-1.5 py-1 text-slate-355 text-xs focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
                      >
                        <option value="company">Corporate Companies</option>
                        <option value="contact">Contacts Profiles</option>
                        <option value="deal">Deals Pipelines</option>
                        <option value="ticket">Service Tickets</option>
                        <option value="activity">Aggregated Activities</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EXPORT COMPONENT (REVERSE ETL) */}
            <div className="space-y-3.5 bg-slate-900/30 p-4 rounded-xl border border-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-display">
                  📤 Reverse-ETL Export (HubSpot ➔ Snowflake)
                </span>
                <div className="flex items-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-850 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateExportCount(snowflakeExportCount - 1)}
                    disabled={snowflakeExportCount === 0}
                    className="w-5 h-5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:text-slate-100 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-200">{snowflakeExportCount}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateExportCount(snowflakeExportCount + 1)}
                    disabled={snowflakeExportCount === 5}
                    className="w-5 h-5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:text-slate-100 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {snowflakeExportTables.length === 0 ? (
                  <div className="py-6 text-center text-slate-550 font-mono italic text-[11px] bg-slate-950/20 border border-dashed border-slate-900 rounded-lg">
                    No Reverse ETL export tables declared.
                  </div>
                ) : (
                  snowflakeExportTables.map((table, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-900 text-xs animate-fade-in">
                      <div>
                        <label className="block text-[9px] font-mono font-semibold text-slate-500 uppercase mb-0.5">Warehouse Export Table</label>
                        <input
                          type="text"
                          value={table.name}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setSnowflakeExportTables((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, name: val } : t))
                            );
                          }}
                          className="w-full bg-slate-930 border border-slate-850 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500/40 focus:outline-none uppercase font-mono font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono font-semibold text-slate-500 uppercase mb-0.5">HubSpot Source Node</label>
                        <select
                          value={table.source}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setSnowflakeExportTables((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, source: val } : t))
                            );
                          }}
                          className="w-full bg-slate-930 border border-slate-850 rounded px-1.5 py-1 text-slate-355 text-xs focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
                        >
                          <option value="company">Company Records</option>
                          <option value="contact">Contact Records</option>
                          <option value="deal">Deals Pipelines</option>
                          <option value="ticket">Service Tickets</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center sm:justify-between gap-3 text-xs">
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans max-w-xl">
              💡 <strong>Instant Alignment:</strong> Clicking synchronize compiles high-fidelity database target schemas. Your selection modifies the available database entity tables list dynamically!
            </p>
            
            <button
              type="button"
              onClick={handleApplySnowflakeLayout}
              className="px-4 py-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold font-semibold rounded-lg flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-md shadow-cyan-500/10 hover:shadow-cyan-400/20"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Build & Align Snowflake schemas
            </button>
          </div>

          {showSnowflakeSuccess && (
            <div className="p-3 bg-emerald-555/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2 font-semibold animate-fade-in">
              <span className="flex-shrink-0 text-sm">✨</span>
              <span>Successfully aligned Snowflake warehouse configuration! Custom dimensions and automated ETL mappings updated below.</span>
            </div>
          )}
        </div>
      )}

      {showAddCustomObj && (
        <form onSubmit={handleCreateCustomObj} className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Add custom schema object to {tool.name}</h3>
          
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Object Name</label>
              <input
                type="text"
                value={newObjName}
                onChange={(e) => setNewObjName(e.target.value)}
                placeholder="e.g. Contract, Refund"
                className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">API Name / Table ID</label>
              <input
                type="text"
                value={newObjApi}
                onChange={(e) => setNewObjApi(e.target.value)}
                placeholder="e.g. tbl_contracts, sf_refund__c"
                className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Description</label>
            <input
              type="text"
              value={newObjDesc}
              onChange={(e) => setNewObjDesc(e.target.value)}
              placeholder="Enterprise legal agreements for subscription accounts."
              className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase">Schema Fields (one per line, form: `Name:Type:Description`)</label>
              <span className="text-[9px] text-slate-500 font-sans">e.g. first_name:String:Given Name</span>
            </div>
            <textarea
              value={newFieldsInput}
              onChange={(e) => setNewFieldsInput(e.target.value)}
              rows={4}
              className="w-full text-xs font-mono p-3 bg-slate-900 border border-slate-850 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="id:String:Key id"
            />
          </div>

          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowAddCustomObj(false)}
              className="px-3 py-1.5 text-slate-400 hover:bg-slate-900 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-slate-950 font-bold rounded-lg cursor-pointer"
            >
              Add Custom Schema Object
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search matching objects..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950/65 border border-slate-800 rounded-lg text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-slate-950 transition-colors"
          />
        </div>

        {/* Tab Controls for Category filter */}
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filterCategory === cat
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/25 font-bold"
                  : "text-slate-400 border border-transparent hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Object table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40 shadow-xl">
        <table className="w-full text-left border-collapse table-auto min-w-[700px]">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-850">
              <th className="p-4 w-16 text-center">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Sync</span>
              </th>
              <th className="p-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Database Record Model</th>
              <th className="p-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono font-mono">API Name</th>
              <th className="p-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Default Category</th>
              <th className="p-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono text-center">Properties Count</th>
              <th className="p-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Default Target Node</th>
              <th className="p-4 w-12 text-center text-[10px] font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/60 font-sans">
            {filteredObjects.map((obj) => {
              const isSelected = selectedObjectIds.includes(obj.id);
              const isCustom = obj.id.includes("_custom_");

              return (
                <tr
                  key={obj.id}
                  onClick={() => onToggleObjectSelection(obj.id)}
                  className={`cursor-pointer hover:bg-slate-900/40 transition-colors ${
                    isSelected ? "bg-orange-500/5 border-l-2 border-l-orange-500" : "border-l-2 border-l-transparent"
                  }`}
                >
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleObjectSelection(obj.id)}
                      className="text-slate-500 hover:text-orange-400 focus:outline-none cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-orange-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-700" />
                      )}
                    </button>
                  </td>

                  <td className="p-4">
                    <div className="flex flex-col space-y-1">
                      <span className="font-semibold text-slate-200 text-sm flex items-center gap-1.5 font-display">
                        {obj.name}
                        {isCustom && (
                          <span className="text-[8px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 rounded font-mono">Custom</span>
                        )}
                      </span>
                      <span className="text-xs text-slate-400 max-w-xl font-sans leading-relaxed">
                        {obj.description}
                      </span>
                    </div>
                  </td>

                  <td className="p-4 text-xs font-mono text-slate-400">
                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-850">{obj.apiName}</span>
                  </td>

                  <td className="p-4 text-xs text-slate-300 font-medium">
                    {obj.category}
                  </td>

                  <td className="p-4 text-xs font-mono text-slate-450 text-center">
                    {obj.fields.length} fields
                  </td>

                  <td className="p-4 font-mono">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                      HubSpot {obj.recommendedHubSpotTarget.charAt(0).toUpperCase() + obj.recommendedHubSpotTarget.slice(1)}
                    </span>
                  </td>

                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {isCustom ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomObject(obj.id);
                        }}
                        className="p-1.5 text-slate-450 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                        title="Delete Custom Object"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-650 font-mono italic">-</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredObjects.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 text-xs font-mono">
                  No matching database objects found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="bg-slate-950 border-t border-slate-900 px-4 py-3.5 text-slate-400 text-[11px] font-sans flex items-start gap-2.5">
          <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed text-slate-400 font-sans">
            <strong>Check active objects to build dynamic pipelines:</strong> Selected models automatically configure mapping tables, flow controls, and field links underneath. Turn toggle checkmarks on and off to customize your active spec.
          </div>
        </div>
      </div>
    </div>
  );
}
