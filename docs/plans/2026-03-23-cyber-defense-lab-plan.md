# Cyber Defense Lab Section — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive "Cyber Defense Lab" section to the homepage with a canvas-based network graph visualization and a live threat feed, placed between Skills and Education.

**Architecture:** Three new client components — `CyberLabSection` (wrapper), `NetworkGraph` (canvas renderer), `ThreatFeed` (scrolling log). No external dependencies. Canvas animation uses `requestAnimationFrame` and pauses when out of viewport via Intersection Observer. The threat events are synchronized between graph and feed.

**Tech Stack:** React 19, HTML Canvas API, TypeScript, Tailwind CSS v4

**Note:** Do not commit changes. Keep all work local and unstaged.

---

### Task 1: Create ThreatFeed component

**Files:**
- Create: `src/components/cyber-lab/ThreatFeed.tsx`

**Step 1: Create the threat event type and log data pool**

The shared event type and the log pool live in this component file for now. The `ThreatEvent` type is exported so `CyberLabSection` can pass events down.

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

export type ThreatEvent = {
  id: number;
  severity: "OK" | "INFO" | "ALERT" | "BLOCKED";
  message: string;
  timestamp: Date;
};

const LOG_POOL: { severity: ThreatEvent["severity"]; message: string }[] = [
  { severity: "BLOCKED", message: "Brute force attempt from 203.0.113.42" },
  { severity: "OK", message: "TLS handshake verified on :443" },
  { severity: "ALERT", message: "Port scan detected from 198.51.100.17" },
  { severity: "INFO", message: "Firewall rules reloaded successfully" },
  { severity: "BLOCKED", message: "SQL injection attempt on /api/auth" },
  { severity: "OK", message: "Certificate rotation completed" },
  { severity: "ALERT", message: "Unusual outbound traffic on :8080" },
  { severity: "BLOCKED", message: "SSH brute force from 192.0.2.88" },
  { severity: "INFO", message: "DNS resolution cache refreshed" },
  { severity: "OK", message: "Intrusion detection signatures updated" },
  { severity: "BLOCKED", message: "XSS payload blocked on /search" },
  { severity: "ALERT", message: "Failed auth attempts exceeded threshold" },
  { severity: "INFO", message: "Network segment isolation verified" },
  { severity: "OK", message: "VPN tunnel integrity check passed" },
  { severity: "BLOCKED", message: "Directory traversal attempt on /files" },
  { severity: "ALERT", message: "Anomalous DNS query pattern detected" },
  { severity: "OK", message: "WAF rules synchronized across nodes" },
  { severity: "INFO", message: "Backup encryption keys rotated" },
  { severity: "BLOCKED", message: "Rate limit exceeded from 10.0.0.203" },
  { severity: "OK", message: "HSTS headers validated on all endpoints" },
  { severity: "ALERT", message: "Credential stuffing attempt detected" },
  { severity: "BLOCKED", message: "Malformed packet dropped from 172.16.0.5" },
  { severity: "INFO", message: "Geo-IP database updated to latest" },
  { severity: "OK", message: "mTLS peer certificate verified" },
  { severity: "BLOCKED", message: "Command injection blocked on /exec" },
  { severity: "ALERT", message: "Privilege escalation attempt in container" },
  { severity: "INFO", message: "Security audit log exported" },
  { severity: "OK", message: "DNSSEC validation passed" },
  { severity: "BLOCKED", message: "CSRF token mismatch rejected" },
  { severity: "OK", message: "Endpoint health check nominal" },
];
```

**Step 2: Build the ThreatFeed component**

```tsx
const SEVERITY_COLORS: Record<ThreatEvent["severity"], string> = {
  OK: "text-emerald-400",
  INFO: "text-neutral-400",
  ALERT: "text-amber-400",
  BLOCKED: "text-red-400",
};

const MAX_VISIBLE = 8;

export default function ThreatFeed({
  externalEvents,
}: {
  externalEvents: ThreatEvent[];
}) {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const nextIdRef = useRef(0);
  const poolIndexRef = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  // Add external events (from graph threat animations)
  useEffect(() => {
    if (externalEvents.length === 0) return;
    setEvents((prev) => [...externalEvents, ...prev].slice(0, MAX_VISIBLE));
  }, [externalEvents]);

  // Auto-generate ambient events
  useEffect(() => {
    const interval = setInterval(() => {
      const entry = LOG_POOL[poolIndexRef.current % LOG_POOL.length];
      poolIndexRef.current++;
      const event: ThreatEvent = {
        id: nextIdRef.current++,
        severity: entry.severity,
        message: entry.message,
        timestamp: new Date(),
      };
      setEvents((prev) => [event, ...prev].slice(0, MAX_VISIBLE));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour12: false });

  return (
    <div className="flex flex-col rounded-xl border border-neutral-800/60 bg-neutral-950/80 overflow-hidden h-full">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800/60 bg-neutral-900/50">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        <span className="ml-2 text-[11px] text-neutral-500 font-mono">
          threat-monitor.log
        </span>
      </div>

      {/* Log entries */}
      <div
        ref={feedRef}
        className="flex-1 px-4 py-3 font-mono text-xs space-y-1.5 overflow-hidden"
      >
        {/* Blinking cursor */}
        <span className="inline-block w-1.5 h-3.5 bg-emerald-400/70 animate-pulse" />

        {events.map((event, i) => (
          <div
            key={event.id}
            className="transition-all duration-500"
            style={{
              opacity: 1 - i * 0.08,
              animation: i === 0 ? "fade-in 0.4s ease-out" : undefined,
            }}
          >
            <span className="text-neutral-600">[{formatTime(event.timestamp)}]</span>{" "}
            <span className={SEVERITY_COLORS[event.severity]}>
              [{event.severity}]
            </span>{" "}
            <span className="text-neutral-300">{event.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Verify the file compiles**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npx tsc --noEmit --pretty 2>&1 | head -20`

---

### Task 2: Create NetworkGraph canvas component

**Files:**
- Create: `src/components/cyber-lab/NetworkGraph.tsx`

**Step 1: Define types and node layout**

```tsx
"use client";

import { useRef, useEffect, useCallback } from "react";

type Node = {
  id: string;
  label: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  type: "internet" | "firewall" | "server" | "endpoint";
  stat: string;
};

type Edge = {
  from: string;
  to: string;
};

type Particle = {
  edge: Edge;
  progress: number; // 0-1
  speed: number;
  color: string;
  isThreat: boolean;
  blocked: boolean;
};

type Tooltip = {
  x: number;
  y: number;
  label: string;
  stat: string;
} | null;

const NODES: Node[] = [
  { id: "internet", label: "Internet", x: 0.08, y: 0.5, type: "internet", stat: "External traffic source" },
  { id: "firewall", label: "Firewall", x: 0.35, y: 0.5, type: "firewall", stat: "247 threats blocked" },
  { id: "web", label: "Web Server", x: 0.62, y: 0.2, type: "server", stat: "Uptime: 99.97%" },
  { id: "api", label: "API Gateway", x: 0.62, y: 0.5, type: "server", stat: "1.2k req/min" },
  { id: "db", label: "Database", x: 0.62, y: 0.8, type: "server", stat: "Encrypted at rest" },
  { id: "ws1", label: "Workstation", x: 0.88, y: 0.15, type: "endpoint", stat: "Patch level: current" },
  { id: "ws2", label: "Dev Server", x: 0.88, y: 0.5, type: "endpoint", stat: "SSH keys rotated" },
  { id: "ws3", label: "Backup", x: 0.88, y: 0.85, type: "endpoint", stat: "Last backup: 2m ago" },
];

const EDGES: Edge[] = [
  { from: "internet", to: "firewall" },
  { from: "firewall", to: "web" },
  { from: "firewall", to: "api" },
  { from: "firewall", to: "db" },
  { from: "web", to: "ws1" },
  { from: "api", to: "ws2" },
  { from: "db", to: "ws3" },
];

const NODE_COLORS: Record<Node["type"], string> = {
  internet: "#a3a3a3",
  firewall: "#22c55e",
  server: "#22c55e",
  endpoint: "#22c55e",
};

const NODE_RADIUS: Record<Node["type"], number> = {
  internet: 8,
  firewall: 10,
  server: 7,
  endpoint: 6,
};
```

**Step 2: Build the canvas component with animation loop**

This is the main component. It renders nodes, edges, data-flow particles, and threat animations. It uses `requestAnimationFrame` and pauses offscreen.

```tsx
type OnThreatCallback = (blocked: boolean) => void;

export default function NetworkGraph({
  onThreat,
}: {
  onThreat: OnThreatCallback;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const tooltipRef = useRef<Tooltip>(null);
  const animFrameRef = useRef<number>(0);
  const isVisibleRef = useRef(true);
  const threatTimerRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const blockedCountRef = useRef(247);

  const getNodePos = useCallback(
    (node: Node, w: number, h: number) => ({
      x: node.x * w,
      y: node.y * h,
    }),
    []
  );

  const findNode = useCallback(
    (id: string) => NODES.find((n) => n.id === id)!,
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Intersection Observer — pause when offscreen
    const ioObserver = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          lastTimeRef.current = performance.now();
          animFrameRef.current = requestAnimationFrame(loop);
        }
      },
      { threshold: 0.1 }
    );
    ioObserver.observe(canvas);

    // Seed ambient particles
    for (const edge of EDGES) {
      particlesRef.current.push({
        edge,
        progress: Math.random(),
        speed: 0.15 + Math.random() * 0.1,
        color: "rgba(34,197,94,0.4)",
        isThreat: false,
        blocked: false,
      });
    }

    function spawnThreat() {
      // Threat travels from internet -> firewall
      particlesRef.current.push({
        edge: { from: "internet", to: "firewall" },
        progress: 0,
        speed: 0.25,
        color: "#ef4444",
        isThreat: true,
        blocked: false,
      });
    }

    function drawGrid() {
      ctx.strokeStyle = "rgba(115,115,115,0.06)";
      ctx.lineWidth = 1;
      const spacing = 30;
      for (let x = 0; x < w; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    function drawEdges() {
      for (const edge of EDGES) {
        const from = getNodePos(findNode(edge.from), w, h);
        const to = getNodePos(findNode(edge.to), w, h);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = "rgba(64,64,64,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function drawNodes(time: number) {
      for (const node of NODES) {
        const pos = getNodePos(node, w, h);
        const r = NODE_RADIUS[node.type];
        const color = NODE_COLORS[node.type];
        const pulse = 1 + Math.sin(time * 0.002 + node.x * 10) * 0.15;

        // Glow
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 2.5 * pulse, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          pos.x, pos.y, 0,
          pos.x, pos.y, r * 2.5 * pulse
        );
        gradient.addColorStop(0, color + "30");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fill();
      }
    }

    function updateParticles(dt: number) {
      const next: Particle[] = [];
      for (const p of particlesRef.current) {
        p.progress += p.speed * dt;
        if (p.progress >= 1) {
          if (p.isThreat && !p.blocked) {
            // Threat reached firewall — decide: block or alert
            const shouldBlock = Math.random() > 0.2; // 80% blocked
            if (shouldBlock) {
              blockedCountRef.current++;
              onThreat(true);
              // Flash effect handled by color change at firewall
            } else {
              // Threat passes through — spawn continuation to a random server
              const targets = ["web", "api", "db"];
              const target = targets[Math.floor(Math.random() * targets.length)];
              next.push({
                edge: { from: "firewall", to: target },
                progress: 0,
                speed: 0.3,
                color: "#f59e0b",
                isThreat: true,
                blocked: false,
              });
              onThreat(false);
            }
          }
          // Ambient particles loop
          if (!p.isThreat) {
            p.progress = 0;
            next.push(p);
          }
        } else {
          next.push(p);
        }
      }
      particlesRef.current = next;
    }

    function drawParticles() {
      for (const p of particlesRef.current) {
        const from = getNodePos(findNode(p.edge.from), w, h);
        const to = getNodePos(findNode(p.edge.to), w, h);
        const x = from.x + (to.x - from.x) * p.progress;
        const y = from.y + (to.y - from.y) * p.progress;
        const r = p.isThreat ? 4 : 2;

        // Glow
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        gradient.addColorStop(0, p.color + "60");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    }

    function drawTooltip() {
      const tt = tooltipRef.current;
      if (!tt) return;

      const padding = 8;
      ctx.font = "12px var(--font-geist-mono), monospace";
      const labelWidth = ctx.measureText(tt.label).width;
      ctx.font = "10px var(--font-geist-mono), monospace";
      const statWidth = ctx.measureText(tt.stat).width;
      const boxW = Math.max(labelWidth, statWidth) + padding * 2;
      const boxH = 40;
      const boxX = tt.x - boxW / 2;
      const boxY = tt.y - boxH - 16;

      ctx.fillStyle = "rgba(23,23,23,0.9)";
      ctx.strokeStyle = "rgba(64,64,64,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ededed";
      ctx.font = "12px var(--font-geist-mono), monospace";
      ctx.fillText(tt.label, boxX + padding, boxY + 16);

      ctx.fillStyle = "#22c55e";
      ctx.font = "10px var(--font-geist-mono), monospace";
      ctx.fillText(tt.stat, boxX + padding, boxY + 30);
    }

    function loop(time: number) {
      if (!isVisibleRef.current) return;

      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      // Threat timer
      threatTimerRef.current += dt;
      if (threatTimerRef.current > 4 + Math.random() * 2) {
        threatTimerRef.current = 0;
        spawnThreat();
      }

      ctx.clearRect(0, 0, w, h);
      drawGrid();
      drawEdges();
      drawParticles();
      drawNodes(time);
      updateParticles(dt);
      drawTooltip();

      animFrameRef.current = requestAnimationFrame(loop);
    }

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    // Mouse hover for tooltips
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let found: Tooltip = null;
      for (const node of NODES) {
        const pos = getNodePos(node, w, h);
        const dist = Math.hypot(mx - pos.x, my - pos.y);
        if (dist < NODE_RADIUS[node.type] * 3) {
          const stat =
            node.id === "firewall"
              ? `${blockedCountRef.current} threats blocked`
              : node.stat;
          found = { x: pos.x, y: pos.y, label: node.label, stat };
          break;
        }
      }
      tooltipRef.current = found;
      canvas.style.cursor = found ? "pointer" : "default";
    };

    const handleMouseLeave = () => {
      tooltipRef.current = null;
    };

    // Touch support for mobile
    const handleTouch = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;

      for (const node of NODES) {
        const pos = getNodePos(node, w, h);
        const dist = Math.hypot(mx - pos.x, my - pos.y);
        if (dist < NODE_RADIUS[node.type] * 4) {
          const stat =
            node.id === "firewall"
              ? `${blockedCountRef.current} threats blocked`
              : node.stat;
          tooltipRef.current = { x: pos.x, y: pos.y, label: node.label, stat };
          return;
        }
      }
      tooltipRef.current = null;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("touchstart", handleTouch, { passive: true });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      ioObserver.disconnect();
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("touchstart", handleTouch);
    };
  }, [getNodePos, findNode, onThreat]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full min-h-[300px]"
      aria-label="Interactive network topology visualization showing a simulated security operations dashboard"
    />
  );
}
```

**Step 3: Verify the file compiles**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npx tsc --noEmit --pretty 2>&1 | head -20`

---

### Task 3: Create CyberLabSection wrapper component

**Files:**
- Create: `src/components/cyber-lab/CyberLabSection.tsx`

**Step 1: Build the wrapper that coordinates graph and feed**

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import NetworkGraph from "./NetworkGraph";
import ThreatFeed, { type ThreatEvent } from "./ThreatFeed";

const THREAT_MESSAGES = {
  blocked: [
    "Malicious payload intercepted at perimeter",
    "Brute force attempt blocked by firewall",
    "Suspicious packet dropped at ingress",
    "Known exploit signature matched and rejected",
  ],
  alert: [
    "Anomalous traffic reached internal segment",
    "Potential intrusion detected — isolating host",
    "Unrecognized connection on internal subnet",
  ],
};

export default function CyberLabSection() {
  const [externalEvents, setExternalEvents] = useState<ThreatEvent[]>([]);
  const eventIdRef = useRef(1000);

  const handleThreat = useCallback((blocked: boolean) => {
    const pool = blocked ? THREAT_MESSAGES.blocked : THREAT_MESSAGES.alert;
    const message = pool[Math.floor(Math.random() * pool.length)];
    const event: ThreatEvent = {
      id: eventIdRef.current++,
      severity: blocked ? "BLOCKED" : "ALERT",
      message,
      timestamp: new Date(),
    };
    setExternalEvents((prev) => [event, ...prev].slice(0, 3));
  }, []);

  return (
    <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/30 p-1 overflow-hidden">
      {/* Faint grid overlay for ops-center aesthetic */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(115,115,115,0.06) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="flex flex-col lg:flex-row gap-1 p-2">
          {/* Network Graph — 60% */}
          <div className="lg:w-[60%] h-[300px] lg:h-[380px] rounded-lg overflow-hidden bg-neutral-950/50">
            <NetworkGraph onThreat={handleThreat} />
          </div>

          {/* Threat Feed — 40% */}
          <div className="lg:w-[40%] h-[300px] lg:h-[380px]">
            <ThreatFeed externalEvents={externalEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify all three files compile**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npx tsc --noEmit --pretty 2>&1 | head -20`

---

### Task 4: Integrate CyberLabSection into HomeContent

**Files:**
- Modify: `src/components/HomeContent.tsx`

**Step 1: Add "cyber-lab" to the SectionId type and sections array**

In `src/components/HomeContent.tsx`:

Update the `SectionId` type (line ~27):
```ts
type SectionId =
  | "about"
  | "experience"
  | "projects"
  | "skills"
  | "cyber-lab"
  | "education"
  | "resume"
  | "contact";
```

Update the `sections` array inside `HomeContent` (line ~122) — add the new entry between "skills" and "education":
```ts
{ id: "skills", label: "SKILLS" },
{ id: "cyber-lab", label: "CYBER LAB" },
{ id: "education", label: "EDUCATION" },
```

**Step 2: Add the import and section JSX**

Add import at top of file:
```ts
import CyberLabSection from "./cyber-lab/CyberLabSection";
```

Add the section between Skills and Education in the JSX (after the `{/* ─── SKILLS ─── */}` section, before `{/* ─── EDUCATION & CERTIFICATIONS ─── */}`):

```tsx
{/* ─── CYBER DEFENSE LAB ─── */}
<Section id="cyber-lab" title="CYBER DEFENSE LAB">
  <CyberLabSection />
</Section>
```

**Step 3: Verify it compiles and renders**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npx tsc --noEmit --pretty 2>&1 | head -20`
Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npm run build 2>&1 | tail -20`

---

### Task 5: Add NavBar entry for Cyber Lab

**Files:**
- Modify: `src/components/NavBar.tsx`

**Step 1: Check the NavBar's section links**

Read `src/components/NavBar.tsx` and find the navigation items array. Add a "Cyber Lab" entry that scrolls to `#cyber-lab`, positioned between "Skills" and "Education" to match the homepage order.

**Step 2: Verify the full build passes**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npm run build 2>&1 | tail -20`

---

### Task 6: Visual polish and QA

**Files:**
- Possibly modify: `src/components/cyber-lab/NetworkGraph.tsx`, `src/components/cyber-lab/ThreatFeed.tsx`, `src/components/cyber-lab/CyberLabSection.tsx`

**Step 1: Run the dev server and visually inspect**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npm run dev`

Check:
- Section appears between Skills and Education
- Canvas renders with nodes and edges
- Ambient data-flow particles move along edges
- Threat particles spawn every 4-6 seconds (red dots from internet → firewall)
- Blocked threats flash and disappear at firewall
- Occasional amber particles pass through to servers
- Threat feed shows log entries scrolling in
- Graph threat events appear in the feed
- Hover on nodes shows tooltips
- Responsive: stacks on mobile, side-by-side on desktop
- NavBar "Cyber Lab" link scrolls to the section
- Animation pauses when scrolled away (check with browser profiler)

**Step 2: Fix any visual or functional issues found**

Adjust spacing, colors, timing, or layout as needed based on visual inspection.

**Step 3: Final build verification**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors.
