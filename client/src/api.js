async function request(path, options) {
  const res = await fetch(`/api${path}`, options);
  const body = await res.json();
  if (!res.ok || body.status === 'error') {
    throw new Error(body.message || `Request to ${path} failed`);
  }
  return body;
}

export function fetchCases() {
  return request('/cases').then((body) => body.cases);
}

export function fetchCaseDetail(caseId) {
  return request(`/cases/${encodeURIComponent(caseId)}`);
}

export function fetchPaymentLinks() {
  return request('/payment-links').then((body) => body.paymentLinks);
}

export function fetchAuditTrail() {
  return request('/audit-trail').then((body) => body.events);
}

export function runSimulation(n) {
  return request('/simulations/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(n ? { n } : {}),
  }).then((body) => body.simulation);
}

export function fetchSimulations() {
  return request('/simulations').then((body) => body.simulations);
}

export function fetchSimulationDetail(batchId) {
  return request(`/simulations/${encodeURIComponent(batchId)}`).then((body) => body.simulation);
}
