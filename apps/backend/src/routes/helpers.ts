const JSON_HEADERS = { "Content-Type": "application/json" }

/**
 * CORS is what makes the API reachable from a browser origin (apps/web).
 * `CORS_ORIGIN` is configurable so a deployment isn't stuck on "*".
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin":  process.env["CORS_ORIGIN"] ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400",
}

/** Copies a response and merges in the CORS headers — status/body/envelope unchanged. */
export function withCors(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

/** Answers a browser preflight: 204 + CORS headers, no routing. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: JSON_HEADERS })
}

export function created(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 201, headers: JSON_HEADERS })
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}

export function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), { status: 400, headers: JSON_HEADERS })
}

export function notFound(message: string): Response {
  return new Response(JSON.stringify({ error: message }), { status: 404, headers: JSON_HEADERS })
}

export function conflict(message: string): Response {
  return new Response(JSON.stringify({ error: message }), { status: 409, headers: JSON_HEADERS })
}

export function methodNotAllowed(): Response {
  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS })
}

export async function parseBody(req: Request): Promise<unknown> {
  try { return await req.json() }
  catch { return {} }
}

export function idParam(req: Request): string {
  const url = new URL(req.url)
  const parts = url.pathname.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? ""
}
