import React, { useState } from "react";
import { SaaSObject, ObjectMapping, SyncDirection, SyncFrequency, FieldMapping } from "../types";
import { 
  ArrowRightLeft, ArrowLeftRight, ArrowRight, ArrowLeft, RefreshCw, 
  Trash2, Plus, Settings2, ShieldCheck, Check, Shuffle, RefreshCcw, 
  ChevronDown, ChevronUp, Layers, HelpCircle, HelpCircle as QuestionIcon, Info
} from "lucide-react";

interface MappingPanelProps {
  toolName: string;
  selectedObjects: SaaSObject[];
  mappings: ObjectMapping[];
  onUpdateMapping: (updated: ObjectMapping) => void;
  onRemoveMapping: (objId: string) => void;
}

export default function MappingPanel({
  toolName,
  selectedObjects,
  mappings,
  onUpdateMapping,
  onRemoveMapping
}: MappingPanelProps) {
  const [expandedMappingId, setExpandedMappingId] = useState<string | null>(null);

  if (selectedObjects.length === 0) {
    return (
      <div id="mapping-panel-empty" className="bg-slate-900/20 border-2 border-dashed border-slate-800 p-10 rounded-2xl text-center space-y-3.5 backdrop-blur-xs">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Settings2 className="w-6 h-6 stroke-1.25 text-orange-450 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-350 uppercase tracking-wider font-display">No Active Object Mappings</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            Please first select one or more source SaaS objects in the table above to configure field-level mappings, directional pipeline syncing, and schedule intervals.
          </p>
        </div>
      </div>
    );
  }

  const handleDirectionChange = (mapping: ObjectMapping, direction: SyncDirection) => {
    onUpdateMapping({
      ...mapping,
      direction
    });
  };

  const handleFrequencyChange = (mapping: ObjectMapping, frequency: SyncFrequency) => {
    onUpdateMapping({
      ...mapping,
      frequency
    });
  };

  const handleTargetObjectChange = (mapping: ObjectMapping, hubspotTargetObject: string) => {
    onUpdateMapping({
      ...mapping,
      hubspotTargetObject
    });
  };

  const handleToggleFieldSync = (mapping: ObjectMapping, fieldIndex: number) => {
    const nextFields = [...mapping.fieldMappings];
    nextFields[fieldIndex] = {
      ...nextFields[fieldIndex],
      enabled: !nextFields[fieldIndex].enabled
    };
    onUpdateMapping({
      ...mapping,
      fieldMappings: nextFields
    });
  };

  const handleTargetFieldNameChange = (mapping: ObjectMapping, fieldIndex: number, targetField: string) => {
    const nextFields = [...mapping.fieldMappings];
    nextFields[fieldIndex] = {
      ...nextFields[fieldIndex],
      targetField
    };
    onUpdateMapping({
      ...mapping,
      fieldMappings: nextFields
    });
  };

  const handleAddCustomFieldMapping = (mapping: ObjectMapping, sourceFieldName: string, targetFieldName: string) => {
    if (!sourceFieldName.trim() || !targetFieldName.trim()) return;
    const nextFields = [
      ...mapping.fieldMappings,
      {
        sourceField: sourceFieldName.trim(),
        targetField: targetFieldName.trim(),
        enabled: true
      }
    ];
    onUpdateMapping({
      ...mapping,
      fieldMappings: nextFields
    });
  };

  return (
    <div id="mapping-panel-container" className="space-y-6">
      {/* Step 3 Mapper Header & Prospect Instruction Panel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2 font-display">
            <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-mono font-bold">3</span>
            Field Mapping & Sync Configurator
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Configure how individual database properties link. Customize flows, intervals, and specify standard or custom property keys.
        </p>

        {/* Prospect Instruction Callout */}
        <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-xs text-slate-300 space-y-2">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-display text-sm">
            <Info className="w-4 h-4 text-orange-400" />
            Prospect Instructions: How to Sync & Map your Fields
          </h4>
          <p className="text-slate-400 leading-relaxed font-sans">
            Expand any active object card below to setup its properties sync specifications:
          </p>
          <ul className="list-disc pl-5 text-slate-400 space-y-1 mt-1 font-sans">
            <li>Select <strong className="text-orange-400">"From {toolName} to HubSpot"</strong> (Import Only), <strong className="text-orange-400">"Two-Way Sync"</strong>, or <strong className="text-slate-300">"From HubSpot to {toolName}"</strong> (Export Only) to dictate sync data directionality.</li>
            <li>Choose an integration sync scheduler frequency: <strong className="text-orange-400">⚡ Real-time (Webhooks)</strong> for live events, or scheduled batch windows (Hourly or Daily crons).</li>
            <li>Configure individual properties! Switch checkboxes off to disable syncing of that property, and customize the target <strong className="text-orange-400">HubSpot API Field Name</strong> to write to a custom user property.</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        {selectedObjects.map((obj) => {
          const mapping = mappings.find((m) => m.sourceObjectId === obj.id);
          if (!mapping) return null;

          const isExpanded = expandedMappingId === obj.id;
          const activeFieldsCount = mapping.fieldMappings.filter((f) => f.enabled).length;

          return (
            <div
              key={obj.id}
              id={`mapping-card-${obj.id}`}
              className={`bg-slate-900/40 rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? "border-orange-500/50 shadow-md shadow-orange-500/5 ring-4 ring-orange-500/5"
                  : "border-slate-800/80 shadow-xs hover:border-slate-700/80"
              }`}
            >
              {/* Header bar / Card summary */}
              <div
                onClick={() => setExpandedMappingId(isExpanded ? null : obj.id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 text-orange-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2 font-display">
                      {obj.name} <ArrowRight className="w-3.5 h-3.5 text-slate-600 animate-pulse" /> HubSpot{" "}
                      {mapping.hubspotTargetObject.charAt(0).toUpperCase() + mapping.hubspotTargetObject.slice(1)}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-1 font-mono">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-855">
                        Source: {obj.apiName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold uppercase">
                        {mapping.direction === "bidirectional"
                          ? "Bi-directional ⇄"
                          : mapping.direction === "saas_to_hs"
                          ? `${toolName} ➔ HubSpot`
                          : `HubSpot ➔ ${toolName}`}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                        {mapping.frequency.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 self-end md:self-center">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-semibold text-slate-305 text-slate-200">
                      {activeFieldsCount} / {mapping.fieldMappings.length} Fields Active
                    </span>
                    <p className="text-[10px] text-slate-500">mapped node attributes</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMapping(obj.id);
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Remove mapping"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible mapping body */}
              {isExpanded && (
                <div className="border-t border-slate-900/90 p-5 space-y-6 bg-slate-950/40 rounded-b-2xl">
                  {/* Sync Settings section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-start">
                    {/* Directional Toggle */}
                    <div className="lg:col-span-4 space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Pipeline Sync Direction
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
                        <button
                          type="button"
                          onClick={() => handleDirectionChange(mapping, "saas_to_hs")}
                          className={`py-2 px-1 text-center rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            mapping.direction === "saas_to_hs"
                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold animate-fade-in"
                              : "text-slate-500 border border-transparent hover:text-slate-300"
                          }`}
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span className="text-[9px] leading-tight font-sans">From {toolName} to HubSpot</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDirectionChange(mapping, "bidirectional")}
                          className={`py-2 px-1 text-center rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            mapping.direction === "bidirectional"
                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold font-semibold"
                              : "text-slate-500 border border-transparent hover:text-slate-300"
                          }`}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          <span className="text-[9px] leading-tight font-sans">Two-Way Sync</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDirectionChange(mapping, "hs_to_saas")}
                          className={`py-2 px-1 text-center rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            mapping.direction === "hs_to_saas"
                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold"
                              : "text-slate-500 border border-transparent hover:text-slate-300"
                          }`}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span className="text-[9px] leading-tight font-sans">From HubSpot to {toolName}</span>
                        </button>
                      </div>
                    </div>

                    {/* Sync Schedules / Frequency */}
                    <div className="lg:col-span-4 space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Pipeline Sync Frequency
                      </label>
                      <select
                        value={mapping.frequency}
                        onChange={(e) => handleFrequencyChange(mapping, e.target.value as SyncFrequency)}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans cursor-pointer"
                      >
                        <option value="real_time">⚡ Real-time (Webhook Trigger)</option>
                        <option value="hourly">🕒 Scheduled Hourly Sync</option>
                        <option value="daily">📅 Scheduled Daily Batch</option>
                        <option value="weekly">📅 Scheduled Weekly Batch</option>
                        <option value="manual">⚙️ Manual On-Demand Only</option>
                      </select>
                    </div>

                    {/* HubSpot target selector */}
                    <div className="lg:col-span-4 space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Target HubSpot Entity ID
                      </label>
                      <select
                        value={mapping.hubspotTargetObject}
                        onChange={(e) => handleTargetObjectChange(mapping, e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans cursor-pointer"
                      >
                        <option value="contact">Contacts (Default contact records)</option>
                        <option value="company">Companies (Account mappings)</option>
                        <option value="deal">Deals (Sales pipelines)</option>
                        <option value="ticket">Tickets (Support service desk)</option>
                        <option value="custom_invoice">Custom transaction invoice</option>
                        <option value="custom_subscription">Custom account plan profile</option>
                      </select>
                    </div>
                  </div>

                  {/* Fields Mapping details Table inside */}
                  <div className="space-y-3.5 pt-4 border-t border-slate-900">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Source to HubSpot Map Configurator Registry
                      </h4>
                      <span className="text-[10px] text-slate-500 font-sans">
                        Check fields to map property synchronization pathways
                      </span>
                    </div>

                    <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950 shadow-md divide-y divide-slate-900/80">
                      {/* Table Header */}
                      <div className="bg-slate-900/70 p-3 grid grid-cols-12 text-[10px] font-bold uppercase text-slate-450 tracking-wider font-mono">
                        <div className="col-span-1 text-center text-slate-500">Sync</div>
                        <div className="col-span-5 text-slate-450">Source Property Value ({obj.name})</div>
                        <div className="col-span-1 text-center text-slate-500">Flow</div>
                        <div className="col-span-5 text-slate-450">Target HubSpot Property API Name</div>
                      </div>

                      {/* Field Mappings rows */}
                      {mapping.fieldMappings.map((fieldMap, idx) => {
                        const originalField = obj.fields.find((f) => f.name === fieldMap.sourceField);
                        
                        return (
                          <div
                            key={fieldMap.sourceField}
                            className={`p-3 grid grid-cols-12 items-center text-xs transition-colors ${
                              fieldMap.enabled ? "bg-slate-950/20" : "bg-slate-955/40 text-slate-500"
                            }`}
                          >
                            <div className="col-span-1 text-center">
                              <input
                                type="checkbox"
                                checked={fieldMap.enabled}
                                onChange={() => handleToggleFieldSync(mapping, idx)}
                                className="rounded text-orange-500 focus:ring-orange-500/50 border-slate-800 bg-slate-900 h-4 w-4 cursor-pointer"
                              />
                            </div>

                            <div className="col-span-5 flex flex-col font-sans">
                              <span className={`font-semibold ${fieldMap.enabled ? "text-slate-200" : "text-slate-500"}`}>
                                {fieldMap.sourceField}
                              </span>
                              {originalField && (
                                <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {originalField.label} ({originalField.type})
                                </span>
                              )}
                            </div>

                            <div className="col-span-1 text-center">
                              {mapping.direction === "saas_to_hs" && <ArrowRight className="w-3.5 h-3.5 mx-auto text-orange-400" />}
                              {mapping.direction === "hs_to_saas" && <ArrowLeft className="w-3.5 h-3.5 mx-auto text-orange-500" />}
                              {mapping.direction === "bidirectional" && <ArrowRightLeft className="w-3.5 h-3.5 mx-auto text-emerald-450" />}
                            </div>

                            <div className="col-span-5">
                              <input
                                type="text"
                                value={fieldMap.targetField}
                                disabled={!fieldMap.enabled}
                                onChange={(e) => handleTargetFieldNameChange(mapping, idx, e.target.value)}
                                className="w-full text-xs font-mono px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                placeholder="Mapping node tag..."
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Custom Field helper */}
                    <AddCustomFieldForm onAddField={(sName, tName) => handleAddCustomFieldMapping(mapping, sName, tName)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Inner helper component for adding a custom field mapping row
interface AddCustomFieldFormProps {
  onAddField: (source: string, target: string) => void;
}

function AddCustomFieldForm({ onAddField }: AddCustomFieldFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [sourceField, setSourceField] = useState("");
  const [targetField, setTargetField] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceField.trim() || !targetField.trim()) return;
    onAddField(sourceField, targetField);
    setSourceField("");
    setTargetField("");
    setShowForm(false);
  };

  return (
    <div className="mt-2.5">
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-3.5 p-3.5 rounded-lg border border-orange-500/15 bg-orange-500/5">
          <div className="flex-1 min-w-[120px]">
            <input
              type="text"
              value={sourceField}
              onChange={(e) => setSourceField(e.target.value)}
              placeholder="Source API Name, e.g. age"
              className="w-full text-xs font-mono px-2.5 py-1.5 bg-slate-950 text-slate-100 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
              required
            />
          </div>
          <span className="text-slate-500 text-xs text-center font-bold">➔</span>
          <div className="flex-1 min-w-[120px]">
            <input
              type="text"
              value={targetField}
              onChange={(e) => setTargetField(e.target.value)}
              placeholder="HubSpot field, e.g. custom_age"
              className="w-full text-xs font-mono px-2.5 py-1.5 bg-slate-950 text-slate-100 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-slate-950 rounded cursor-pointer transition-colors"
            >
              Add Field
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-850 rounded cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 text-xs text-orange-400 font-semibold hover:text-orange-355 p-1.5 rounded transition-all focus:outline-none cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Custom Field Property Mapping
        </button>
      )}
    </div>
  );
}
