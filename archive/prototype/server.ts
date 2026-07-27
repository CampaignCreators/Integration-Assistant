import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API Route for transcript scoping and web lookup analysis
  app.post("/api/analyze-transcript", async (req, res) => {
    try {
      const { text, fileName } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing transcript text content." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not configured." });
      }

      console.log(`Analyzing transcript via Gemini... Length: ${text.length} chars`);

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prompt optimized for identifying unlisted tools, doing API web lookups, and formatting schema
      const prompt = `
Analyze the following HubSpot integration discovery transcript or scoping memo:
---
${text}
---
File Name metadata: ${fileName || "unknown"}

Your absolute highest-priority guidelines:
1. Identify the target external software tool (the third-party app NOT HubSpot itself) described for integration with HubSpot.
2. Verify if this target app matches any of these standard catalog applications in our local table: 
   [salesforce, netsuite, stripe, shopify, zendesk, jira, connectwise, snowflake, powerbi, shipstation, omnia360].
   * Note: "omnia360" refers to "Omnia 360", our telecommunications billing/BSS/OSS standard preset.
3. If the software is NOT on that list, you MUST:
   - Set "isNewApp" to true and "detectedAppId" to "new_app".
   - Identify the official name of the unlisted software (e.g. "QuickBooks", "ServiceNow", "Workday", "Keap", "Chargebee").
   - Use your GOOGLE SEARCH GROUNDING tool to search for the official REST API developer documentation for this specific software (search e.g. "QuickBooks Online REST API endpoints and fields" or similar depending on the detected software brand).
   - Grounded in your search results, construct a highly realistic, complete, formal "newAppPreset" object structure conforming to our SaasToolPreset system format. The objects array should list 2-3 of its actual API models/endpoints relevant to the integration use case (or standard entities like Customer/Invoice/Incident if unspecified) with real matching property keys, field schemas, data types, and suggested HubSpot mapping defaults.
4. Extract the active synchronization objects, directions (bidirectional, saas_to_hs, or hs_to_saas), suggested sync frequencies, scoping confidence rating, and verbatim evidence quotes.
5. Identify any custom operational pain points or database limitations.

Format your response strictly as a single JSON object. Do not include markdown wraps or comment blocks in the raw output if possible, just pure valid JSON matching the schema.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional HubSpot Solutions Architect that scopes integration mapping specifications. You parse customer transcripts and use Google Search to inspect official developer API docs for unknown SaaS systems to build correct property schedules.",
          tools: [
            { googleSearch: {} }
          ],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedAppId: { 
                type: Type.STRING, 
                description: "SaaS ID like salesforce, Netsuite, omnia360, etc., or 'new_app' if the software is a brand-new, unlisted tool." 
              },
              detectedAppName: { 
                type: Type.STRING, 
                description: "The name of the detected SaaS software." 
              },
              synopsis: { 
                type: Type.STRING, 
                description: "Synthesized qualitative overview of the integration requirements." 
              },
              isNewApp: { 
                type: Type.BOOLEAN, 
                description: "Set to true if this app is a new, unlisted software, otherwise false." 
              },
              newAppPreset: {
                type: Type.OBJECT,
                description: "Populate only if isNewApp is true. A fully structures mock/searched SaasToolPreset matching our typescript schema.",
                properties: {
                  id: { type: Type.STRING, description: "Snake_case ID for the new tool (e.g. quickbooks, servicenow)" },
                  name: { type: Type.STRING, description: "Official name of the software" },
                  description: { type: Type.STRING, description: "Description mentioning official API reference findings (e.g. 'Dynamics ERP REST V2')" },
                  logoColor: { type: Type.STRING, description: "A Tailwind bg-color class, e.g., bg-emerald-600, bg-violet-600, bg-amber-600" },
                  category: { type: Type.STRING, description: "One of: CRM, Billing, Support, E-commerce, ERP, Core" },
                  objects: {
                    type: Type.ARRAY,
                    description: "Realistic objects researched from the API reference relevant to the user's requirements.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: "Snake_case ID (e.g. qb_vendor, qb_invoice)" },
                        name: { type: Type.STRING, description: "Human label" },
                        apiName: { type: Type.STRING, description: "Exact API table/schema term (e.g. Vendor, Invoice)" },
                        description: { type: Type.STRING, description: "What this model is" },
                        recommendedHubSpotTarget: { type: Type.STRING, description: "HubSpot target code: contact, company, deal, ticket, invoice, or custom" },
                        category: { type: Type.STRING, description: "Exactly one of: CRM, Billing, Support, E-commerce, Core" },
                        suggestedFrequency: { type: Type.STRING, description: "suggested frequency: real_time, hourly, daily, manual" },
                        syncRequirements: { type: Type.STRING, description: "Field validation constraints" },
                        fields: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING, description: "Exact property identifier from API docs (e.g. id, bill_addr, line_items, doc_num)" },
                              label: { type: Type.STRING, description: "Human clean label" },
                              type: { type: Type.STRING, description: "Data model (string, integer, number, boolean, date, datetime, picklist)" },
                              description: { type: Type.STRING, description: "Property purpose descriptions" },
                              hubspotDefaultField: { type: Type.STRING, description: "Appropriate default HubSpot API key parameter" }
                            },
                            required: ["name", "label", "type", "description", "hubspotDefaultField"]
                          }
                        }
                      },
                      required: ["id", "name", "apiName", "description", "recommendedHubSpotTarget", "category", "suggestedFrequency", "syncRequirements", "fields"]
                    }
                  }
                },
                required: ["id", "name", "description", "logoColor", "category", "objects"]
              },
              detectedObjects: {
                type: Type.ARRAY,
                description: "Array of mapped integration flows extracted from text",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "References the object snake_case ID" },
                    name: { type: Type.STRING, description: "Name of the object" },
                    hubspotTarget: { type: Type.STRING, description: "Target label in HubSpot (Contacts, Companies, Deals, Invoices, Tickets, etc.)" },
                    direction: { type: Type.STRING, description: "Exactly: saas_to_hs, hs_to_saas, or bidirectional" },
                    frequency: { type: Type.STRING, description: "Exactly: real_time, hourly, daily, weekly, or manual" },
                    confidence: { type: Type.NUMBER, description: "Feasibility confidence, e.g., 90" },
                    evidence: { type: Type.STRING, description: "Specific quote snippet justifying this mapping" }
                  },
                  required: ["id", "name", "hubspotTarget", "direction", "frequency", "confidence", "evidence"]
                }
              },
              painPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of custom integration pain points, constraints, or warnings"
              }
            },
            required: ["detectedAppId", "detectedAppName", "synopsis", "isNewApp", "detectedObjects", "painPoints"]
          }
        }
      });

      console.log(`Gemini extraction succeeded for ${fileName || "text"}`);
      const resultJson = JSON.parse(response.text);
      res.json(resultJson);
    } catch (error: any) {
      console.error("Error analyzing transcript via server Gemini:", error);
      res.status(500).json({ error: error.message || "Failed to analyze transcript" });
    }
  });

  // Serve Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
