import { getAccountById, getOrderById, getOrdersByAccount, getTicketsByAccount, getTicketById } from './loadStructured.js';
import { searchDocuments } from './loadDocs.js';

/** Verifies that order belongs to active account ID. */
export function scopeOrderAccess(orderId, accountId) {
  if (!orderId || !accountId) return null;
  return getOrderById(orderId, accountId);
}

/** Verifies that ticket belongs to active account ID. */
export function scopeTicketAccess(ticketId, accountId) {
  if (!ticketId || !accountId) return null;
  return getTicketById(ticketId, accountId);
}

/** Executes scoped document search for account ID. */
export function executeScopedDocSearch(query, accountId) {
  return searchDocuments(query, accountId);
}

/** Returns scoped account profile for account ID. */
export function getScopedAccountProfile(accountId) {
  return getAccountById(accountId);
}
