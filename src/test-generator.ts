/**
 * Contract test generator — produces test cases from extracted endpoints.
 */

import type {
  Endpoint,
  ContractTest,
  ContractAssertion,
  SchemaObject,
} from './types.js';

/**
 * Generate contract tests for all endpoints.
 */
export function generateTests(endpoints: readonly Endpoint[]): readonly ContractTest[] {
  const tests: ContractTest[] = [];

  for (const endpoint of endpoints) {
    for (const statusCode of endpoint.statusCodes) {
      const schema = endpoint.responseSchemas.get(statusCode);
      const assertions = buildAssertions(schema, statusCode);

      tests.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        operationId: endpoint.operationId,
        statusCode,
        assertions,
      });
    }
  }

  return tests;
}

function buildAssertions(
  schema: SchemaObject | undefined,
  statusCode: string
): ContractAssertion[] {
  const assertions: ContractAssertion[] = [];

  assertions.push({
    type: 'status_code_exists',
    path: '$',
    expected: statusCode,
    description: `Response ${statusCode} is documented`,
  });

  if (!schema) return assertions;

  if (schema.type === 'object' && schema.properties) {
    addObjectAssertions(assertions, schema, '$');
  }

  if (schema.type === 'array' && schema.items) {
    assertions.push({
      type: 'array_items',
      path: '$',
      expected: schema.items.type ?? 'object',
      description: 'Response array has typed items',
    });

    if (schema.items.type === 'object' && schema.items.properties) {
      addObjectAssertions(assertions, schema.items, '$[]');
    }
  }

  return assertions;
}

function addObjectAssertions(
  assertions: ContractAssertion[],
  schema: SchemaObject,
  basePath: string
): void {
  const required = new Set(schema.required ?? []);

  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    const fieldPath = `${basePath}.${name}`;

    if (required.has(name)) {
      assertions.push({
        type: 'required_field',
        path: fieldPath,
        expected: 'present',
        description: `Field "${name}" is required`,
      });
    }

    if (prop.type) {
      assertions.push({
        type: 'field_type',
        path: fieldPath,
        expected: prop.type,
        description: `Field "${name}" is type "${prop.type}"`,
      });
    }

    if (prop.enum && prop.enum.length > 0) {
      assertions.push({
        type: 'enum_value',
        path: fieldPath,
        expected: prop.enum.map(String).join('|'),
        description: `Field "${name}" is one of [${prop.enum.map(String).join(', ')}]`,
      });
    }
  }
}
