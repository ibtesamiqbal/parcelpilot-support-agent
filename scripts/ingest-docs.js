import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

const RAW_DIR = path.resolve('data/raw');
const OUT_FILE = path.resolve('data/processed/chunks.json');

const DOC_CONFIGS = [
  {
    file: '01_Support_Policy_v3_CURRENT.pdf',
    authority: 'general_policy',
    status: 'current',
    effective_date: '2026-05-01',
    customer_account_id: null
  },
  {
    file: '02_Support_Policy_v2_DEPRECATED.pdf',
    authority: 'general_policy',
    status: 'deprecated',
    effective_date: '2025-01-01',
    customer_account_id: null
  },
  {
    file: '03_Cancellation_and_Service_Credit_SOP_v4.pdf',
    authority: 'sop',
    status: 'current',
    effective_date: '2026-06-15',
    customer_account_id: null
  },
  {
    file: '04_Product_Operations_Guide_and_Known_Issues.pdf',
    authority: 'product_doc',
    status: 'current',
    effective_date: '2026-08-14',
    customer_account_id: null
  },
  {
    file: '05_Northstar_Logistics_Enterprise_Agreement.pdf',
    authority: 'contract_override',
    status: 'current',
    effective_date: '2026-01-01',
    customer_account_id: 'ACCT-001'
  },
  {
    file: '06_LumenWorks_Service_Agreement.pdf',
    authority: 'contract_override',
    status: 'current',
    effective_date: '2026-03-01',
    customer_account_id: 'ACCT-002'
  }
];

/** Infers specific clause scope label from text content. */
function inferClauseScope(text) {
  const lower = text.toLowerCase();
  if (lower.includes('cancell')) return 'cancellation_terms';
  if (lower.includes('credit') || lower.includes('failed-pickup')) return 'service_credit_terms';
  if (lower.includes('target') || lower.includes('p1') || lower.includes('p2') || lower.includes('p3') || lower.includes('first-response')) return 'support_targets';
  if (lower.includes('known issue') || lower.includes('ki-')) return 'known_issues';
  if (lower.includes('bulk upload') || lower.includes('row') || lower.includes('capability')) return 'plan_capabilities';
  if (lower.includes('precedence') || lower.includes('scope')) return 'policy_scope';
  return 'general_terms';
}

/** Chunks parsed PDF text into section-level clause chunks. */
function chunkDocumentText(text, docConfig) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sections = [];
  let currentHeader = '';
  let currentLines = [];

  for (const line of lines) {
    // New section heading start (numbered sections like "1. ", "2. ")
    if (/^\d+\.\s+/.test(line)) {
      if (currentLines.length > 0) {
        sections.push(currentLines.join(' '));
      }
      currentHeader = line;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    sections.push(currentLines.join(' '));
  }

  const baseId = docConfig.file.replace(/\.pdf$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return sections.map((secText, idx) => ({
    id: `${baseId}-chunk-${String(idx + 1).padStart(2, '0')}`,
    source: docConfig.file,
    authority: docConfig.authority,
    status: docConfig.status,
    effective_date: docConfig.effective_date,
    customer_account_id: docConfig.customer_account_id,
    clause_scope: inferClauseScope(secText),
    text: secText
  }));
}

/** Parses raw PDFs and outputs structured JSON chunks file. */
export async function ingestDocuments() {
  if (!fs.existsSync(RAW_DIR)) {
    throw new Error(`Raw directory missing at: ${RAW_DIR}`);
  }

  const allChunks = [];
  for (const config of DOC_CONFIGS) {
    const pdfPath = path.join(RAW_DIR, config.file);
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Missing required PDF file: ${pdfPath}`);
    }
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const chunks = chunkDocumentText(pdfData.text, config);
    allChunks.push(...chunks);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(allChunks, null, 2), 'utf-8');
  console.log(`[Ingestion Complete] ${allChunks.length} section-level chunks written to ${OUT_FILE}`);
  return allChunks;
}

if (process.argv[1] && process.argv[1].endsWith('ingest-docs.js')) {
  ingestDocuments().catch(err => {
    console.error('[Ingestion Error]', err);
    process.exit(1);
  });
}
