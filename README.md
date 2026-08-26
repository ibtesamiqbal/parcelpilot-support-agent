# ParcelPilot Support Agent

A customer-facing AI support chatbot for ParcelPilot, plus an internal dashboard that flags recurring or urgent issues before a customer has to ask about them.

Built for the CalQuity AI Engineer assessment.

---

## Features

- **Customer Support Chat:** Logged-in customer account context (`Northstar Logistics`, `LumenWorks`, `Beacon Retail`, `Axis Labs`). Answers questions on cancellations, service credits, SLAs, and order details.
- **Three Core Tools:**
  1. `search_documents`: Search policies, SOPs, product docs, and customer-specific contract overrides (`contract_override` > `sop` > `general_policy` > `product_doc`).
  2. `query_data`: Account-scoped structured data lookups and SLA/credit calculations.
  3. `create_action`: 2-step confirmation state machine (`confirmed: false` -> `confirmed: true`) with interactive UI confirmation dialog and server-side staging guard.
- **Proactive Issue Detection Dashboard (Bonus Problem 1):** Internal ops view displaying SLA risk breaches, overdue carrier pickups (`ORD-2002`), recurring same-customer issues (`KI-208`), and active P1 outage warnings.

---

## Setup & Running Locally (Under 3 Minutes)

### Requirements
- **Node.js** 18+

### 1. Installation
```bash
git clone <repository-url>
cd parcelpilot-agent
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and configure your API key and port:

```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Build & Production Start
Build the document ingestion chunks and React frontend:

```bash
npm run build
```

Start the unified Express server (serves API endpoints + production frontend on port 3001):

```bash
npm start
```

Open **`http://localhost:3001`** in your browser.

---

## Project Layout

```
server/       Express backend — agent loop (Gemini API), tools, data loading, routes
client/       React frontend — chat UI + live tool badges + confirmation dialog + dashboard
data/         Source documents (PDFs, xlsx) and processed section chunks
scripts/      Document ingestion script (PDFs -> clause-level chunks)
```

See `DESIGN.md` for complete architecture specifications and `PRODUCT_NOTE.md` for product decisions and metric details.

---

## Try Asking in the Chat

- *"Can Northstar cancel ORD-1001 without a cancellation fee? Explain why."*
- *"ORD-2002 pickup was delayed over 4 hours due to carrier fault. Do I get a service credit?"*
- *"Escalate my open ticket TKT-501"* (displays confirmation dialog before executing)
