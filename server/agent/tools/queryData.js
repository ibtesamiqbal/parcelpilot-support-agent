import {
  getAccountById,
  getOrdersByAccount,
  getOrderById,
  getTicketsByAccount,
  calculateOrderSLA,
  calculateServiceCredit
} from '../../data/loadStructured.js';

export const queryDataToolSchema = {
  name: 'query_data',
  description: 'Look up or calculate account, order, ticket, SLA, or service-credit information for the logged-in customer account only.',
  input_schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['get_account', 'get_order', 'get_tickets', 'calculate_sla', 'calculate_service_credit'],
        description: 'Operation to perform'
      },
      params: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'Order ID (e.g. ORD-1001)' },
          ticket_id: { type: 'string', description: 'Ticket ID (e.g. TKT-501)' }
        }
      }
    },
    required: ['operation']
  }
};

/** Executes structured data operations scoped to active customer account. */
export function executeQueryData(input, accountId) {
  const { operation, params = {} } = input || {};
  const account = getAccountById(accountId);

  switch (operation) {
    case 'get_account':
      return { account: account || null };

    case 'get_order': {
      if (!params.order_id) return { error: 'params.order_id is required' };
      const order = getOrderById(params.order_id, accountId);
      return order ? { found: true, order } : { found: false, error: `Order ${params.order_id} not found or access denied.` };
    }

    case 'get_tickets': {
      const tickets = getTicketsByAccount(accountId);
      return { count: tickets.length, tickets };
    }

    case 'calculate_sla': {
      if (!params.order_id) return { error: 'params.order_id is required' };
      const order = getOrderById(params.order_id, accountId);
      if (!order) return { found: false, error: `Order ${params.order_id} not found or access denied.` };
      const sla = calculateOrderSLA(order);
      return { order_id: params.order_id, sla };
    }

    case 'calculate_service_credit': {
      if (!params.order_id) return { error: 'params.order_id is required' };
      const order = getOrderById(params.order_id, accountId);
      if (!order) return { found: false, error: `Order ${params.order_id} not found or access denied.` };
      const credit = calculateServiceCredit(order, account);
      return { order_id: params.order_id, credit };
    }

    default:
      return { error: `Unsupported operation: ${operation}` };
  }
}
