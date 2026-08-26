import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { deriveTicketSeverity } from './severity.js';
import { calculateOrderSLA, calculateServiceCredit, SNAPSHOT_TIMESTAMP } from './sla.js';

const XLSX_PATH = path.resolve('data/raw/ParcelPilot_Assessment_Data.xlsx');

let accountsData = [];
let ordersData = [];
let ticketsData = [];

/** Loads Excel sheets into in-memory data arrays at server boot. */
export function loadStructuredData() {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`Missing required structured dataset at: ${XLSX_PATH}`);
  }

  const workbook = xlsx.readFile(XLSX_PATH);
  
  // Read sheets
  const accountsSheet = workbook.Sheets['accounts'];
  const ordersSheet = workbook.Sheets['orders'];
  const ticketsSheet = workbook.Sheets['tickets'];

  if (!accountsSheet || !ordersSheet || !ticketsSheet) {
    throw new Error('Workbook missing required sheets (accounts, orders, tickets)');
  }

  accountsData = xlsx.utils.sheet_to_json(accountsSheet);
  ordersData = xlsx.utils.sheet_to_json(ordersSheet);
  const rawTickets = xlsx.utils.sheet_to_json(ticketsSheet);

  // Enrich tickets with derived severity per policy definitions (Section 2.5 Data Notes)
  ticketsData = rawTickets.map(t => {
    const { severity, reason } = deriveTicketSeverity(t);
    return {
      ...t,
      derived_severity: severity,
      severity_reason: reason
    };
  });

  console.log(`[Structured Data Loaded] ${accountsData.length} accounts, ${ordersData.length} orders, ${ticketsData.length} tickets.`);
  return { accounts: accountsData, orders: ordersData, tickets: ticketsData, snapshot: SNAPSHOT_TIMESTAMP };
}

// Auto-load on module import
loadStructuredData();

/** Returns account by account ID. */
export function getAccountById(accountId) {
  return accountsData.find(a => a.account_id === accountId) || null;
}

/** Returns all customer accounts. */
export function getAllAccounts() {
  return [...accountsData];
}

/** Returns all orders belonging to account ID. */
export function getOrdersByAccount(accountId) {
  return ordersData.filter(o => o.account_id === accountId);
}

/** Returns order by order ID, scoped to account ID if provided. */
export function getOrderById(orderId, accountId = null) {
  const order = ordersData.find(o => o.order_id === orderId);
  if (!order) return null;
  if (accountId && order.account_id !== accountId) return null; // Scoped access control
  return order;
}

/** Returns all tickets belonging to account ID. */
export function getTicketsByAccount(accountId) {
  return ticketsData.filter(t => t.account_id === accountId);
}

/** Returns ticket by ticket ID, scoped to account ID if provided. */
export function getTicketById(ticketId, accountId = null) {
  const ticket = ticketsData.find(t => t.ticket_id === ticketId);
  if (!ticket) return null;
  if (accountId && ticket.account_id !== accountId) return null; // Scoped access control
  return ticket;
}

/** Returns all tickets across all accounts (internal ops/dashboard view). */
export function getAllTickets() {
  return [...ticketsData];
}

/** Returns all orders across all accounts (internal ops/dashboard view). */
export function getAllOrders() {
  return [...ordersData];
}

export { calculateOrderSLA, calculateServiceCredit, SNAPSHOT_TIMESTAMP };
