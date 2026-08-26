async function request(path) {
  const res = await fetch(`/api${path}`);
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
