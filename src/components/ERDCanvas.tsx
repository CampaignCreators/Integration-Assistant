import React, { useMemo } from "react";
import { SaaSObject, ObjectMapping, SyncFrequency, SyncDirection } from "../types";
import { HUBSPOT_OBJECT_PRESETS } from "../data";
import { Zap, Clock, Calendar, Shield, Activity, HelpCircle, ArrowRightLeft, Database, Info } from "lucide-react";

interface ERDCanvasProps {
  toolName: string;
  selectedObjects: SaaSObject[];
  mappings: ObjectMapping[];
  onSelectMappingObject: (objId: string) => void;
}

const FREQUENCY_METADATA: Record<SyncFrequency, { label: string; color: string; bg: string; text: string; icon: string }> = {
  real_time: { label: "Real Time Webhook", color: "#F97316", bg: "bg-orange-500/10", text: "text-orange-400", icon: "Zap" },
  hourly: { label: "Hourly Cron Scheduler", color: "#818CF8", bg: "bg-indigo-500/10", text: "text-indigo-400", icon: "Clock" },
  daily: { label: "Daily Batch Job", color: "#3B82F6", bg: "bg-blue-500/10", text: "text-blue-400", icon: "Calendar" },
  weekly: { label: "Weekly Batch Job", color: "#A855F7", bg: "bg-purple-500/10", text: "text-purple-400", icon: "Calendar" },
  manual: { label: "Manual Pipeline Sync", color: "#64748B", bg: "bg-slate-500/10", text: "text-slate-400", icon: "Activity" }
};

export default function ERDCanvas({
  toolName,
  selectedObjects,
  mappings,
  onSelectMappingObject
}: ERDCanvasProps) {
  const hasMappings = selectedObjects.length > 0 && mappings.length > 0;

  const activeHubSpotTargets = useMemo(() => {
    const targets = mappings.map((m) => m.hubspotTargetObject);
    const uniqueTargets = Array.from(new Set(targets));
    return uniqueTargets.map((targetId) => {
      const preset = HUBSPOT_OBJECT_PRESETS.find((p) => p.id === targetId);
      return {
        id: targetId,
        name: preset ? preset.name : `HubSpot: ${targetId.toUpperCase()}`,
        description: preset ? preset.description : "Custom integrated schema property object."
      };
    });
  }, [mappings]);

  const canvasWidth = 840;
  const nodesCount = Math.max(selectedObjects.length, activeHubSpotTargets.length, 3);
  const nodeHeight = 85;
  const nodeGap = 35;
  const paddingTop = 40;
  const canvasHeight = paddingTop + nodesCount * (nodeHeight + nodeGap);

  const saasNodes = useMemo(() => {
    return selectedObjects.map((obj, index) => {
      const totalSaaS = selectedObjects.length;
      const step = totalSaaS > 1 ? (canvasHeight - 2 * paddingTop - nodeHeight) / (totalSaaS - 1) : 0;
      const y = totalSaaS > 1 ? paddingTop + index * step : (canvasHeight / 2) - (nodeHeight / 2);
      return {
        ...obj,
        x: 40,
        y,
        width: 220,
        height: nodeHeight,
        anchorX: 40 + 220,
        anchorY: y + nodeHeight / 2
      };
    });
  }, [selectedObjects, canvasHeight]);

  const hsNodes = useMemo(() => {
    return activeHubSpotTargets.map((target, index) => {
      const totalHS = activeHubSpotTargets.length;
      const step = totalHS > 1 ? (canvasHeight - 2 * paddingTop - nodeHeight) / (totalHS - 1) : 0;
      const y = totalHS > 1 ? paddingTop + index * step : (canvasHeight / 2) - (nodeHeight / 2);
      return {
        ...target,
        x: 580,
        y,
        width: 220,
        height: nodeHeight,
        anchorX: 580,
        anchorY: y + nodeHeight / 2
      };
    });
  }, [activeHubSpotTargets, canvasHeight]);

  const connections = useMemo(() => {
    const list: Array<{
      id: string;
      sourceObjId: string;
      targetObjId: string;
      direction: SyncDirection;
      frequency: SyncFrequency;
      pathD: string;
      centerX: number;
      centerY: number;
      themeColor: string;
    }> = [];

    mappings.forEach((mapping) => {
      const sourceNode = saasNodes.find((n) => n.id === mapping.sourceObjectId);
      const targetNode = hsNodes.find((n) => n.id === mapping.hubspotTargetObject);

      if (sourceNode && targetNode) {
        const sx = sourceNode.anchorX;
        const sy = sourceNode.anchorY;
        const tx = targetNode.anchorX;
        const ty = targetNode.anchorY;

        const ctrlX1 = sx + 140;
        const ctrlY1 = sy;
        const ctrlX2 = tx - 140;
        const ctrlY2 = ty;
        const pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${tx} ${ty}`;

        const cx = 0.125 * sx + 0.375 * ctrlX1 + 0.375 * ctrlX2 + 0.125 * tx;
        const cy = 0.125 * sy + 0.375 * ctrlY1 + 0.375 * ctrlY2 + 0.125 * ty;

        const freqInfo = FREQUENCY_METADATA[mapping.frequency];

        list.push({
          id: mapping.id,
          sourceObjId: mapping.sourceObjectId,
          targetObjId: mapping.hubspotTargetObject,
          direction: mapping.direction,
          frequency: mapping.frequency,
          pathD,
          centerX: cx,
          centerY: cy,
          themeColor: freqInfo?.color || "#64748B"
        });
      }
    });

    return list;
  }, [mappings, saasNodes, hsNodes]);

  return (
    <div id="visual-erd-section" className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-6 backdrop-blur-md relative overflow-hidden">
      
      {/* Step 4 ERD Header & Prospect Instruction Panel */}
      <div className="space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2 font-display">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-mono font-bold">4</span>
              Interactive Integration Blueprint (ERD)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Visual vector map displaying live schema pathways and webhooks synced to your HubSpot pipeline.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono font-medium">
            {Object.entries(FREQUENCY_METADATA).map(([key, value]) => (
              <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 border border-slate-850">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: value.color }} />
                {value.label.replace(" Scheduled", "").replace(" Sync", "")}
              </span>
            ))}
          </div>
        </div>

        {/* Prospect Instruction Callout */}
        <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-xs text-slate-300 space-y-2">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-display text-sm">
            <Info className="w-4 h-4 text-orange-400" />
            Prospect Instructions: Visualizing your Data Map
          </h4>
          <p className="text-slate-400 leading-relaxed font-sans">
            This live Network Graph represents your designed data flow relationships. Upstream models from your chosen SaaS/ERP tool are mapped dynamically to downstream HubSpot Standard CRM entities. The pulsed particles show active data synchronization flow directories. You can <strong className="text-orange-400">click any upstream card node</strong> on the blueprint to jump directly to its custom field-by-field properties configuration board below.
          </p>
        </div>
      </div>

      {!hasMappings ? (
        <div className="h-96 rounded-2xl bg-slate-950/40 border-2 border-dashed border-slate-850 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <Database className="w-12 h-12 text-slate-700 stroke-1 animate-pulse" />
          <div className="space-y-1 max-w-sm">
            <h4 className="text-sm font-semibold text-slate-350 uppercase tracking-wider font-display">Blueprint Pipeline Offline</h4>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Add schema tables in Mappings selection above. High fidelity live pipelines will dynamically illuminate, visualizing active real-time transaction synchronization flows.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-850/70 p-4 bg-slate-950/40">
          <svg
            id="integration-canvas-svg"
            width="100%"
            height={canvasHeight}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="w-full bg-slate-950 rounded-xl border border-slate-850 shadow-2xl max-w-[840px] mx-auto overflow-visible select-none"
          >
            {/* Markers for Arrows */}
            <defs>
              {connections.map((c) => (
                <React.Fragment key={`defs-${c.id}`}>
                  {/* Arrow for SaaS -> HubSpot */}
                  <marker
                    id={`arrow-right-${c.id}`}
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill={c.themeColor} />
                  </marker>
                  {/* Arrow for HubSpot -> SaaS */}
                  <marker
                    id={`arrow-left-${c.id}`}
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 10 1 L 0 5 L 10 9 z" fill={c.themeColor} />
                  </marker>
                </React.Fragment>
              ))}
            </defs>

            {/* DRAW FLOW PIPELINES (BEZIER CONNECTOR LINES) */}
            {connections.map((c) => {
              const isTwoWay = c.direction === "bidirectional";
              const isToHS = c.direction === "saas_to_hs" || isTwoWay;
              const isToSaaS = c.direction === "hs_to_saas" || isTwoWay;

              let pulseDur = "3s";
              if (c.frequency === "real_time") pulseDur = "1.5s";
              if (c.frequency === "daily" || c.frequency === "weekly") pulseDur = "6s";

              return (
                <g key={`connection-group-${c.id}`} className="group cursor-pointer">
                  {/* Background interactive thicker stroke */}
                  <path
                    d={c.pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="12"
                    onClick={() => onSelectMappingObject(c.sourceObjId)}
                    className="hover:stroke-slate-800/40 transition-colors"
                  />

                  {/* Base visual path */}
                  <path
                    d={c.pathD}
                    fill="none"
                    stroke={c.themeColor}
                    strokeWidth="2.5"
                    markerEnd={isToHS ? `url(#arrow-right-${c.id})` : undefined}
                    markerStart={isToSaaS ? `url(#arrow-left-${c.id})` : undefined}
                    className="opacity-80 group-hover:opacity-100 transition-opacity"
                  />

                  {/* ACTIVE DATA PARTICLES PULSE ANImation along the path */}
                  {c.frequency !== "manual" && (
                    <circle r="4.5" fill="#FFFFFF" className="filter drop-shadow-[0_0_4px_rgba(249,115,22,0.8)]">
                      <animateMotion
                        dur={pulseDur}
                        repeatCount="indefinite"
                        path={c.pathD}
                        keyPoints={c.direction === "hs_to_saas" ? "1;0" : "0;1"}
                        keyTimes="0;1"
                      />
                    </circle>
                  )}

                  {/* Bidirectional second particle path if bidirectional */}
                  {isTwoWay && c.frequency !== "manual" && (
                    <circle r="3.5" fill="#FFFFFF" className="filter drop-shadow-[0_0_4px_rgba(249,115,22,0.8)]">
                      <animateMotion
                        dur={pulseDur}
                        repeatCount="indefinite"
                        path={c.pathD}
                        keyPoints="1;0"
                        keyTimes="0;1"
                      />
                    </circle>
                  )}

                  {/* CENTER INTERACTIVE DIRECTION BADGE */}
                  <foreignObject
                    x={c.centerX - 18}
                    y={c.centerY - 18}
                    width="36"
                    height="36"
                    onClick={() => onSelectMappingObject(c.sourceObjId)}
                    className="overflow-visible"
                  >
                    <button
                      type="button"
                      style={{ borderColor: c.themeColor, color: c.themeColor }}
                      className="w-9 h-9 text-xs rounded-full border bg-slate-900 flex items-center justify-center shadow-lg hover:scale-115 transition-transform cursor-pointer"
                      title={`Sync Frequency: ${c.frequency.replace("_", " ")}. Click to configure.`}
                    >
                      {c.direction === "bidirectional" ? (
                        <ArrowRightLeft className="w-4 h-4 stroke-2" />
                      ) : c.direction === "saas_to_hs" ? (
                        <span className="font-extrabold text-[13px] leading-none">➔</span>
                      ) : (
                        <span className="font-extrabold text-[13px] leading-none">←</span>
                      )}
                    </button>
                  </foreignObject>
                </g>
              );
            })}

            {/* LEFT COLUMN: SOURCE SaaS OBJECT NODES */}
            <g id="saas-nodes-group">
              {saasNodes.map((node) => {
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => onSelectMappingObject(node.id)}
                    className="cursor-pointer group select-none"
                  >
                    {/* card border / backdrop */}
                    <rect
                      width={node.width}
                      height={node.height}
                      rx="14"
                      className="fill-slate-900 stroke-slate-800 stroke-[1.5] filter drop-shadow-lg group-hover:stroke-orange-500/80 transition-all"
                    />

                    {/* left brand indicator accent bar */}
                    <rect width="6" height={node.height} rx="3" x="0" className="fill-orange-500" />

                    {/* Node contents */}
                    <text x="20" y="30" fill="#F8FAFC" className="font-sans font-bold text-xs font-display">
                      {node.name}
                    </text>
                    <text x="20" y="47" fill="#64748B" className="font-mono text-[9px]">
                      {node.apiName}
                    </text>
                    
                    {/* fields counts badge */}
                    <rect x="20" y="58" width="85" height="18" rx="4" className="fill-slate-950/70 stroke-slate-850" />
                    <text x="26" y="70" fill="#94A3B8" className="font-sans text-[9px] font-medium">
                      {node.fields.length} Properties
                    </text>

                    {/* SaaS ID badge / logo tag */}
                    <rect x="155" y="16" width="50" height="16" rx="4" className="fill-orange-500/10" />
                    <text x="160" y="27" fill="#F97316" className="font-sans text-[9px] font-semibold">
                      {toolName.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* RIGHT COLUMN: HUBSPOT OBJECT NODES */}
            <g id="hubspot-nodes-group">
              {hsNodes.map((node) => {
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="select-none"
                  >
                    <rect
                      width={node.width}
                      height={node.height}
                      rx="14"
                      className="fill-slate-900 stroke-slate-800 stroke-[1.5] filter drop-shadow-lg"
                    />

                    {/* left brand indicator accent bar (Hubspot Orange!) */}
                    <rect width="6" height={node.height} rx="3" x="214" className="fill-orange-500" />

                    {/* Node contents */}
                    <text x="20" y="30" fill="#F8FAFC" className="font-sans font-bold text-xs font-display">
                      {node.name}
                    </text>
                    <text x="20" y="47" fill="#64748B" className="font-mono text-[9px]">
                      hubspot_type: {node.id}
                    </text>

                    {/* category badge */}
                    <rect x="20" y="58" width="95" height="18" rx="4" className="fill-orange-500/10" />
                    <text x="26" y="70" fill="#F97316" className="font-sans text-[9px] font-bold">
                      HubSpot Standard
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}
