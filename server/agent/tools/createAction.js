const executedActions = [];
const stagedActionsByAccount = new Map();

export const createActionToolSchema = {
  name: 'create_action',
  description: 'Prepare a state-changing action (escalation, ticket update, follow-up task). Calling this tool with confirmed: false stages the action and returns a summary for user approval. It does NOT execute until called with confirmed: true after explicit user confirmation.',
  input_schema: {
    type: 'object',
    properties: {
      action_type: {
        type: 'string',
        enum: ['escalation', 'ticket_update', 'follow_up_task'],
        description: 'Type of state-changing action'
      },
      order_id: { type: 'string', description: 'Associated Order ID if applicable' },
      ticket_id: { type: 'string', description: 'Associated Ticket ID if applicable' },
      reason: { type: 'string', description: 'Detailed reason/justification for the action' },
      confirmed: {
        type: 'boolean',
        description: 'Set to false on first call to request user approval. Set to true ONLY after explicit user confirmation.'
      }
    },
    required: ['action_type', 'reason', 'confirmed']
  }
};

/** Handles 2-step confirmation gate with server-side staging verification guard. */
export function executeCreateAction(input, accountId) {
  const { action_type, order_id, ticket_id, reason, confirmed } = input || {};

  if (!action_type || !reason) {
    return { error: 'action_type and reason are required' };
  }

  // STEP 1: Unconfirmed / Staging call
  if (!confirmed) {
    const stageId = `STAGE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const summary = `Proposed ${action_type.toUpperCase()}${order_id ? ` for order ${order_id}` : ''}${ticket_id ? ` for ticket ${ticket_id}` : ''}: "${reason}"`;
    
    const stagedRecord = {
      stageId,
      action_type,
      order_id: order_id || null,
      ticket_id: ticket_id || null,
      reason,
      accountId,
      stagedAt: new Date().toISOString()
    };

    stagedActionsByAccount.set(accountId, stagedRecord);

    return {
      status: 'pending_confirmation',
      stage_id: stageId,
      requires_user_confirmation: true,
      summary,
      message: `Action staged. Please ask the user to confirm: "${summary}". Do NOT execute until the user explicitly says yes.`
    };
  }

  // STEP 2: Confirmed execution call — Server-side Staging Guard
  const pendingStaged = stagedActionsByAccount.get(accountId);
  if (!pendingStaged) {
    console.warn(`[Action Execution Guard Blocked] Account ${accountId} attempted direct execution without a staged action.`);
    return {
      status: 'rejected',
      error: 'Execution rejected: No pending staged action found for this account. Actions must be staged with confirmed: false and shown to the user before execution can be confirmed.',
      requires_staging: true
    };
  }

  // Consume/clear staged action
  stagedActionsByAccount.delete(accountId);

  const actionId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const record = {
    id: actionId,
    action_type,
    order_id: order_id || pendingStaged.order_id,
    ticket_id: ticket_id || pendingStaged.ticket_id,
    reason,
    accountId,
    executedAt: new Date().toISOString()
  };

  executedActions.push(record);
  console.log(`[Action Executed] ID: ${actionId} | Account: ${accountId} | Type: ${action_type}`);

  return {
    status: 'created',
    id: actionId,
    summary: `Successfully executed ${action_type.toUpperCase()} (ID: ${actionId}) for ${accountId}.`,
    action: record
  };
}

/** Returns list of all executed actions (for verification/debugging). */
export function getExecutedActions() {
  return [...executedActions];
}
