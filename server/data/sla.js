export const SNAPSHOT_TIMESTAMP = '2026-08-16T11:00:00+05:30';
const SNAPSHOT_MS = new Date('2026-08-16T11:00:00+05:30').getTime();

/** Calculates pickup SLA delay in hours relative to snapshot timestamp. */
export function calculateOrderSLA(order) {
  if (!order || !order.pickup_window_end) {
    return { hoursLate: 0, isBreached: false, status: 'UNKNOWN' };
  }

  const windowEndMs = new Date(`${order.pickup_window_end.replace(' ', 'T')}+05:30`).getTime();
  
  if (order.status === 'BOOKED') {
    const hoursLate = Math.max(0, (SNAPSHOT_MS - windowEndMs) / (1000 * 60 * 60));
    return {
      hoursLate: Number(hoursLate.toFixed(2)),
      isBreached: hoursLate > 0,
      status: hoursLate > 0 ? 'PICKUP_OVERDUE' : 'ON_SCHEDULE'
    };
  }

  if (order.pickup_actual_at) {
    const actualMs = new Date(`${order.pickup_actual_at.replace(' ', 'T')}+05:30`).getTime();
    const hoursLate = Math.max(0, (actualMs - windowEndMs) / (1000 * 60 * 60));
    return {
      hoursLate: Number(hoursLate.toFixed(2)),
      isBreached: hoursLate > 0,
      status: hoursLate > 0 ? 'COMPLETED_LATE' : 'COMPLETED_ON_TIME'
    };
  }

  return { hoursLate: 0, isBreached: false, status: order.status };
}

/** Calculates service credit eligibility and amount based on SOP or customer contract override. */
export function calculateServiceCredit(order, account) {
  if (!order) return { eligible: false, creditAmountINR: 0, reason: 'Order not found' };

  if (order.customer_fault) {
    return { eligible: false, creditAmountINR: 0, reason: 'Ineligible: Delay caused by customer fault.' };
  }
  if (!order.carrier_fault) {
    return { eligible: false, creditAmountINR: 0, reason: 'Ineligible: Carrier fault not established.' };
  }

  const sla = calculateOrderSLA(order);
  const accountId = account?.account_id || order.account_id;

  // Account ACCT-002 (LumenWorks) Contract Override: >4 hours delay, fixed INR 300
  if (accountId === 'ACCT-002') {
    if (sla.hoursLate > 4.0) {
      return {
        eligible: true,
        creditAmountINR: 300,
        rule: 'LumenWorks Service Agreement Clause 3: Fixed INR 300 credit for pickup delay > 4 hours (carrier fault).',
        requiresManagerApproval: false
      };
    }
    return {
      eligible: false,
      creditAmountINR: 0,
      reason: `Ineligible under LumenWorks contract: Pickup delay (${sla.hoursLate} hrs) does not exceed 4-hour threshold.`
    };
  }

  // Default SOP v4 Rule: >2 hours delay, lower of INR 500 or 10% shipment fee
  if (sla.hoursLate > 2.0) {
    const fee = order.shipment_fee_inr || 0;
    const creditAmountINR = Math.min(500, fee * 0.10);
    return {
      eligible: true,
      creditAmountINR,
      rule: 'Cancellation & Service Credit SOP v4 Section 2: Lower of INR 500 or 10% of shipment fee for delay > 2 hours (carrier fault).',
      requiresManagerApproval: creditAmountINR > 1000
    };
  }

  return {
    eligible: false,
    creditAmountINR: 0,
    reason: `Ineligible under standard SOP: Pickup delay (${sla.hoursLate} hrs) does not exceed 2-hour threshold.`
  };
}
