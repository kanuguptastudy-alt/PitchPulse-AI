import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI SDK with environment variables
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Dynamic Local IoT crowd density simulation
function simulateCrowdDensity(gate: string): number {
  const norm = gate.trim().toUpperCase();
  let base = 0.4;
  if (norm.includes("A") || norm.includes("B")) {
    base = 0.75;
  } else if (norm.includes("C") || norm.includes("D")) {
    base = 0.55;
  } else if (norm.includes("E") || norm.includes("F")) {
    base = 0.35;
  }
  // Add a slight deterministic shift based on characters
  const charSum = norm.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const factor = (charSum % 10) / 50; // -0.1 to +0.1
  return Math.min(1.0, Math.max(0.1, parseFloat((base + factor).toFixed(2))));
}

// Generate Congestion-bypassing path
interface NavigationStep {
  instruction: string;
  distance_meters: number;
  estimated_seconds: number;
}

function generateNavigation(gate: string, density: number, requiresAccessibility: boolean): NavigationStep[] {
  const steps: NavigationStep[] = [];
  const norm = gate.trim().toUpperCase();

  if (requiresAccessibility) {
    if (density > 0.7) {
      steps.push({
        instruction: `Origin congestion is high at ${gate}. Access step-free Elevator East 2 (marked with yellow accessibility lines).`,
        distance_meters: 110,
        estimated_seconds: 140,
      });
      steps.push({
        instruction: "Navigate along Level 1 low-gradient concourse bypassing heavy turnstiles toward West Elevator Hall.",
        distance_meters: 210,
        estimated_seconds: 190,
      });
      steps.push({
        instruction: "Descend via lift D-2 directly to the external accessibility shuttle bus terminal.",
        distance_meters: 140,
        estimated_seconds: 110,
      });
    } else {
      steps.push({
        instruction: `Exit ${gate} using the dedicated wide access ramp adjacent to ticket scanners.`,
        distance_meters: 70,
        estimated_seconds: 80,
      });
      steps.push({
        instruction: "Follow low-slope blue route markings directly to Level 1 Concourse exit path.",
        distance_meters: 190,
        estimated_seconds: 130,
      });
    }
  } else {
    if (density > 0.7) {
      steps.push({
        instruction: `Origin ${gate} is highly congested. Take immediate left up the secondary stairs to Concourse B bypass.`,
        distance_meters: 80,
        estimated_seconds: 100,
      });
      steps.push({
        instruction: "Use the Level 2 high-flow overhead walkway to clear the primary pedestrian cluster.",
        distance_meters: 160,
        estimated_seconds: 120,
      });
      steps.push({
        instruction: "Descend secondary stairwell S-4 leading directly to transit shuttle connections.",
        distance_meters: 180,
        estimated_seconds: 140,
      });
    } else {
      steps.push({
        instruction: `Walk straight through ${gate} main lobby toward central public promenade.`,
        distance_meters: 60,
        estimated_seconds: 50,
      });
      steps.push({
        instruction: "Proceed straight across Level 1 Concourse to the ground-level rapid bus lanes.",
        distance_meters: 130,
        estimated_seconds: 90,
      });
    }
  }

  return steps;
}

// ---------------------------------------------------------
// Full-Stack API Route
// ---------------------------------------------------------

app.post("/api/operations/route", async (req, res) => {
  const { raw_message, current_gate, requires_accessibility } = req.body;

  if (!raw_message || typeof raw_message !== "string" || raw_message.length < 3) {
    return res.status(400).json({ error: "raw_message is required and must be at least 3 characters." });
  }

  const gate = current_gate || "Gate A";
  const accessibility = !!requires_accessibility;
  const density = simulateCrowdDensity(gate);

  // Validate for simple prompt injection patterns
  const normalizedMsg = raw_message.toLowerCase();
  const injectionKeywords = [
    "ignore previous instructions",
    "system prompt",
    "sql injection",
    "drop table",
  ];
  if (injectionKeywords.some(keyword => normalizedMsg.includes(keyword))) {
    return res.status(422).json({ error: "Malicious prompt pattern or potential injection exploit blocked." });
  }

  try {
    const systemInstruction = `You are an expert FIFA World Cup 2026 stadium operations coordinator managing massive crowds of 80,000+ people.
Analyze the fan's multilingual input regarding crowd, queues, security, or emergencies.
You MUST output a valid JSON object matching this schema EXACTLY:
{
  "detected_language": "Detected language name",
  "translated_message": "Accurate English translation of raw fan input",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "routed_department": "SECURITY" | "MEDICAL" | "CROWD_CONTROL" | "FACILITIES" | "TRANSPORT" | "ACCESSIBILITY_SERVICES",
  "staff_action_memo": "Highly concise, actionable operational directive for local ground stewards."
}
Set priority to HIGH or CRITICAL for safety threats, medical distress, or severe blocks. Set routed_department appropriately based on the issue description.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Fan message: "${raw_message}" at location: "${gate}". Accessibility: ${accessibility}. Simulate dynamic operations.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["detected_language", "translated_message", "priority", "routed_department", "staff_action_memo"],
          properties: {
            detected_language: { type: Type.STRING },
            translated_message: { type: Type.STRING },
            priority: {
              type: Type.STRING,
              description: "Must be exactly LOW, MEDIUM, HIGH, or CRITICAL"
            },
            routed_department: {
              type: Type.STRING,
              description: "Must be exactly SECURITY, MEDICAL, CROWD_CONTROL, FACILITIES, TRANSPORT, or ACCESSIBILITY_SERVICES"
            },
            staff_action_memo: { type: Type.STRING }
          }
        },
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from GenAI model");
    }

    const parsed = JSON.parse(text);

    // Build the final synchronized routing payload
    const navigation = generateNavigation(gate, density, accessibility);

    return res.json({
      detected_language: parsed.detected_language || "Unknown",
      translated_message: parsed.translated_message || raw_message,
      priority: parsed.priority || "MEDIUM",
      routed_department: parsed.routed_department || "CROWD_CONTROL",
      crowd_density_index: density,
      optimized_path: navigation,
      accessibility_routing_applied: accessibility,
      staff_action_memo: parsed.staff_action_memo || "Local guard dispatched for reconnaissance.",
    });

  } catch (error: any) {
    console.error("GenAI Service Error:", error);

    // Robust offline fallback simulation if API is unconfigured or rate-limited
    const fallbackTranslate = raw_message;
    let fallbackPriority = "MEDIUM";
    let fallbackDept = "CROWD_CONTROL";
    let fallbackMemo = "Ground dispatch ordered to perform sector walk and assess situation.";

    if (normalizedMsg.includes("help") || normalizedMsg.includes("hurt") || normalizedMsg.includes("emergency")) {
      fallbackPriority = "CRITICAL";
      fallbackDept = "MEDICAL";
      fallbackMemo = "ALERT: Potential health crisis reported. Dispatch local paramedic responders immediately.";
    } else if (normalizedMsg.includes("crowd") || normalizedMsg.includes("stuck") || normalizedMsg.includes("atasco") || normalizedMsg.includes("embotellamiento")) {
      fallbackPriority = "HIGH";
      fallbackDept = "CROWD_CONTROL";
      fallbackMemo = "ALERT: Major crowd packing reported at gate. Re-route incoming fan stream via secondary walkways.";
    }

    const navigation = generateNavigation(gate, density, accessibility);

    return res.json({
      detected_language: "Detected (Heuristic Fallback)",
      translated_message: fallbackTranslate,
      priority: fallbackPriority,
      routed_department: fallbackDept,
      crowd_density_index: density,
      optimized_path: navigation,
      accessibility_routing_applied: accessibility,
      staff_action_memo: fallbackMemo,
      warning: "Operating in backup offline-heuristics mode due to GenAI remote server timeout."
    });
  }
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "PitchPulse Node Engine", timestamp: new Date().toISOString() });
});

// Setup Vite development middleware OR serve built static assets in production
async function startServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
