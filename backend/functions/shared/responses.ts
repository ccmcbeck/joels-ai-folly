import type { APIGatewayProxyResult } from 'aws-lambda';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export function ok(body: unknown): APIGatewayProxyResult {
  return { statusCode: 200, headers, body: JSON.stringify(body) };
}

export function created(body: unknown): APIGatewayProxyResult {
  return { statusCode: 201, headers, body: JSON.stringify(body) };
}

export function badRequest(message: string): APIGatewayProxyResult {
  return { statusCode: 400, headers, body: JSON.stringify({ error: message }) };
}

export function notFound(message: string): APIGatewayProxyResult {
  return { statusCode: 404, headers, body: JSON.stringify({ error: message }) };
}

export function serverError(message: string): APIGatewayProxyResult {
  return { statusCode: 500, headers, body: JSON.stringify({ error: message }) };
}

export function getUserId(event: { requestContext: { authorizer?: Record<string, unknown> | null } }): string | null {
  const authorizer = event.requestContext?.authorizer;
  if (!authorizer) return null;
  const claims = authorizer['claims'] as Record<string, string> | undefined;
  return claims?.sub ?? null;
}
