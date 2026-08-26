import { searchDocuments } from '../../data/loadDocs.js';

export const searchDocumentsToolSchema = {
  name: 'search_documents',
  description: 'Search policies, SOPs, product docs, and (if applicable) the customer\'s own signed contract for relevant guidance. Returns ranked section chunks with source, authority tier, and status.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query or keywords (e.g. "cancellation fee", "Northstar contract", "service credit")' }
    },
    required: ['query']
  }
};

/** Executes document search tool for active customer account. */
export function executeSearchDocuments(input, accountId) {
  const { query } = input || {};
  if (!query) {
    return { found: false, error: 'Query parameter is required' };
  }

  const chunks = searchDocuments(query, accountId);
  return {
    found: chunks.length > 0,
    count: chunks.length,
    results: chunks.map(c => ({
      id: c.id,
      source: c.source,
      authority: c.authority,
      status: c.status,
      effective_date: c.effective_date,
      clause_scope: c.clause_scope,
      customer_account_id: c.customer_account_id,
      text: c.text
    }))
  };
}
