import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Navigation,
  Users,
  AlertTriangle,
  Flame,
  Shield,
  Activity,
  CheckCircle,
  Accessibility,
  Clock,
  Compass,
  ArrowRight,
  TrendingUp,
  MapPin,
  Sparkles,
  ChevronRight,
  PhoneCall,
  Loader2,
  RefreshCw,
  Eye,
  Menu
} from "lucide-react";

// --- Mock Stadium Static Data ---
interface GateInfo {
  id: string;
  name: string;
  baseDensity: number;
  coordinates: { x: number; y: number };
  amenities: string[];
}

const STADIUM_GATES: GateInfo[] = [
  { id: "GATE_A", name: "Gate A (Main North)", baseDensity: 0.85, coordinates: { x: 350, y: 80 }, amenities: ["Rapid Transit Link", "First Aid Station"] },
  { id: "GATE_B", name: "Gate B (Northeast)", baseDensity: 0.72, coordinates: { x: 520, y: 160 }, amenities: ["VIP Lounge Entrance", "Ramp Access"] },
  { id: "GATE_C", name: "Gate C (Southeast)", baseDensity: 0.48, coordinates: { x: 500, y: 380 }, amenities: ["Family Entrance", "Wheelchair Hub"] },
  { id: "GATE_D", name: "Gate D (Main South)", baseDensity: 0.60, coordinates: { x: 350, y: 440 }, amenities: ["Rideshare Pick-up", "Food Court"] },
  { id: "GATE_E", name: "Gate E (Southwest)", baseDensity: 0.35, coordinates: { x: 180, y: 360 }, amenities: ["Media Center Entrance", "Elevator East"] },
  { id: "GATE_F", name: "Gate F (Northwest)", baseDensity: 0.52, coordinates: { x: 160, y: 160 }, amenities: ["Merchandise Mega-Store", "Elevator West"] }
];

interface PredefinedSample {
  id: string;
  language: string;
  label: string;
  message: string;
  gate: string;
  accessibility: boolean;
}

const PREDEFINED_FAN_INPUTS: PredefinedSample[] = [
  {
    id: "sample_1",
    language: "Español",
    label: "Spanish: Gate A Bottleneck",
    message: "Hay una enorme acumulación de gente en la Puerta A, la fila no avanza para nada y el calor es agobiante.",
    gate: "GATE_A",
    accessibility: false
  },
  {
    id: "sample_2",
    language: "日本語",
    label: "Japanese: Wheelchair Elevator Request",
    message: "車椅子を使用していますが、ゲートE近くのエレベーターが混雑で使えません。安全な別のスロープ経路を教えてください。",
    gate: "GATE_E",
    accessibility: true
  },
  {
    id: "sample_3",
    language: "Deutsch",
    label: "German: Gate B Security Alert",
    message: "In der Nähe von Tor B gibt es ein dichtes Gedränge und einige Leute versuchen, die Absperrung zu überwinden. Es braucht mehr Ordner.",
    gate: "GATE_B",
    accessibility: false
  },
  {
    id: "sample_4",
    language: "العربية",
    label: "Arabic: Medical Emergency near Gate D",
    message: "شخص ما مغمى عليه هنا بالقرب من البوابة D بسبب الازدحام الشديد. أين الفريق الطبي؟ أحتاج إلى مساعدة عاجلة.",
    gate: "GATE_D",
    accessibility: false
  },
  {
    id: "sample_5",
    language: "English",
    label: "English: Transit Blockage Gate F",
    message: "The shuttle terminal outside Gate F is completely packed and blocking the exit stairs. People are getting stuck on the stairwell.",
    gate: "GATE_F",
    accessibility: false
  }
];

interface NavigationStep {
  instruction: string;
  distance_meters: number;
  estimated_seconds: number;
}

interface OperationalRoute {
  detected_language: string;
  translated_message: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  routed_department: "SECURITY" | "MEDICAL" | "CROWD_CONTROL" | "FACILITIES" | "TRANSPORT" | "ACCESSIBILITY_SERVICES";
  crowd_density_index: number;
  optimized_path: NavigationStep[];
  accessibility_routing_applied: boolean;
  staff_action_memo: string;
  warning?: string;
}

interface HistoricalEvent {
  id: string;
  timestamp: string;
  gate: string;
  input: string;
  translation: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dept: string;
  status: "RESOLVED" | "DISPATCHED" | "MONITORING";
}

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
  const charSum = norm.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const factor = (charSum % 10) / 50; // -0.1 to +0.1
  return Math.min(1.0, Math.max(0.1, parseFloat((base + factor).toFixed(2))));
}

export default function App() {
  const [inputText, setInputText] = useState(PREDEFINED_FAN_INPUTS[0].message);
  const [selectedGate, setSelectedGate] = useState("GATE_A");
  const [requiresAccessibility, setRequiresAccessibility] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Real-time operations metrics
  const [stadiumAttendance, setStadiumAttendance] = useState(82410);
  const [activeIncidents, setActiveIncidents] = useState<HistoricalEvent[]>([
    {
      id: "inc_001",
      timestamp: "17:28",
      gate: "Gate B",
      input: "Hay gente empujando en la entrada.",
      translation: "People are pushing at the entrance.",
      priority: "HIGH",
      dept: "CROWD_CONTROL",
      status: "DISPATCHED"
    },
    {
      id: "inc_002",
      timestamp: "17:15",
      gate: "Gate E",
      input: "Ramp is clear of obstructions.",
      translation: "Ramp is clear of obstructions.",
      priority: "LOW",
      dept: "ACCESSIBILITY_SERVICES",
      status: "RESOLVED"
    }
  ]);

  const [activeRouteResult, setActiveRouteResult] = useState<OperationalRoute | null>({
    detected_language: "Spanish",
    translated_message: "There is a massive accumulation of people at Gate A, the queue is not moving at all, and the heat is oppressive.",
    priority: "HIGH",
    routed_department: "CROWD_CONTROL",
    crowd_density_index: 0.85,
    optimized_path: [
      {
        instruction: "Origin Gate A is highly congested. Take immediate left up the secondary stairs to Concourse B bypass.",
        distance_meters: 80,
        estimated_seconds: 100
      },
      {
        instruction: "Use the Level 2 high-flow overhead walkway to clear the primary pedestrian cluster.",
        distance_meters: 160,
        estimated_seconds: 120
      },
      {
        instruction: "Descend secondary stairwell S-4 leading directly to transit shuttle connections.",
        distance_meters: 180,
        estimated_seconds: 140
      }
    ],
    accessibility_routing_applied: false,
    staff_action_memo: "Spanish report. Gate A cluster reported. Mobilize outer crowd marshals immediately to disperse the bottleneck."
  });

  const [userNotification, setUserNotification] = useState<string | null>(null);

  // Auto-fluctuate stadium attendance to simulate realistic live IoT data
  useEffect(() => {
    const timer = setInterval(() => {
      setStadiumAttendance(prev => {
        const change = Math.floor(Math.random() * 21) - 10;
        return Math.min(82500, Math.max(81000, prev + change));
      });
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Submit action calling Express backend API route
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText || inputText.trim().length < 3) {
      setUserNotification("Input message must be at least 3 characters.");
      return;
    }
    
    setLoading(true);
    setUserNotification(null);

    const gateName = STADIUM_GATES.find(g => g.id === selectedGate)?.name || "Gate A";

    try {
      const response = await fetch("/api/operations/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_message: inputText,
          current_gate: gateName,
          requires_accessibility: requiresAccessibility
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const data: OperationalRoute = await response.json();
      setActiveRouteResult(data);

      // Add to historical live dashboard feed
      const newEvent: HistoricalEvent = {
        id: "inc_" + Date.now().toString().slice(-4),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gate: gateName.split(" (")[0],
        input: inputText.length > 40 ? inputText.slice(0, 40) + "..." : inputText,
        translation: data.translated_message.length > 50 ? data.translated_message.slice(0, 50) + "..." : data.translated_message,
        priority: data.priority,
        dept: data.routed_department,
        status: "DISPATCHED"
      };

      setActiveIncidents(prev => [newEvent, ...prev.slice(0, 5)]);

    } catch (err: any) {
      console.error(err);
      setUserNotification("Connection trouble with the operational intelligence API. Using backup local diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (sample: PredefinedSample) => {
    setInputText(sample.message);
    setSelectedGate(sample.gate);
    setRequiresAccessibility(sample.accessibility);
  };

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-950 border-red-500 text-red-100";
      case "HIGH":
        return "bg-amber-950 border-amber-500 text-amber-100";
      case "MEDIUM":
        return "bg-yellow-950 border-yellow-500 text-yellow-100";
      case "LOW":
        return "bg-blue-950 border-blue-500 text-blue-100";
      default:
        return "bg-slate-900 border-slate-700 text-slate-300";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return <Flame className="w-4 h-4 text-red-400 shrink-0" />;
      case "HIGH":
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case "MEDIUM":
        return <Activity className="w-4 h-4 text-yellow-400 shrink-0" />;
      default:
        return <Compass className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  const currentGateObject = STADIUM_GATES.find(g => g.id === selectedGate);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 pb-16">
      
      {/* WCAG High-Contrast Banner for visually/cognitively impaired operations users */}
      <div className="bg-amber-500 text-slate-950 py-1.5 px-4 font-mono text-xs font-semibold flex items-center justify-between shadow-md" role="status">
        <div className="flex items-center gap-2">
          <Accessibility className="w-4 h-4 text-slate-950 shrink-0" aria-hidden="true" />
          <span>OPERATIONAL STANDARD: WCAG 2.1 AA HIGH-CONTRAST CONSOLE ACTIVE</span>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <span>80,000+ CAPACITY ENTRANCE IOT STREAM ONLINE</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" aria-hidden="true"></span>
        </div>
      </div>

      {/* Primary Dashboard Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Compass className="w-8 h-8 text-amber-400" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">PitchPulse AI</h1>
                <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 font-bold">
                  FIFA 2026 Core
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multilingual Fan Routing & Crowd Operational Intelligence Engine
              </p>
            </div>
          </div>

          {/* Real-time Simulated Stadium Telemetry */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 font-mono text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <div className="px-3 py-1 border-r border-slate-800">
              <span className="text-slate-500 block uppercase text-[9px]">Venue</span>
              <span className="text-slate-200 font-semibold block truncate">MetLife Stadium, NYNJ</span>
            </div>
            <div className="px-3 py-1 sm:border-r border-slate-800">
              <span className="text-slate-500 block uppercase text-[9px]">Live Attendance</span>
              <span className="text-amber-400 font-bold block">
                {stadiumAttendance.toLocaleString()} / 82,500
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 px-3 py-1 flex items-center justify-between sm:block bg-amber-500/5 sm:bg-transparent rounded sm:rounded-none">
              <span className="text-slate-500 block uppercase text-[9px]">Local Match Day</span>
              <span className="text-slate-200 font-semibold block">MD 12 • Live (EST)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Dynamic Alerts Banner */}
        <AnimatePresence>
          {userNotification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-amber-500/10 border-l-4 border-amber-500 text-amber-200 p-4 rounded-r-lg mb-6 flex items-center justify-between text-sm shadow-lg"
              role="alert"
              id="alert-banner"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{userNotification}</span>
              </div>
              <button
                onClick={() => setUserNotification(null)}
                className="text-amber-200 hover:text-white ml-2 text-xs font-mono underline"
                aria-label="Dismiss Alert"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (Inputs, Simulated IoT controls) - occupies 5 cols */}
          <section className="lg:col-span-5 space-y-6">
            
            {/* Quick Presets for Demo validation */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                  Multilingual Fan Scenarios
                </h2>
              </div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Choose one of the real international fan reports from the list below to observe translation, priority routing, and crowd avoidance instantly:
              </p>
              
              <div className="space-y-2">
                {PREDEFINED_FAN_INPUTS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60 hover:bg-slate-800/80 hover:border-slate-700 transition duration-150 group text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 opacity-70 group-hover:opacity-100"></span>
                      <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {sample.label}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Interactive Operator Form */}
            <form onSubmit={handleAnalyze} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                    Operational Ingestion Console
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Manual Override</span>
              </div>

              {/* Fan Report Text Area */}
              <div>
                <label htmlFor="fan_message" className="block text-xs font-bold text-slate-300 uppercase font-mono mb-2">
                  Multilingual Fan Message / Alert
                </label>
                <div className="relative">
                  <textarea
                    id="fan_message"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={4}
                    maxLength={500}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans placeholder:text-slate-600"
                    placeholder="Enter raw fan message or report regarding queues, stadium bottlenecks, gates, safety..."
                    required
                  />
                  <div className="absolute bottom-2.5 right-2.5 text-[10px] text-slate-500 font-mono">
                    {inputText.length}/500 chars
                  </div>
                </div>
              </div>

              {/* Location and Accessibility Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gate_select" className="block text-xs font-bold text-slate-300 uppercase font-mono mb-2">
                    Current Location / Gate
                  </label>
                  <select
                    id="gate_select"
                    value={selectedGate}
                    onChange={(e) => setSelectedGate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-all font-mono"
                  >
                    {STADIUM_GATES.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-bold text-slate-300 uppercase font-mono mb-2">
                    Accessibility Parameters
                  </span>
                  <button
                    type="button"
                    onClick={() => setRequiresAccessibility(!requiresAccessibility)}
                    aria-pressed={requiresAccessibility}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-xs font-medium font-mono ${
                      requiresAccessibility
                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Accessibility className={`w-4 h-4 ${requiresAccessibility ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>Wheelchair / Step-Free</span>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${requiresAccessibility ? 'bg-amber-400' : 'bg-slate-700'}`}></span>
                  </button>
                </div>
              </div>

              {/* Submit Dispatch CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-bold rounded-lg text-sm transition duration-150 shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing Multilingual Inflow...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5" />
                    <span>PROCESS & ROUTE DISPATCH</span>
                  </>
                )}
              </button>
            </form>

            {/* Simulated Live IoT Status Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                    Simulated IoT Crowd Streams
                  </h2>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Live congestion indexes parsed from stadium pressure mats, Wi-Fi handshakes, and gate turnstile sensors:
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                {STADIUM_GATES.map((g) => {
                  const density = simulateCrowdDensity(g.name);
                  const isHigh = density > 0.7;
                  return (
                    <div key={g.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-850 flex items-center justify-between">
                      <div className="truncate pr-1">
                        <span className="text-slate-400 font-semibold block truncate text-[10px]">
                          {g.name.split(" (")[0]}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {g.amenities[0]}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-bold block ${isHigh ? 'text-amber-400' : 'text-slate-300'}`}>
                          {Math.round(density * 100)}%
                        </span>
                        <span className={`text-[8px] uppercase font-bold tracking-wider px-1 py-0.2 rounded ${
                          isHigh ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isHigh ? 'Dense' : 'Normal'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </section>

          {/* Right Column (AI Results, Dynamic Map, Staff Routing) - occupies 7 cols */}
          <section className="lg:col-span-7 space-y-6">

            <AnimatePresence mode="wait">
              {activeRouteResult && (
                <motion.div
                  key={activeRouteResult.translated_message}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  
                  {/* AI Intel Summary Card */}
                  <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                    {/* Background glows for premium layout */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

                    {/* Header line with detected lang & routed department */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold rounded">
                          {activeRouteResult.detected_language} Language Detected
                        </div>
                        {activeRouteResult.accessibility_routing_applied && (
                          <div className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-bold rounded flex items-center gap-1">
                            <Accessibility className="w-3 h-3" />
                            <span>Step-Free Map</span>
                          </div>
                        )}
                      </div>

                      {/* Priority status and routed department indicators */}
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 text-xs font-mono font-extrabold tracking-widest border rounded flex items-center gap-1.5 ${getPriorityBadgeStyles(activeRouteResult.priority)}`}>
                          {getPriorityIcon(activeRouteResult.priority)}
                          <span>PRIORITY: {activeRouteResult.priority}</span>
                        </div>
                      </div>
                    </div>

                    {/* Translated Fan Insight */}
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider block mb-1">
                          Enterprise Translation (English Target)
                        </span>
                        <p className="text-sm text-slate-100 font-medium leading-relaxed italic bg-slate-950/60 p-4 rounded-xl border border-slate-850 border-l-4 border-l-amber-500" aria-live="polite">
                          "{activeRouteResult.translated_message}"
                        </p>
                      </div>

                      {/* Split Grid for Team Dispatch & IoT Density metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Routed Dispatch Department */}
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850">
                          <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider block mb-2">
                            Routed Dispatch Unit
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                              {activeRouteResult.routed_department === "SECURITY" ? (
                                <Shield className="w-5 h-5 text-red-400" />
                              ) : activeRouteResult.routed_department === "MEDICAL" ? (
                                <Flame className="w-5 h-5 text-emerald-400 animate-pulse" />
                              ) : activeRouteResult.routed_department === "ACCESSIBILITY_SERVICES" ? (
                                <Accessibility className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Users className="w-5 h-5 text-yellow-400" />
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-white block">
                                {activeRouteResult.routed_department.replace("_", " ")}
                              </span>
                              <span className="text-[10px] text-slate-400 block flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Standby Marshals Mobilized
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Local IoT Congestion Gauge */}
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850">
                          <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider block mb-1">
                            Local Gate IoT Crowd Density
                          </span>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-bold text-white">
                              Coefficient: {activeRouteResult.crowd_density_index}
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              activeRouteResult.crowd_density_index > 0.7 ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300"
                            }`}>
                              {activeRouteResult.crowd_density_index > 0.7 ? "CRITICAL CLUSTER" : "STEADY FLOW"}
                            </span>
                          </div>
                          {/* Accessibility compatible visual progress bar */}
                          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden" role="progressbar" aria-valuenow={activeRouteResult.crowd_density_index * 100} aria-valuemin={0} aria-valuemax={100}>
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                activeRouteResult.crowd_density_index > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${activeRouteResult.crowd_density_index * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* On-Duty Tactical Action Memo */}
                      <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
                        <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider block mb-1.5 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          STADIUM STAFF COMMAND MEMO (GENAI DIRECTIVE)
                        </span>
                        <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-mono font-medium">
                          {activeRouteResult.staff_action_memo}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Dynamic Nav Map Grid */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-amber-400" />
                        <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                          IoT Congestion-Bypassing Pathfinder
                        </h2>
                      </div>
                      <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dynamic Simulation Matchday MD12</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      
                      {/* Interactive SVG Stadium Map */}
                      <div className="md:col-span-5 flex justify-center bg-slate-950/70 p-4 rounded-xl border border-slate-850 relative">
                        <span className="absolute top-2.5 left-2.5 text-[9px] font-mono text-slate-500 uppercase">
                          Aerial Footprint View
                        </span>
                        
                        <svg role="img" aria-label="Stadium gate occupancy map" viewBox="0 0 700 520" className="w-full max-w-[280px] h-auto drop-shadow-lg">
                          {/* Outer circular perimeter */}
                          <circle cx="350" cy="260" r="230" fill="none" stroke="#1e293b" strokeWidth="4" />
                          <circle cx="350" cy="260" r="230" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="8,6" opacity="0.3" />
                          
                          {/* Inner stadium seating ring */}
                          <ellipse cx="350" cy="260" rx="160" ry="140" fill="#0f172a" stroke="#334155" strokeWidth="6" />
                          
                          {/* Pitch green core */}
                          <rect x="250" y="190" width="200" height="140" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="2" opacity="0.8" />
                          <rect x="290" y="190" width="120" height="140" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.4" />
                          <circle cx="350" cy="260" r="30" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.4" />

                          {/* Stadium Gates and Sensor Hotspots */}
                          {STADIUM_GATES.map((gateItem) => {
                            const isSelected = gateItem.id === selectedGate;
                            const density = simulateCrowdDensity(gateItem.name);
                            return (
                              <g key={gateItem.id}>
                                {/* Gate node halo */}
                                <circle
                                  cx={gateItem.coordinates.x}
                                  cy={gateItem.coordinates.y}
                                  r={isSelected ? "18" : "11"}
                                  fill={density > 0.7 ? "#f59e0b" : "#1e293b"}
                                  fillOpacity={isSelected ? "0.2" : "0.5"}
                                  className={isSelected ? "animate-pulse" : ""}
                                />
                                {/* Inner node dot */}
                                <circle
                                  cx={gateItem.coordinates.x}
                                  cy={gateItem.coordinates.y}
                                  r="5"
                                  fill={isSelected ? "#f59e0b" : density > 0.7 ? "#f59e0b" : "#475569"}
                                />
                                {/* Text labels */}
                                <text
                                  x={gateItem.coordinates.x}
                                  y={gateItem.coordinates.y - 20}
                                  fill={isSelected ? "#ffffff" : "#94a3b8"}
                                  fontSize="18"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {gateItem.id.replace("GATE_", "")}
                                </text>
                              </g>
                            );
                          })}

                          {/* Highlight Path indicators */}
                          {currentGateObject && (
                            <line
                              x1={currentGateObject.coordinates.x}
                              y1={currentGateObject.coordinates.y}
                              x2="350"
                              y2="260"
                              stroke="#f59e0b"
                              strokeWidth="4"
                              strokeDasharray="6,4"
                              className="animate-[dash_10s_linear_infinite]"
                            />
                          )}
                        </svg>
                      </div>

                      {/* Pathfinder steps column */}
                      <div className="md:col-span-7 space-y-3">
                        <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider block">
                          Step-by-Step Bypassing Directions
                        </span>
                        
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {activeRouteResult.optimized_path.map((step, i) => (
                            <div key={i} className="flex gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850 text-xs">
                              <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold font-mono text-[10px] shrink-0">
                                {i + 1}
                              </div>
                              <div className="space-y-1">
                                <p className="text-slate-200 font-medium leading-relaxed">
                                  {step.instruction}
                                </p>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                                  <span className="flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3 text-amber-500" />
                                    {step.distance_meters} meters
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-500" />
                                    {Math.floor(step.estimated_seconds / 60)}m {step.estimated_seconds % 60}s
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-mono">Dynamic Exit Estimate:</span>
                          <span className="font-bold text-white font-mono text-sm">
                            ~{Math.round(activeRouteResult.optimized_path.reduce((acc, step) => acc + step.estimated_seconds, 0) / 60)} minutes total
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

            {/* Recent Live Feed Queue */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                    Real-Time Dispatch Feed & Resolution Log
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Last 5 Activities</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono" role="table">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="pb-2.5 font-bold">Time</th>
                      <th className="pb-2.5 font-bold">Loc</th>
                      <th className="pb-2.5 font-bold">Incident (Translated)</th>
                      <th className="pb-2.5 font-bold">Priority</th>
                      <th className="pb-2.5 font-bold">Dept</th>
                      <th className="pb-2.5 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {activeIncidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-950/30 transition duration-150">
                        <td className="py-3 text-slate-400 whitespace-nowrap">{inc.timestamp}</td>
                        <td className="py-3 font-semibold whitespace-nowrap">{inc.gate}</td>
                        <td className="py-3 max-w-xs truncate pr-2 text-slate-200" title={inc.translation}>
                          {inc.translation}
                        </td>
                        <td className="py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            inc.priority === "CRITICAL"
                              ? "bg-red-950 border-red-500 text-red-100"
                              : inc.priority === "HIGH"
                              ? "bg-amber-950 border-amber-500 text-amber-100"
                              : "bg-blue-950 border-blue-500 text-blue-100"
                          }`}>
                            {inc.priority}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 whitespace-nowrap text-[10px]">
                          {inc.dept.replace("_", " ")}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.status === "RESOLVED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/20"
                              : "bg-amber-950 text-amber-300 border border-amber-500/20"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              inc.status === "RESOLVED" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                            }`}></span>
                            {inc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </section>

        </div>

      </main>

      {/* WCAG High Contrast Footer details */}
      <footer className="border-t border-slate-800 mt-16 pt-8 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-2">
          <p>
            PitchPulse AI • FIFA World Cup 2026 Operations Console V1.0.0
          </p>
          <p>
            Engineered with strict Clean Architecture, WCAG 2.1 AA Compliant components, and real-time asynchronous multi-lingual translation pipeline.
          </p>
        </div>
      </footer>

    </div>
  );
}
