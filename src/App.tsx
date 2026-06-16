import React, { useState, useEffect, useMemo } from "react";
import { SAAS_PRESETS } from "./data";
import { SaasToolPreset, SaaSObject, ObjectMapping, FieldMapping, SyncDirection, SyncFrequency } from "./types";
import SaaSSelector from "./components/SaaSSelector";
import ApproachSelector from "./components/ApproachSelector";
import ObjectTable from "./components/ObjectTable";
import MappingPanel from "./components/MappingPanel";
import ERDCanvas from "./components/ERDCanvas";
import ExportPanel from "./components/ExportPanel";
import RequirementsDoc from "./components/RequirementsDoc";
import UseCasePlanner from "./components/UseCasePlanner";
import { 
  Database, RefreshCw, Layers, Sparkles, Workflow, ArrowRight, ShieldCheck, HelpCircle
} from "lucide-react";

export default function App() {
  const [selectedToolId, setSelectedToolId] = useState<string>("salesforce");
  const [customTools, setCustomTools] = useState<SaasToolPreset[]>([]);
  
  // Choice of Integration approach & Middleware settings
  const [integrationApproach, setIntegrationApproach] = useState<"native" | "middleware" | "custom">("native");
  const [middlewarePlatform, setMiddlewarePlatform] = useState<"celigo" | "zapier" | "make">("celigo");
  const [selectedMarketplaceOptionId, setSelectedMarketplaceOptionId] = useState<string>("default");

  useEffect(() => {
    setSelectedMarketplaceOptionId("default");
  }, [selectedToolId]);
  
  // Seed initial Salesforce setup on startup
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>(["sf_contact"]);
  const [mappings, setMappings] = useState<ObjectMapping[]>(() => {
    const defaultTool = SAAS_PRESETS.find((t) => t.id === "salesforce") || SAAS_PRESETS[0];
    const defaultObj = defaultTool.objects.find((o) => o.id === "sf_contact") || defaultTool.objects[0];
    const initialFields: FieldMapping[] = defaultObj.fields.map((f) => ({
      sourceField: f.name,
      targetField: f.hubspotDefaultField,
      enabled: true
    }));
    return [{
      id: `map_${defaultObj.id}_to_${defaultObj.recommendedHubSpotTarget}`,
      sourceObjectId: defaultObj.id,
      hubspotTargetObject: defaultObj.recommendedHubSpotTarget,
      direction: "saas_to_hs",
      frequency: defaultObj.suggestedFrequency,
      fieldMappings: initialFields
    }];
  });

  // Get current active tool
  const currentTool = useMemo(() => {
    const allTools = [...SAAS_PRESETS, ...customTools];
    return allTools.find((t) => t.id === selectedToolId) || SAAS_PRESETS[0];
  }, [selectedToolId, customTools]);

  // Handle default initial selection when tool changes manually
  const handleSelectTool = (toolId: string) => {
    setSelectedToolId(toolId);
    
    const allTools = [...SAAS_PRESETS, ...customTools];
    const targetTool = allTools.find((t) => t.id === toolId) || SAAS_PRESETS[0];

    if (targetTool && targetTool.objects.length > 0) {
      // Seed with the first object by default
      const firstObj = targetTool.objects[0];
      setSelectedObjectIds([firstObj.id]);
      
      const initialFields: FieldMapping[] = firstObj.fields.map((f) => ({
        sourceField: f.name,
        targetField: f.hubspotDefaultField,
        enabled: true
      }));

      const initialMapping: ObjectMapping = {
        id: `map_${firstObj.id}_to_${firstObj.recommendedHubSpotTarget}`,
        sourceObjectId: firstObj.id,
        hubspotTargetObject: firstObj.recommendedHubSpotTarget,
        direction: "saas_to_hs",
        frequency: firstObj.suggestedFrequency,
        fieldMappings: initialFields
      };

      setMappings([initialMapping]);
    } else {
      setSelectedObjectIds([]);
      setMappings([]);
    }
  };

  // Callback when a natural language use-case plan is applied
  const handleApplyPreset = (
    toolId: string,
    enabledObjectIds: string[],
    directions: Record<string, SyncDirection>,
    frequencies: Record<string, SyncFrequency>
  ) => {
    setSelectedToolId(toolId);
    setSelectedObjectIds(enabledObjectIds);

    const allTools = [...SAAS_PRESETS, ...customTools];
    const targetTool = allTools.find((t) => t.id === toolId) || SAAS_PRESETS[0];

    const newMappings: ObjectMapping[] = [];

    targetTool.objects.forEach((obj) => {
      if (enabledObjectIds.includes(obj.id)) {
        const initialFields: FieldMapping[] = obj.fields.map((f) => ({
          sourceField: f.name,
          targetField: f.hubspotDefaultField,
          enabled: true
        }));

        const direction = directions[obj.id] || "saas_to_hs";
        const frequency = frequencies[obj.id] || obj.suggestedFrequency;

        newMappings.push({
          id: `map_${obj.id}_to_${obj.recommendedHubSpotTarget}`,
          sourceObjectId: obj.id,
          hubspotTargetObject: obj.recommendedHubSpotTarget,
          direction,
          frequency,
          fieldMappings: initialFields
        });
      }
    });

    setMappings(newMappings);
  };

  // Create custom tool callback
  const handleCreateCustomTool = (name: string, description: string) => {
    const newToolId = `custom_tool_${Date.now()}`;
    const newTool: SaasToolPreset = {
      id: newToolId,
      name,
      description,
      logoColor: "bg-indigo-600",
      category: "Custom SaaS Integrator",
      objects: [
        {
          id: `${newToolId}_entity`,
          name: "Default Record",
          apiName: "default_entity",
          description: "Core organizational asset record.",
          recommendedHubSpotTarget: "contact",
          category: "CRM",
          suggestedFrequency: "real_time",
          syncRequirements: "Primary Key email record is recommended.",
          fields: [
            { name: "id", label: "ID", type: "string", description: "Default customer primary tracking id.", hubspotDefaultField: "salesforceinstanceid" },
            { name: "email", label: "Email Address", type: "string (email)", description: "Email index node.", hubspotDefaultField: "email" },
            { name: "created_at", label: "Created Timestamp", type: "datetime", description: "Creation date.", hubspotDefaultField: "createdate" }
          ]
        }
      ]
    };

    setCustomTools((prev) => [...prev, newTool]);
    setSelectedToolId(newToolId);
    setSelectedObjectIds([`${newToolId}_entity`]);
    setMappings([
      {
        id: `map_${newToolId}_entity_to_contact`,
        sourceObjectId: `${newToolId}_entity`,
        hubspotTargetObject: "contact",
        direction: "saas_to_hs",
        frequency: "real_time",
        fieldMappings: [
          { sourceField: "id", targetField: "salesforceinstanceid", enabled: true },
          { sourceField: "email", targetField: "email", enabled: true },
          { sourceField: "created_at", targetField: "createdate", enabled: true }
        ]
      }
    ]);
  };

  // Handle dynamically added custom presets (e.g. from the Transcript Uploader AI extraction)
  const handleAddCustomPreset = (preset: SaasToolPreset) => {
    setCustomTools((prev) => {
      const alreadyExists = prev.some((t) => t.id === preset.id);
      if (alreadyExists) {
        return prev.map((t) => (t.id === preset.id ? preset : t));
      }
      return [...prev, preset];
    });

    setSelectedToolId(preset.id);

    const objectIds = preset.objects.map((obj) => obj.id);
    setSelectedObjectIds(objectIds);

    const initialMappings: ObjectMapping[] = preset.objects.map((obj) => {
      const initialFields = obj.fields.map((f) => ({
        sourceField: f.name,
        targetField: f.hubspotDefaultField || "custom_field",
        enabled: true
      }));

      return {
        id: `map_${obj.id}_to_${obj.recommendedHubSpotTarget}`,
        sourceObjectId: obj.id,
        hubspotTargetObject: obj.recommendedHubSpotTarget,
        direction: "saas_to_hs" as SyncDirection,
        frequency: obj.suggestedFrequency,
        fieldMappings: initialFields
      };
    });

    setMappings(initialMappings);
  };

  // Callback to add customized objects to tools
  const handleAddCustomObject = (customObj: SaaSObject) => {
    // Inject the custom object into our active customTools list (or replace standard tools with customized presets copy)
    const isStandardTool = SAAS_PRESETS.some((t) => t.id === selectedToolId);
    
    if (isStandardTool) {
      // If adding custom object to a preset standard tool, we can migrate it to a hybrid preset
      const existingPreset = SAAS_PRESETS.find((t) => t.id === selectedToolId)!;
      const alreadyModified = customTools.find((t) => t.id === selectedToolId);
      
      if (alreadyModified) {
        setCustomTools((prev) =>
          prev.map((t) =>
            t.id === selectedToolId ? { ...t, objects: [...t.objects, customObj] } : t
          )
        );
      } else {
        const copy: SaasToolPreset = {
          ...existingPreset,
          objects: [...existingPreset.objects, customObj]
        };
        setCustomTools((prev) => [...prev, copy]);
      }
    } else {
      // Adding to a custom tool
      setCustomTools((prev) =>
        prev.map((t) =>
          t.id === selectedToolId ? { ...t, objects: [...t.objects, customObj] } : t
        )
      );
    }

    // Auto-select and map the newly created custom object
    setSelectedObjectIds((prev) => [...prev, customObj.id]);
    
    const fieldsMap: FieldMapping[] = customObj.fields.map((f) => ({
      sourceField: f.name,
      targetField: f.hubspotDefaultField,
      enabled: true
    }));

    const newMap: ObjectMapping = {
      id: `map_${customObj.id}_to_${customObj.recommendedHubSpotTarget}`,
      sourceObjectId: customObj.id,
      hubspotTargetObject: customObj.recommendedHubSpotTarget,
      direction: "saas_to_hs",
      frequency: customObj.suggestedFrequency,
      fieldMappings: fieldsMap
    };

    setMappings((prev) => [...prev, newMap]);
  };

  // Delete custom object from list
  const handleDeleteCustomObject = (objId: string) => {
    // filter custom tool schemas
    setCustomTools((prev) =>
      prev.map((t) =>
        t.id === selectedToolId ? { ...t, objects: t.objects.filter((obj) => obj.id !== objId) } : t
      )
    );

    // remove selection and mappings
    setSelectedObjectIds((prev) => prev.filter((id) => id !== objId));
    setMappings((prev) => prev.filter((m) => m.sourceObjectId !== objId));
  };

  // Toggle checklist selection
  const handleToggleObjectSelection = (objectId: string) => {
    const isSelected = selectedObjectIds.includes(objectId);
    const targetObj = currentTool.objects.find((o) => o.id === objectId);
    if (!targetObj) return;

    if (isSelected) {
      // Remove selection
      setSelectedObjectIds((prev) => prev.filter((id) => id !== objectId));
      setMappings((prev) => prev.filter((m) => m.sourceObjectId !== objectId));
    } else {
      // Add selection and build standard initial mapping
      setSelectedObjectIds((prev) => [...prev, objectId]);

      const initialFields: FieldMapping[] = targetObj.fields.map((f) => ({
        sourceField: f.name,
        targetField: f.hubspotDefaultField,
        enabled: true
      }));

      const initialMapping: ObjectMapping = {
        id: `map_${targetObj.id}_to_${targetObj.recommendedHubSpotTarget}`,
        sourceObjectId: targetObj.id,
        hubspotTargetObject: targetObj.recommendedHubSpotTarget,
        direction: "saas_to_hs",
        frequency: targetObj.suggestedFrequency,
        fieldMappings: initialFields
      };

      setMappings((prev) => [...prev, initialMapping]);
    }
  };

  // Update object mapping state from nested panels
  const handleUpdateMapping = (updated: ObjectMapping) => {
    setMappings((prev) => prev.map((m) => (m.sourceObjectId === updated.sourceObjectId ? updated : m)));
  };

  // Remove mapping (triggered by trash icons inside details)
  const handleRemoveMapping = (objId: string) => {
    setSelectedObjectIds((prev) => prev.filter((id) => id !== objId));
    setMappings((prev) => prev.filter((m) => m.sourceObjectId !== objId));
  };

  // Resolve mapping objects for mapping list UI
  const selectedObjectsList = useMemo(() => {
    return currentTool.objects.filter((obj) => selectedObjectIds.includes(obj.id));
  }, [currentTool, selectedObjectIds]);

  // Scroll handler when clicking ERD nodes
  const handleScrollToMappingCard = (objId: string) => {
    const card = document.getElementById(`mapping-card-${objId}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 selection:bg-orange-500/20 selection:text-orange-200">
      {/* Cosmic background glow */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-radial-glow pointer-events-none opacity-50" />

      {/* Header element */}
      <header className="bg-slate-950/60 border-b border-slate-900 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-orange-500/10">
              <Workflow className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-50 tracking-tight flex items-center gap-1.5 font-display">
                SaaS to HubSpot Integration Workspace
                <span className="text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                  Active Spec
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Map database properties, configure sync directions, and generate visual schema blueprints.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/80 flex items-center gap-4 text-slate-300 font-mono">
              <div>
                Selected Source: <span className="font-semibold text-orange-400">{currentTool?.name}</span>
              </div>
              <div className="h-4 w-px bg-slate-850" />
              <div>
                Active Mappings: <span className="font-semibold text-orange-400">{mappings.length} Objects</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Natural Language Planner */}
        <UseCasePlanner
          currentToolId={selectedToolId}
          customTools={customTools}
          onApplyPreset={handleApplyPreset}
          onAddCustomPreset={handleAddCustomPreset}
        />

        {/* Step 1: Tool Selection */}
        <SaaSSelector
          selectedToolId={selectedToolId}
          onSelectTool={handleSelectTool}
          customTools={customTools}
          onCreateCustomTool={handleCreateCustomTool}
        />

        {/* Step 1.5: Determine Integration Approach */}
        <ApproachSelector
          tool={currentTool}
          selectedObjects={selectedObjectsList}
          approach={integrationApproach}
          onChangeApproach={setIntegrationApproach}
          middlewarePlatform={middlewarePlatform}
          onChangeMiddlewarePlatform={setMiddlewarePlatform}
          selectedMarketplaceOptionId={selectedMarketplaceOptionId}
          onChangeMarketplaceOptionId={setSelectedMarketplaceOptionId}
        />

        {/* Step 2: Object scope checklist & Hover inspector split */}
        <ObjectTable
          tool={currentTool}
          selectedObjectIds={selectedObjectIds}
          onToggleObjectSelection={handleToggleObjectSelection}
          onAddCustomObject={handleAddCustomObject}
          onDeleteCustomObject={handleDeleteCustomObject}
        />

        {/* Step 4: Live visual ERD diagram connecting source to target */}
        <ERDCanvas
          toolName={currentTool.name}
          selectedObjects={selectedObjectsList}
          mappings={mappings}
          onSelectMappingObject={handleScrollToMappingCard}
        />

        {/* Step 3: Mapping Panel */}
        <MappingPanel
          toolName={currentTool.name}
          selectedObjects={selectedObjectsList}
          mappings={mappings}
          onUpdateMapping={handleUpdateMapping}
          onRemoveMapping={handleRemoveMapping}
        />

        {/* Step 5: Export / Summarize panel */}
        <ExportPanel
          toolName={currentTool.name}
          selectedObjects={selectedObjectsList}
          mappings={mappings}
          approach={integrationApproach}
          middlewarePlatform={middlewarePlatform}
          selectedMarketplaceOptionId={selectedMarketplaceOptionId}
        />

        {/* Step 6: Requirements Document Generator */}
        <RequirementsDoc
          toolName={currentTool.name}
          selectedObjects={selectedObjectsList}
          mappings={mappings}
          approach={integrationApproach}
          middlewarePlatform={middlewarePlatform}
          selectedMarketplaceOptionId={selectedMarketplaceOptionId}
        />

      </main>

      {/* Aesthetic human literal Footer credits without margin clutter */}
      <footer className="max-w-3xl mx-auto text-center text-xs text-slate-500 mt-10">
        <p className="font-sans">SaaS to HubSpot Integration Builder</p>
        <p className="text-[11px] text-slate-500 mt-1">Configure and export enterprise mapping setups seamlessly.</p>
      </footer>
    </div>
  );
}
