const API_URL = process.env.REACT_APP_BACKEND_URL || '';

async function apiFetch(path, options = {}) {
  const url = `${API_URL}/api${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export async function checkHealth() {
  return apiFetch('/health');
}

export async function getModelsStatus() {
  return apiFetch('/models/status');
}

export async function loadModels() {
  return apiFetch('/models/load', { method: 'POST' });
}

export async function downloadModels(onProgress) {
  const url = `${API_URL}/api/models/download`;
  const res = await fetch(url, { method: 'POST' });
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split('\n').filter((l) => l.startsWith('data: '));
    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(6));
        onProgress?.(data);
        if (data.status === 'error') throw new Error(data.message);
      } catch (e) {
        if (e.message && e.message !== 'Unexpected end of JSON input') throw e;
      }
    }
  }
}

export async function parseIntent(text) {
  return apiFetch('/intent/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function draftEmail(intent) {
  return apiFetch('/email/draft', {
    method: 'POST',
    body: JSON.stringify(intent),
  });
}

export async function sendEmail(to, subject, body) {
  return apiFetch('/email/send', {
    method: 'POST',
    body: JSON.stringify({ to, subject, body }),
  });
}

export async function getGmailStatus() {
  return apiFetch('/gmail/status');
}

export async function setGmailClientConfig(clientConfig) {
  return apiFetch('/gmail/client-config', {
    method: 'POST',
    body: JSON.stringify({ client_config: clientConfig }),
  });
}

export async function getGmailAuthUrl() {
  return apiFetch('/auth/gmail/url');
}

export async function disconnectGmail() {
  return apiFetch('/auth/gmail/disconnect', { method: 'POST' });
}

export function getWebSocketUrl() {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}/api/ws/transcribe`;
}
