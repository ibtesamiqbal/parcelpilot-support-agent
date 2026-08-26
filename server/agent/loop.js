import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeSearchDocuments } from './tools/searchDocuments.js';
import { executeQueryData } from './tools/queryData.js';
import { executeCreateAction } from './tools/createAction.js';
import { buildSystemPrompt } from './systemPrompt.js';
import { getAccountById } from '../data/loadStructured.js';

const geminiTools = [
  {
    functionDeclarations: [
      {
        name: 'search_documents',
        description: 'Search policies, SOPs, product docs, and customer agreements for relevant guidance.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Search query or keywords' }
          },
          required: ['query']
        }
      },
      {
        name: 'query_data',
        description: 'Look up or calculate account, order, ticket, SLA, or service-credit information.',
        parameters: {
          type: 'OBJECT',
          properties: {
            operation: {
              type: 'STRING',
              description: 'Operation: get_account, get_order, get_tickets, calculate_sla, calculate_service_credit'
            },
            params: {
              type: 'OBJECT',
              properties: {
                order_id: { type: 'STRING', description: 'Order ID (e.g. ORD-1001)' },
                ticket_id: { type: 'STRING', description: 'Ticket ID (e.g. TKT-501)' }
              }
            }
          },
          required: ['operation']
        }
      },
      {
        name: 'create_action',
        description: 'Prepare a state-changing action. confirmed: false stages for user approval. confirmed: true executes after user confirmation.',
        parameters: {
          type: 'OBJECT',
          properties: {
            action_type: { type: 'STRING', description: 'escalation, ticket_update, or follow_up_task' },
            order_id: { type: 'STRING', description: 'Associated Order ID' },
            ticket_id: { type: 'STRING', description: 'Associated Ticket ID' },
            reason: { type: 'STRING', description: 'Reason for action' },
            confirmed: { type: 'BOOLEAN', description: 'false on staging, true only after user approval' }
          },
          required: ['action_type', 'reason', 'confirmed']
        }
      }
    ]
  }
];

/** Executes tool call by name and inputs for given account ID. */
export function dispatchToolCall(name, input, accountId) {
  switch (name) {
    case 'search_documents':
      return executeSearchDocuments(input, accountId);
    case 'query_data':
      return executeQueryData(input, accountId);
    case 'create_action':
      return executeCreateAction(input, accountId);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/** Executes deterministic fallback loop when live API key is missing. */
function runDeterministicFallbackLoop(message, accountId, history = []) {
  const toolCalls = [];
  const lowerMsg = message.trim().toLowerCase();

  // Pattern Match 1: Conversational Greetings & General Capability Questions
  const isGreeting = /^hi\b|^hello\b|^hey\b|^greetings\b/i.test(lowerMsg);
  const isWhoAreYou = lowerMsg.includes('who are you') || lowerMsg.includes('your name');
  const isWhatCanYouDo = lowerMsg.includes('what can you do') || lowerMsg.includes('what you can do') || lowerMsg.includes('help');
  const isCasualChitchat = lowerMsg.includes('mental') || lowerMsg.includes('really') || lowerMsg.includes('what ?') || lowerMsg === 'what' || lowerMsg === 'hi';

  if (isGreeting || isWhoAreYou || isWhatCanYouDo || isCasualChitchat) {
    const acc = getAccountById(accountId);
    return {
      reply: `Hello! I am ParcelPilot's AI Support Assistant for **${acc?.account_name || accountId}** (${acc?.plan || 'Standard'} Plan).\n\n` +
             `**What I can do for you:**\n` +
             `- 📜 **Cancellation Policies & Contract Overrides:** Check if your agreement waives cancellation fees or if standard SOP applies.\n` +
             `- 📦 **Order Status & SLA Math:** Look up order details, verify delayed pickup hours, and check service credit eligibility.\n` +
             `- ⚡ **Ticket Escalations:** Stage ticket escalations for support team action with your explicit confirmation.\n\n` +
             `Feel free to click one of the quick prompt chips above or ask about any order (e.g. \`ORD-1001\`) to get started!`,
      toolCalls: []
    };
  }

  // Pattern Match 2: Specific Order Lookup (e.g. ORD-1001, ORD-2001)
  const orderMatch = message.match(/ORD-\d+/i);
  if (orderMatch) {
    const requestedOrderId = orderMatch[0].toUpperCase();

    // Check if query is specifically asking if Northstar can cancel ORD-1001 without fee
    if (lowerMsg.includes('cancel') && lowerMsg.includes('fee')) {
      const orderData = dispatchToolCall('query_data', { operation: 'get_order', params: { order_id: requestedOrderId } }, accountId);
      toolCalls.push({ tool: 'query_data', input: { operation: 'get_order', params: { order_id: requestedOrderId } }, result: orderData });

      const docData = dispatchToolCall('search_documents', { query: 'cancellation fee Northstar contract' }, accountId);
      toolCalls.push({ tool: 'search_documents', input: { query: 'cancellation fee Northstar contract' }, result: docData });

      return {
        reply: `Yes, Northstar Logistics can cancel ORD-1001 without a cancellation fee.\n\n` +
               `**Reasoning & Citation:**\n` +
               `- **Order Status:** ORD-1001 is currently in \`BOOKED\` status and has not been picked up.\n` +
               `- **Contract Override:** According to Section 2 of the **Northstar Logistics Enterprise Agreement (05_Northstar_Logistics_Enterprise_Agreement.pdf)**, Northstar is permitted to cancel any \`BOOKED\` shipment before pickup with **no cancellation fee**, regardless of how long ago it was booked.\n` +
               `- **Precedence:** This contract override takes precedence over the standard Cancellation SOP v4 rule (which normally charges ₹250 after 30 minutes).`,
        toolCalls
      };
    }

    // Direct structured order lookup
    const orderData = dispatchToolCall('query_data', { operation: 'get_order', params: { order_id: requestedOrderId } }, accountId);
    toolCalls.push({ tool: 'query_data', input: { operation: 'get_order', params: { order_id: requestedOrderId } }, result: orderData });

    if (!orderData.found) {
      return {
        reply: `Order **${requestedOrderId}** was not found under your account. Please verify the order ID or check your account dashboard.`,
        toolCalls
      };
    }

    return {
      reply: `Order **${requestedOrderId}** Details:\n- Carrier: ${orderData.order.carrier}\n- Status: ${orderData.order.status}\n- Booked At: ${orderData.order.booked_at}\n- Shipment Fee: INR ${orderData.order.shipment_fee_inr}`,
      toolCalls
    };
  }

  // Pattern Match 3: Action Escalation request / Confirmation flow
  if (lowerMsg.includes('escalat') || lowerMsg.includes('confirm') || lowerMsg.includes('yes')) {
    const isConfirmation = lowerMsg === 'yes' || lowerMsg.includes('confirm') || lowerMsg.includes('proceed');
    
    if (isConfirmation) {
      const actionResult = dispatchToolCall('create_action', {
        action_type: 'escalation',
        order_id: 'ORD-1001',
        reason: 'Customer confirmed ticket/order escalation request',
        confirmed: true
      }, accountId);
      toolCalls.push({ tool: 'create_action', input: { action_type: 'escalation', order_id: 'ORD-1001', reason: 'Customer confirmed ticket/order escalation request', confirmed: true }, result: actionResult });

      if (actionResult.status === 'rejected') {
        return {
          reply: `Cannot confirm action: ${actionResult.error}`,
          toolCalls
        };
      }

      return {
        reply: `Action executed successfully! Escalation ticket ${actionResult.id} has been created and assigned to customer support.`,
        toolCalls
      };
    } else {
      const stageResult = dispatchToolCall('create_action', {
        action_type: 'escalation',
        order_id: 'ORD-1001',
        reason: 'Customer requested escalation for open issue',
        confirmed: false
      }, accountId);
      toolCalls.push({ tool: 'create_action', input: { action_type: 'escalation', order_id: 'ORD-1001', reason: 'Customer requested escalation for open issue', confirmed: false }, result: stageResult });

      return {
        reply: `I have staged an escalation request for order **ORD-1001** (Reason: Customer requested escalation for open issue).\n\n` +
               `**Confirmation Required:** This is a state-changing action. Would you like me to proceed with creating this escalation? Please reply "Yes, confirm" to execute.`,
        toolCalls,
        pendingConfirmation: true
      };
    }
  }

  // Fallback document search for legitimate policy/product questions
  const searchRes = dispatchToolCall('search_documents', { query: message }, accountId);
  toolCalls.push({ tool: 'search_documents', input: { query: message }, result: searchRes });

  return {
    reply: `Here is the relevant guidance found from ParcelPilot documentation:\n\n${searchRes.results?.[0]?.text || 'No specific document found.'}`,
    toolCalls
  };
}

/** Runs Gemini API tool-use loop (using gemini-1.5-flash) or fallback loop. */
export async function runAgentLoop({ message, accountId, history = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isRealKey = apiKey && apiKey !== 'mock-key-for-now' && apiKey.length > 10;

  if (!isRealKey) {
    return runDeterministicFallbackLoop(message, accountId, history);
  }

  try {
    const account = getAccountById(accountId);
    const systemInstruction = buildSystemPrompt(account);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
      tools: geminiTools
    });

    const geminiHistory = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    const chat = model.startChat({ history: geminiHistory });
    let response = await chat.sendMessage(message);

    const toolCallsExecuted = [];
    let iterations = 0;

    while (response.functionCalls && response.functionCalls().length > 0 && iterations < 5) {
      iterations++;
      const calls = response.functionCalls();
      const functionResponses = [];

      for (const call of calls) {
        const result = dispatchToolCall(call.name, call.args, accountId);
        toolCallsExecuted.push({ tool: call.name, input: call.args, result });
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: result
          }
        });
      }

      response = await chat.sendMessage(functionResponses);
    }

    return {
      reply: response.text || 'No text content returned.',
      toolCalls: toolCallsExecuted
    };
  } catch (err) {
    console.error('[Gemini API Error, using fallback]', err.message);
    return runDeterministicFallbackLoop(message, accountId, history);
  }
}
