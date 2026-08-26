# ParcelPilot Support Agent — Technical Design Document

**Scope decision:** Customer-facing support chatbot (minimum requirements) + Proactive Issue Detection dashboard (Bonus Problem 1). Trust/reliability (Bonus Problem 2) is handled inline via a source-authority model, not a separate feature.

**Time budget:** ~5 hours. This doc is sequenced so you can build top-to-bottom and have a working, hostable app at the end. Cut list is at the bottom — read it now so you don't rabbit-hole.

---

## 1. Architecture Overview

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│   Frontend   │ ───▶ │   Express API     │ ───▶ │  Claude (Sonnet)    │
│  Chat + Ops  │ ◀─── │  /api/chat        │ ◀─── │  tool-use loop      │
│  Dashboard   │      │  /api/dashboard   │      └─────────┬───────────┘
└─────────────┘      └────────┬─────────┘                │
                               │                          │ calls
                     ┌─────────▼─────────┐       ┌────────▼────────┐
                     │  Data Layer        │◀──────┤  3 Tools         │
                     │  - docs (in-memory │       │ search_documents │
                     │    chunks + BM25)  │       │ query_data       │
                     │  - xlsx → JSON     │       │ create_action     │
                     │    (accounts,      │       │ (mocked, needs    │
                     │    orders, tickets)│       │  confirmation)    │
                     └────────────────────┘       └──────────────────┘
```

One backend process. No vector DB, no external retrieval infra — the doc pack is 6 files, so an in-memory BM25-style keyword search over pre-chunked text is faster to build, faster at runtime, and just as accurate as embeddings for this corpus size. Don't over-engineer this.

**Agent loop:** Claude API native tool-use (`tools` param). Backend runs a loop: send message → if `tool_use` blocks returned → execute tool(s) → send `tool_result` back → repeat until Claude returns plain text. Standard agent loop, nothing exotic.

---

## 2. Tech Stack

- **Backend:** Node.js + Express (fastest to stand up, one language across stack)
- **LLM:** Claude Sonnet via `@anthropic-ai/sdk`, native tool calling
- **Doc search:** `lunr` (in-memory full-text index, zero infra) — or hand-rolled BM25 if you want zero deps
- **Structured data:** parse `.xlsx` once at boot with `xlsx` (SheetJS) npm package → hold as plain JS arrays in memory. No database needed for this data size.
- **Frontend:** Plain React (Vite), no component library needed — a chat bubble list, an input box, and a small badge component for "used tool: X". Keep it ugly-but-clean; don't burn time on design polish.
- **Hosting:** Render or Railway for the backend+frontend as one service (single Express server serving the built React app as static files — one deploy, one URL, no CORS headache).
- **Auth:** Mocked. A dropdown at login: "Log in as [Northstar Logistics] / [LumenWorks]" → sets `accountId` in a signed cookie or just server-side session map keyed by a random token. No real auth system — don't build one, you don't have time and it's not what's being graded.

---

## 2.5 Data Notes (from reviewing the actual source pack)

A few specifics confirmed after reading the real documents and data rows — these sharpen the rules in section 5.3 and should be encoded literally, not left to the model to infer:

- **Contract overrides are clause-by-clause, not whole-document.** LumenWorks' agreement overrides only the failed-pickup credit terms (threshold >4hrs, fixed ₹300) and defers to the standard SOP for cancellations. Northstar's overrides both cancellation fees (waived entirely, any timing) and SLA targets. The agent must check whether the contract addresses the *specific term in question*, not treat "customer has a contract" as blanket override.
- **The dataset contains two deliberately incorrect historical ticket resolutions** (`TKT-450`, `TKT-451`) — this is the test for whether the agent blindly trusts historical context. `TKT-450` told Northstar a cancellation fee applied when their contract waives it entirely. `TKT-451` told LumenWorks their plan caps uploads at 3,000 rows, conflating the known-issue workaround threshold (KI-208) with the actual product limit (5,000 rows, per the Product Ops Guide). The agent should recognize and correct these if a similar question recurs, not repeat them.
- **All time-based calculations (SLA breach, cancellation windows, pickup delay) use the dataset snapshot time (`2026-08-16 11:00 Asia/Kolkata`) as "now"** — never the server's real clock. Hardcode this as a constant sourced from the workbook's README sheet, not `Date.now()`.
- **Severity (P1/P2/P3) must be derived from policy definitions against the ticket's actual content**, not stored as a column — e.g. TKT-505 (possible API key exposure) and TKT-501 (all shipment creation failing for one customer) both meet the policy's P1 definition even though no severity field says so explicitly. This derivation logic belongs in `queryData.js` or a small helper, not left implicit in the prompt.
- **An Accounts sheet/tab is expected** (account_id → name, plan, CSM) beyond the Orders and Tickets data already reviewed — confirm its exact columns once the real xlsx is in `data/raw/`, and adjust `loadStructured.js` accessors to match actual column names rather than the illustrative ones in this doc.

## 3. Directory Structure

```
parcelpilot-agent/
├── README.md
├── DESIGN.md                      # this file, include in repo for the architecture note
├── PRODUCT_NOTE.md
├── .env.example
├── package.json
├── data/
│   ├── raw/                       # the 6 source PDFs + xlsx, unmodified
│   └── processed/
│       └── chunks.json            # generated by scripts/ingest-docs.js, gitignored or committed (small, commit it)
├── scripts/
│   └── ingest-docs.js             # one-time: PDF → text → chunks with metadata (source, authority, date)
├── server/
│   ├── index.js                   # Express app entry, serves API + static frontend build
│   ├── agent/
│   │   ├── loop.js                # the tool-use loop (send → tool_use → tool_result → repeat)
│   │   ├── systemPrompt.js         # the agent's instructions (source authority rules, escalation rules)
│   │   └── tools/
│   │       ├── searchDocuments.js  # tool 1: doc retrieval
│   │       ├── queryData.js        # tool 2: structured lookup/calc
│   │       └── createAction.js     # tool 3: mocked state-changing action + confirmation gate
│   ├── data/
│   │   ├── loadDocs.js             # loads chunks.json into a lunr index at boot
│   │   ├── loadStructured.js       # loads xlsx into memory at boot, exposes typed accessors
│   │   └── accessControl.js        # scoping: given accountId, filter what queryData/searchDocuments can return
│   ├── routes/
│   │   ├── chat.js                 # POST /api/chat  { message, accountId } -> { reply, toolCalls[] }
│   │   ├── auth.js                 # POST /api/login (mock)
│   │   └── dashboard.js            # GET /api/dashboard -> proactive issue detection output
│   └── insights/
│       └── detectIssues.js         # Bonus Problem 1 logic, runs over ticket/order data
├── client/                         # Vite React app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Chat.jsx
│   │   │   ├── ToolBadge.jsx       # shows "🔍 Searched: Cancellation SOP" etc live
│   │   │   ├── ConfirmDialog.jsx   # "Confirm: create escalation for ORD-1001?"
│   │   │   └── Dashboard.jsx       # Bonus Problem 1 view
│   │   └── main.jsx
│   └── index.html
└── tests/
    └── example-queries.md          # the two sample questions + your own, with expected reasoning, used to sanity-check before submitting
```

Why this shape: every concern (docs, structured data, access control, tools, agent loop) is its own file. A reviewer — or Claude Code six months from now — can find "where does source authority get decided" in ten seconds (`server/data/loadDocs.js` + `systemPrompt.js`), without wading through a monolith.

---

## 4. Data Layer

### 4.1 Document ingestion (`scripts/ingest-docs.js`, run once, output committed)

For each PDF, extract text (use `pdf-parse`), chunk by section/heading (roughly 300–500 words per chunk, don't split mid-clause), and attach metadata:

```js
{
  id: "policy-v3-chunk-04",
  source: "01_Support_Policy_v3_CURRENT.pdf",
  authority: "general_policy",      // general_policy | contract_override | sop | product_doc | historical_ticket
  status: "current",                 // current | deprecated
  effective_date: "2026-03-01",      // if stated in doc; else null
  text: "..."
}
```

**Authority tiers, most → least trusted:**
1. `contract_override` — customer-specific agreements (Northstar, LumenWorks docs). These override general policy for that customer only.
2. `sop` — Cancellation and Service Credit SOP (operational procedure, current).
3. `general_policy` — Support Policy v3 CURRENT.
4. `product_doc` — Product Ops Guide / Known Issues (factual reference, not policy).
5. `historical_ticket` — past ticket resolutions. Context only, explicitly untrusted — never used as the basis for an answer, only as color ("a similar issue was handled this way previously, but this is not a guarantee").

The deprecated policy (`02_Support_Policy_v2_DEPRECATED.pdf`) is ingested but tagged `status: "deprecated"` — index it so the agent *can* recognize "this is the old version" if a chunk surfaces, but the system prompt instructs Claude to never cite it as current guidance, only to flag if a user references outdated info.

### 4.2 Structured data (`server/data/loadStructured.js`)

Load the workbook's sheets (accounts, orders, tickets, and whatever else is in there) into memory as arrays of plain objects at server boot. Read the README sheet's snapshot timestamp into a constant — this is "now" for every SLA/time calculation the agent does, not `Date.now()`.

Expose a small set of pure functions, not a generic query language — keeps the tool surface predictable and easy to scope:

```js
getAccountById(accountId)
getOrdersByAccount(accountId)
getOrderById(orderId, accountId)       // returns null if orderId doesn't belong to accountId — this IS the access control
getTicketsByAccount(accountId)
calculateSLA(order)                     // hours late, whether breached
calculateServiceCredit(order, policy)   // returns eligible amount + the rule it applied
```

### 4.3 Access control (`server/data/accessControl.js`)

**This is enforced here, not in the prompt.** Every structured-data function takes `accountId` and filters at the data layer — an order that doesn't belong to the logged-in account simply doesn't exist as far as the function is concerned; it returns `null`/empty, not "access denied" (don't leak existence of other accounts' data). Document search is not account-scoped (policies are general), except contract documents — `searchDocuments` only returns a contract-override chunk if its customer name matches the logged-in `accountId`.

---

## 5. Agent Design

### 5.1 Tools (Claude tool-use schema)

```js
// Tool 1: Document search
{
  name: "search_documents",
  description: "Search policies, SOPs, product docs, and (if applicable) the customer's own contract for relevant guidance. Returns ranked chunks with source, authority tier, and status.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"]
  }
}

// Tool 2: Structured data
{
  name: "query_data",
  description: "Look up or calculate account, order, ticket, SLA, or service-credit information for the logged-in customer's account only.",
  input_schema: {
    type: "object",
    properties: {
      operation: { type: "string", enum: ["get_account","get_order","get_tickets","calculate_sla","calculate_service_credit"] },
      params: { type: "object" }
    },
    required: ["operation"]
  }
}

// Tool 3: State-changing action (mocked)
{
  name: "create_action",
  description: "Prepare a state-changing action (escalation, ticket update, follow-up task). This does NOT execute until the user explicitly confirms — calling this tool only stages the action and returns a confirmation prompt to show the user.",
  input_schema: {
    type: "object",
    properties: {
      action_type: { type: "string", enum: ["escalation","ticket_update","follow_up_task"] },
      order_id: { type: "string" },
      reason: { type: "string" },
      confirmed: { type: "boolean" }   // false on first call; agent re-calls with true only after user says yes
    },
    required: ["action_type","reason","confirmed"]
  }
}
```

### 5.2 Confirmation flow

`create_action` is a single tool, called twice in sequence:
1. First call: `confirmed: false` → backend does NOT execute anything, just returns a structured summary (`{ status: "pending_confirmation", summary: "..." }`) as the tool result. Claude relays this to the user as "here's what I'll do — confirm?"
2. User replies "yes" in the next chat turn → Claude calls `create_action` again with `confirmed: true` → backend now actually writes the mocked action (append to an in-memory/JSON "actions log") and returns `{ status: "created", id: "ESC-..." }`.

This keeps the state machine inside one tool (simpler than two tools) and the confirmation is enforced server-side — even if Claude tries to skip straight to `confirmed: true` on the first call, the backend should reject unconfirmed direct-execution unless a matching pending action was staged in the same conversation. (Simple version: just trust the flag for the assessment, but note in your architecture doc that a production version would track a staged-action ID server-side to prevent the model from confirming something it never actually showed the user.)

### 5.3 System prompt (`server/agent/systemPrompt.js`) — key rules to encode

- Identity: "You are ParcelPilot's customer support assistant for [account name]. You only have access to this customer's own data."
- Source authority order (contract > SOP > current policy > product doc > historical tickets), stated explicitly.
- Never treat historical ticket resolutions as policy — they're context, may be wrong.
- Never cite the deprecated policy as current guidance.
- If sources conflict (e.g., contract says one thing, general policy says another) — apply the contract, but tell the user which rule you applied and why, don't just silently pick one.
- If confidence is low, the question requires human judgment, or it's outside tool coverage — escalate rather than guess. State plainly what you're escalating and why.
- Always show your reasoning chain briefly when it involved multiple lookups (order → account → contract → policy → calculation) so the user can see how you got there.
- Any action requires the two-step confirm flow above — never execute without an explicit "yes" from the user.

### 5.4 Multi-step example trace (for your own testing + the demo video)

> "Can Northstar cancel ORD-1001 without a cancellation fee? Explain why."

1. `query_data({operation: "get_order", params: {order_id: "ORD-1001"}})` → order + account
2. `search_documents({query: "cancellation fee Northstar contract"})` → contract override chunk (if exists) + general SOP chunk
3. Compare: does Northstar's contract override the standard cancellation fee terms for this order type/timing?
4. `query_data({operation: "calculate_sla", ...})` if timing-dependent (e.g., fee waived if cancelled >X hours before pickup)
5. Answer with the rule applied and citation of which document it came from, or escalate if the contract is ambiguous on this specific case.

---

## 6. Frontend

Two views, one app, tab-switchable:

**Chat tab:** message list, input box. Each assistant message that involved a tool call renders a small badge above it: `🔍 Searched documents` / `📊 Looked up order data` / `⚡ Preparing action`. When `create_action` returns `pending_confirmation`, render a `ConfirmDialog` with Yes/No buttons instead of a plain text bubble — clicking Yes sends "yes, confirm" as the next chat message.

**Dashboard tab (Bonus Problem 1):** simple table/cards, no chat needed. See section 7.

Keep both to functional, unstyled-but-tidy Tailwind or plain CSS — spend your design minutes on the chat badges (that's what the assessment explicitly asks to show) not on visual polish.

---

## 7. Proactive Issue Detection (Bonus Problem 1)

`server/insights/detectIssues.js` runs on-demand (called by `GET /api/dashboard`, recomputed each request — no need for background jobs at this data size) over the full ticket/order dataset (not account-scoped — this is an internal view). Implement these signals, each a small pure function over the in-memory arrays:

1. **SLA risk:** tickets open longer than the SOP's SLA threshold, or within X% of breaching it. Sort by urgency.
2. **Volume spikes:** group tickets by category/product-issue tag over time buckets (e.g., per week using the snapshot date); flag categories whose recent count is a multiple of their baseline.
3. **Same-issue clustering:** group open tickets referencing the same known product issue (cross-reference `Product_Operations_Guide_and_Known_Issues`) — flag if ≥3 tickets share one.
4. **Cross-customer impact:** the same issue signature appearing across ≥2 distinct accounts in a short window.

Output as a flat list of `{ type, severity, summary, affected_ticket_ids }`, rendered as cards on the Dashboard tab. This is deliberately simple, rule-based, no ML — that's the right call for a 5-hour build and is easy to explain/justify in your demo video ("these are transparent, auditable rules, not a black-box scoring model — trust matters more here than sophistication").

---

## 8. Code Standards (apply throughout)

- No file over ~150 lines. If a tool file is getting long, it's doing too much — split.
- Every exported function gets a one-line JSDoc comment: what it does, not how (the code shows how).
- No premature abstraction — three tools, three files, no generic "tool registry framework" unless it's under 20 lines.
- Fail loud: if a lookup finds nothing, return an explicit `null`/`{found:false}`, never swallow errors silently — this matters for the trust story too.
- Environment config (`ANTHROPIC_API_KEY`, port) via `.env`, never hardcoded.

---

## 9. Build Order (fit to ~5 hours)

1. **(30 min)** Scaffold repo, Express + Vite, `.env`, health check endpoint.
2. **(45 min)** `ingest-docs.js` — get all 6 PDFs into `chunks.json` with authority metadata. Do this by hand-reviewing each doc's structure first; don't blind-automate the authority tagging.
3. **(30 min)** `loadStructured.js` — xlsx → memory, write the 5 accessor functions, sanity-print a few rows.
4. **(45 min)** Wire the 3 tools + agent loop + system prompt. Get one hardcoded test message working end-to-end via curl/Postman before touching the frontend.
5. **(30 min)** Mock login + access control wiring.
6. **(45 min)** Frontend chat UI + tool badges + confirm dialog.
7. **(30 min)** Dashboard tab + `detectIssues.js`.
8. **(30 min)** Run the two example questions + 3–4 of your own edge cases (conflicting sources, out-of-scope question, action confirmation). Fix what breaks.
9. **(15 min)** Deploy, get the hosted URL, smoke-test it live.
10. **(remaining time)** README, architecture note, product note, record demo video.

If you're behind schedule, cut in this order: Dashboard tab last (Problem 1 can be a documented-but-stubbed idea in your Product Note instead of a fully wired feature if you truly run out of time) → then frontend polish → never cut the confirmation flow or access control, those are explicitly graded.

---

## 10. What to Intentionally Leave Out (say this explicitly in your Product Note)

- No real authentication/authorization system — mocked, stated as such.
- No vector database / embeddings — in-memory keyword search is sufficient and more debuggable at this scale; note that a production system with a larger doc corpus would need real embeddings + a vector store.
- No persistent database — everything in-memory, resets on server restart. Fine for a demo; note SQLite/Postgres as the obvious next step.
- No streaming responses — synchronous request/response is simpler and fine for a demo; note streaming as a UX improvement for production.
- Dashboard is rule-based, not ML-based — intentional, for trust/explainability at this stage.
- Only one user context (customer-facing) fully built — internal ops chatbot beyond the dashboard is future work.

---

## 11. Metric to name in your Product Note

Suggest: **% of customer queries resolved without escalation AND without a subsequent correction/complaint** — this captures both usefulness (resolves things) and trust (doesn't confidently resolve things wrongly), which is exactly the tension ParcelPilot flagged as their core concern.
