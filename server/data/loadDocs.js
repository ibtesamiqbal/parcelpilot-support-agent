import fs from 'fs';
import path from 'path';
import lunr from 'lunr';

const CHUNKS_PATH = path.resolve('data/processed/chunks.json');
let chunksData = [];
let lunrIndex = null;

/** Loads chunks into lunr search index at server boot. */
export function loadDocumentIndex() {
  if (!fs.existsSync(CHUNKS_PATH)) {
    throw new Error(`Missing processed chunks file at: ${CHUNKS_PATH}. Run 'npm run ingest' first.`);
  }

  const raw = fs.readFileSync(CHUNKS_PATH, 'utf-8');
  chunksData = JSON.parse(raw);

  lunrIndex = lunr(function () {
    this.ref('id');
    this.field('text');
    this.field('clause_scope');
    this.field('authority');

    chunksData.forEach(doc => {
      this.add(doc);
    });
  });

  console.log(`[Document Search Index Loaded] ${chunksData.length} chunks indexed.`);
  return { count: chunksData.length };
}

// Auto-load on import
loadDocumentIndex();

/** Searches document chunks, filtered by authority access control for customer account. */
export function searchDocuments(query, accountId = null) {
  if (!query || typeof query !== 'string') return [];
  if (!lunrIndex) loadDocumentIndex();

  // Perform search (with fallback keyword matching if query terms don't match lunr exact stems)
  let searchResults = [];
  try {
    const lunrHits = lunrIndex.search(query);
    searchResults = lunrHits.map(hit => chunksData.find(c => c.id === hit.ref)).filter(Boolean);
  } catch (err) {
    searchResults = [];
  }

  // Fallback keyword search if lunr returns few or no hits
  if (searchResults.length === 0) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    searchResults = chunksData.filter(chunk => {
      const lowerText = chunk.text.toLowerCase();
      return terms.some(term => lowerText.includes(term));
    });
  }

  // Access control filtering: only return contract_override chunks matching accountId
  const scopedResults = searchResults.filter(chunk => {
    if (chunk.authority === 'contract_override') {
      return accountId && chunk.customer_account_id === accountId;
    }
    return true;
  });

  // Sort by authority tier (contract_override > sop > general_policy > product_doc)
  const authorityOrder = { contract_override: 1, sop: 2, general_policy: 3, product_doc: 4, historical_ticket: 5 };
  scopedResults.sort((a, b) => (authorityOrder[a.authority] || 9) - (authorityOrder[b.authority] || 9));

  return scopedResults.slice(0, 6);
}
