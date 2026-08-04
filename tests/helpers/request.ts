export function jsonRequest(
  url: string,
  init?: { method?: string; body?: unknown; headers?: HeadersInit }
): Request {
  const headers = new Headers(init?.headers)
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return new Request(url, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
}

export async function readJson<T = unknown>(
  response: Response
): Promise<{ status: number; body: T }> {
  return { status: response.status, body: (await response.json()) as T }
}
