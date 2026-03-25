# Cyber Defense Lab Section — Design

## Overview

A new interactive "Cyber Defense Lab" section on the homepage, placed between Skills and Education. It's a simulated network monitoring dashboard that visually demonstrates cybersecurity knowledge through a living visualization — targeting recruiters/hiring managers who want to see technical depth.

## Audience & Goals

- **Primary audience**: Recruiters and hiring managers
- **Goal**: Immediate wow factor — something memorable that sticks after they leave
- **Tone**: Technical and impressive, not gimmicky

## Section Layout

- Placed between Skills and Education on the homepage
- Uses the same section pattern: uppercase tracking title "Cyber Defense Lab" with 1px divider
- Content lives inside a single `rounded-2xl` card (`neutral-900` bg, `neutral-800` border)
- Faint grid-dot overlay on card background for ops-center aesthetic
- Desktop: two panels side by side (60/40 split)
- Mobile: stacked vertically (graph on top, feed below)

## Component 1: Network Graph (left, ~60%)

An HTML `<canvas>` visualization of a network topology.

### Nodes & Layout

- ~8-12 nodes in a predefined topology: internet cloud (left) → firewall (center) → internal servers/endpoints (right)
- Node style: small circles (6-8px radius) with soft glow/shadow matching their color
- No icons — tooltip labels + topology position convey meaning
- Subtle grid-line background suggesting a coordinate plane

### Colors

- Healthy/active nodes: emerald
- Idle nodes: neutral-400
- Threat particles: red
- Alert state: amber

### Animations

- **Idle**: nodes pulse softly, edges have small emerald dots traveling along them (normal data flow)
- **Threat**: every 4-6 seconds, a red particle travels from internet node toward an internal node. At the firewall, it flashes and turns emerald ("blocked"). Occasionally one gets through to an internal node and turns amber ("detected & quarantined").
- Uses `requestAnimationFrame`, pauses when section is out of viewport (Intersection Observer)

### Interaction

- Hover on a node: tooltip with label + stat (e.g., "Firewall — 247 threats blocked")
- Mobile: tappable nodes

## Component 2: Threat Feed (right, ~40%)

A scrolling terminal-style log of simulated security events.

### Visual Style

- Terminal window with header bar (three colored dots + title `threat-monitor.log`)
- Monospace font (Geist Mono)
- Dark background, slight inner shadow
- Blinking cursor at top

### Content

- Pool of ~30 pre-written log entries tagged by severity:
  - `[OK]` — emerald
  - `[INFO]` — neutral
  - `[ALERT]` — amber
  - `[BLOCKED]` — red
- Format: `[HH:MM:SS] [SEVERITY] message`
- Examples:
  - `[BLOCKED] Brute force attempt from 192.168.x.x`
  - `[ALERT] Port scan detected on :443`
  - `[OK] TLS handshake verified`

### Behavior

- New entry appears every 2-3 seconds, fades in at top
- Keeps ~8-10 visible entries, oldest fade out at bottom
- Synchronized with graph — threat animations trigger corresponding log entries
- Timestamps use a running clock from page load

## Component Architecture

- `CyberLabSection.tsx` — main section wrapper (client component)
- `NetworkGraph.tsx` — canvas-based graph with `requestAnimationFrame` loop
- `ThreatFeed.tsx` — scrolling log component

## Responsive Behavior

- `lg+`: side-by-side (60/40)
- `md`: side-by-side but tighter
- `sm`: stacked vertically, graph constrained to ~300px height

## Performance

- No external dependencies — pure canvas API + React state
- Animation pauses when out of viewport via Intersection Observer
- Minimal bundle impact

## Constraints

- Balance impressive visuals with reasonable load times
- No heavy libraries (no Three.js, no D3) — custom canvas code only
- Must look tasteful, not fake — clean aesthetic over flashy
