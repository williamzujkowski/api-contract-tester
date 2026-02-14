/**
 * OpenAPI spec parser — extracts endpoints from a spec.
 */

import type {
  OpenAPISpec,
  PathItem,
  HttpMethod,
  Operation,
  Endpoint,
  SchemaObject,
} from './types.js';

const HTTP_METHODS: readonly HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Parse a raw JSON string into a validated OpenAPI spec.
 * Throws on invalid JSON or missing required fields.
 */
export function parseSpec(raw: string): OpenAPISpec {
  const parsed: unknown = JSON.parse(raw);
  const spec = parsed as Record<string, unknown>;

  if (typeof spec['openapi'] !== 'string') {
    throw new Error('Missing or invalid "openapi" version field');
  }
  if (!spec['info'] || typeof spec['info'] !== 'object') {
    throw new Error('Missing or invalid "info" field');
  }
  if (!spec['paths'] || typeof spec['paths'] !== 'object') {
    throw new Error('Missing or invalid "paths" field');
  }

  return parsed as OpenAPISpec;
}

/**
 * Extract all endpoints from a parsed OpenAPI spec.
 */
export function extractEndpoints(spec: OpenAPISpec): readonly Endpoint[] {
  const endpoints: Endpoint[] = [];
  let counter = 0;

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as PathItem)[method];
      if (!operation) continue;

      endpoints.push(buildEndpoint(path, method, operation, counter++));
    }
  }

  return endpoints;
}

function buildEndpoint(
  path: string,
  method: HttpMethod,
  op: Operation,
  counter: number
): Endpoint {
  const statusCodes = Object.keys(op.responses);
  const responseSchemas = new Map<string, SchemaObject | undefined>();

  for (const [code, response] of Object.entries(op.responses)) {
    const jsonContent = response.content?.['application/json'];
    responseSchemas.set(code, jsonContent?.schema);
  }

  return {
    path,
    method,
    operationId: op.operationId ?? `${method}_${path.replace(/\//g, '_')}_${String(counter)}`,
    summary: op.summary ?? '',
    statusCodes,
    responseSchemas,
    parameters: op.parameters ?? [],
    hasRequestBody: op.requestBody !== undefined,
  };
}
