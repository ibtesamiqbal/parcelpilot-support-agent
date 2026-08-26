/** Derives ticket severity (P1, P2, P3) and reason based on policy definitions. */
export function deriveTicketSeverity(ticket) {
  if (!ticket) return { severity: 'P3', reason: 'Unknown ticket' };
  const text = `${ticket.subject || ''} ${ticket.description || ''}`.toLowerCase();

  // P1 Critical: Complete outage preventing shipment creation, or security/credential exposure
  if (
    text.includes('api key') ||
    text.includes('credential') ||
    text.includes('security incident') ||
    text.includes('http 500') ||
    text.includes('all shipment creation') ||
    text.includes('production outage')
  ) {
    return {
      severity: 'P1',
      reason: 'Critical P1: Complete outage preventing shipment creation, or security/credential exposure.'
    };
  }

  // P2 High: Major feature degraded with workaround (e.g. bulk upload CSV failure, webhook delay)
  if (
    text.includes('bulk upload') ||
    text.includes('csv') ||
    text.includes('webhook') ||
    text.includes('degraded') ||
    text.includes('delay')
  ) {
    return {
      severity: 'P2',
      reason: 'High P2: Major feature degraded or unavailable with an available workaround.'
    };
  }

  // P3 Normal: Minor defect, how-to question, general configuration
  return {
    severity: 'P3',
    reason: 'Normal P3: Minor defect, how-to query, or general configuration request.'
  };
}
