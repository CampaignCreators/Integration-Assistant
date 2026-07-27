import React, { useState } from "react";
import { SaasToolPreset } from "../types";
import { SAAS_PRESETS } from "../data";
import { Search, Plus, Database, CloudLightning, Activity, Hammer, Info } from "lucide-react";

interface SaaSSelectorProps {
  selectedToolId: string;
  onSelectTool: (toolId: string) => void;
  customTools: SaasToolPreset[];
  onCreateCustomTool: (name: string, description: string) => void;
}

export default function SaaSSelector({
  selectedToolId,
  onSelectTool,
  customTools,
  onCreateCustomTool
}: SaaSSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const allTools = [...SAAS_PRESETS, ...customTools];

  const filteredTools = allTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onCreateCustomTool(customName, customDesc || "Custom configured software integration.");
    setCustomName("");
    setCustomDesc("");
    setShowAddCustom(false);
  };

  return (
    <div id="saas-selector-container" className="space-y-5 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md relative overflow-hidden">
      <div className="absolute -right-20 -top-20 w-48 h-48 bg-entropy-glow pointer-events-none opacity-5 rounded-full" />
      
      {/* Step 1 Selector Header & Prospect Instruction Panel */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2 font-display">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-mono font-bold">1</span>
              Select Source SaaS Tool
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Choose the primary application database you want to map with HubSpot.
            </p>
          </div>
          
          <button
            id="btn-add-custom-saas"
            type="button"
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/25 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Tool
          </button>
        </div>

        {/* Prospect Instruction Callout */}
        <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-xs text-slate-300 space-y-2">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-display text-sm">
            <Info className="w-4 h-4 text-orange-400" />
            Prospect Instructions: How to choose your Source Tool
          </h4>
          <p className="text-slate-400 leading-relaxed font-sans">
            Start by selecting the business system that contains the client records, invoicing contracts, or item catalogs you want to integrate (e.g. select <strong className="text-orange-400">NetSuite ERP</strong> to map financials, or <strong className="text-orange-400">Salesforce CRM</strong>). If your system is a custom proprietary database or in-house microservice, click <strong className="text-orange-400">"Add Custom Tool"</strong> to design your own cloud source definition.
          </p>
        </div>
      </div>

      {showAddCustom && (
        <form onSubmit={handleCreate} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 transition-colors">
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tool Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Chargebee, Intercom, Pipedrive"
                className="w-full text-xs px-3 py-2 bg-slate-900 text-slate-100 border border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g. Sales, Billing, Product (Optional)"
                className="w-full text-xs px-3 py-2 bg-slate-900 text-slate-100 border border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</label>
            <input
              type="text"
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Brief description of the service and mapping goal."
              className="w-full text-xs px-3 py-2 bg-slate-900 text-slate-100 border border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
            />
          </div>
          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="px-3 py-1.5 text-slate-400 hover:bg-slate-900 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-slate-950 font-bold rounded-lg cursor-pointer transition-colors"
            >
              Save Custom Tool
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search integration sources (e.g. Salesforce, billing, e-commerce)..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-slate-950 transition-colors"
        />
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredTools.map((tool) => {
          const isSelected = tool.id === selectedToolId;
          const isCustom = !SAAS_PRESETS.some((p) => p.id === tool.id);

          return (
            <button
              key={tool.id}
              id={`tool-card-${tool.id}`}
              onClick={() => onSelectTool(tool.id)}
              className={`text-left p-4 rounded-xl border flex flex-col justify-between h-40 transition-all cursor-pointer ${
                isSelected
                  ? "border-orange-500/85 ring-2 ring-orange-500/20 bg-orange-500/5 shadow-md shadow-orange-500/5"
                  : "border-slate-800/80 bg-slate-950/45 hover:border-slate-700 hover:bg-slate-900/30"
              }`}
            >
              <div className="w-full">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg text-slate-950 ${tool.logoColor || "bg-orange-500"}`}>
                    {isCustom ? (
                      <Hammer className="w-4 h-4 text-slate-950" />
                    ) : (
                      <Database className="w-4 h-4 text-slate-950" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900/90 text-slate-400 border border-slate-800/60">
                    {tool.category}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-100 text-sm mt-3 flex items-center gap-1.5 font-display">
                  {tool.name}
                  {isCustom && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium rounded-sm uppercase tracking-wide">
                      Custom
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed font-sans">
                  {tool.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900/85 w-full text-[10px] font-mono text-slate-500">
                <span>{tool.objects.length} mapped objects</span>
                <span className={isSelected ? "text-orange-400 font-bold" : "text-slate-400"}>
                  {isSelected ? "Active" : "Select Source"}
                </span>
              </div>
            </button>
          );
        })}

        {filteredTools.length === 0 && (
          <div className="col-span-full py-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/80">
            <p className="text-slate-500 text-xs font-mono">No matching tools found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
