

# Synapse — Developer Platform Frontend

## Overview
Build the developer-facing web platform for Synapse's Universal Action API. This is the control center where developers define, test, monitor, and manage their web automation actions.

---

## Page 1: Landing / Home
- Clean, developer-focused hero explaining "Give your AI agents hands"
- Three value props (Resilient, Simple API, Visual Intelligence)
- Code snippet showing a sample API call and JSON response
- CTA to enter the dashboard / playground

## Page 2: Action Playground
The core feature — an interactive environment for building and testing actions.

- **Action Builder Panel (left side):**
  - Form-based step editor: Add steps like "Navigate to URL", "Click element", "Type text", "Extract data", "Wait for element"
  - Each step has configurable fields (URL, selector hint, text value, timeout)
  - Drag-and-drop reordering of steps
  - Visual step flow showing the action sequence

- **Schema / Code Output (right side):**
  - Live-generated JSON action definition as users build steps
  - Toggle between JSON view and TypeScript code view
  - Copy-to-clipboard for the generated definition
  - Zod schema validation status indicator (green/red)

- **Test Execution Panel (bottom):**
  - "Run Action" button that would POST to the Synapse API
  - Mock response viewer showing `{"status": "success", "cart_total": "$29.99"}` style results
  - Execution timeline with step-by-step status (pending → running → success/failed)
  - Error details panel for failed steps

## Page 3: Action Library
- Grid/list of saved action definitions
- Each card shows: action name, target site, step count, last run status, last modified
- Search and filter by status, site, or tag
- Click to open in Playground for editing

## Page 4: Execution Monitor
- Real-time (mock) feed of action executions
- Each execution row: action name, status badge, duration, timestamp
- Expandable detail view showing step-by-step log with timing
- Filter by status (success, failed, running)

## Page 5: Settings / API Keys
- API key display with copy button (masked by default)
- Generate / revoke API keys
- Webhook URL configuration
- Usage stats (requests this month, success rate)

---

## Design Direction
- Dark theme with accent colors (electric blue / cyan) — developer tool aesthetic
- Monospace fonts for code/JSON displays
- Clean, minimal UI inspired by tools like Linear, Vercel, and Postman
- Responsive but desktop-first (this is a developer tool)

## Data Approach
- All data stored in local state / localStorage for the POC (no backend needed)
- Mock API responses for the test execution flow
- Ready to connect to a real Synapse backend API later

