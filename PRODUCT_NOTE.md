# ParcelPilot Support Agent — Product Note

## Architecture & Product Decisions

### 1. Document Retrieval Strategy (In-Memory Keyword & Lunr Index vs Embeddings)
Given the document pack size (6 PDFs), we implemented an in-memory full-text `lunr` search index rather than an external vector database or embedding pipeline. For a small document set:
- In-memory indexing executes in sub-millisecond time.
- Exact keyword matching on specific terms (e.g. `ORD-1001`, `KI-208`, `LumenWorks`, `Northstar`) avoids semantic vector hallucination.
- Zero infrastructure overhead and zero external retrieval latency.

### 2. Source Authority Model & Trust
- **Hierarchy:** `contract_override` > `sop` > `general_policy` > `product_doc` > `historical_ticket`.
- **Clause-by-Clause Contract Overrides:** Contracts override specific terms (e.g. Northstar waives cancellation fees; LumenWorks fixes credit to ₹300 for >4hr delay), while deferring to standard SOPs for unmentioned terms.
- **Untrusted Historical Context:** Past agent resolutions (`TKT-450`, `TKT-451`) are tagged as context only, ensuring past errors are never repeated.

### 3. Proactive Issue Detection (Bonus Problem 1)
- Transparent, auditable rule-based engine running over in-memory dataset to flag SLA risks, pickup delays, recurring same-customer issues (`KI-208`), and active P1 outages.
- **Signal Separation (Recurring vs Cross-Customer):** We explicitly separated `Recurring Same-Customer Issue` (single customer hitting the same known issue multiple times over time) from `Cross-Customer Cluster` (the same issue spreading across 2+ distinct customer accounts).
- **Dataset Honesty:** In the current dataset, both `TKT-502` and historical `TKT-451` belong to the same account (`ACCT-002` LumenWorks). Rather than falsely labeling this as a cross-customer cluster, the engine accurately fires `Recurring Same-Customer Issue` for LumenWorks and returns zero false-positive cross-customer clusters. Auditable rules build trust faster with ops teams than black-box scoring models.

---

## Intentional Omissions & What I'd Build Next

1. **Cross-Customer Issue Detection Scaling:** We built `Cross-Customer Cluster` as a distinct signal requiring `affectedAccountIds.length >= 2`. In larger multi-tenant datasets with dozens of customer accounts, this signal would automatically cluster cross-customer spikes when $\ge 2$ distinct accounts experience the same product issue signature within a sliding window.
2. **Authentication:** Mock dropdown selector (`ACCT-001` through `ACCT-004`). Production would use OAuth2/JWT session cookies.
3. **Vector DB / Embeddings:** Scalable vector stores (e.g., Pinecone/Qdrant) would be added when document volume scales to thousands of pages.
4. **Database Persistence:** In-memory dataset parsed from `.xlsx` at boot. Production would use PostgreSQL/SQLite.
5. **Streaming Responses:** Synchronous JSON API used for demo simplicity; Server-Sent Events (SSE) stream text in production UX.

---

## Primary Success Metric

**% of customer queries resolved without escalation AND without a subsequent correction/complaint**

This metric balances resolution efficiency against trust and accuracy—ensuring the agent resolves customer queries effectively without providing confident yet incorrect answers.
