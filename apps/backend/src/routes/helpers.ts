const JSON_HEADERS = { "Content-Type": "application/json" }

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
