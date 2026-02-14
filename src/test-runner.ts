/**
 * Contract test runner — validates fixture responses against contract tests.
 *
 * Uses fixture data only — no live HTTP calls.
 */

import type {
  ContractTest,
  ContractAssertion,
  TestResult,
  AssertionFailure,
} from './types.js';

/** Map from "METHOD /path statusCode" → fixture response body. */
export type FixtureMap = ReadonlyMap<string, Record<string, unknown>>;

/**
 * Build a fixture key for lookup.
 */
export function fixtureKey(method: string, path: string, statusCode: string): string {
  return `${method.toUpperCase()} ${path} ${statusCode}`;
}

/**
 * Run all contract tests against fixture responses.
 */
export function runTests(
  tests: readonly ContractTest[],
  fixtures: FixtureMap
): readonly TestResult[] {
  return tests.map((test) => runSingleTest(test, fixtures));
}

function runSingleTest(test: ContractTest, fixtures: FixtureMap): TestResult {
  const key = fixtureKey(test.method, test.endpoint, test.statusCode);
  const fixture = fixtures.get(key);
  const failures: AssertionFailure[] = [];

  for (const assertion of test.assertions) {
    const failure = checkAssertion(assertion, fixture);
    if (failure) failures.push(failure);
  }

  return { test, passed: failures.length === 0, failures };
}

function checkAssertion(
  assertion: ContractAssertion,
  fixture: Record<string, unknown> | undefined
): AssertionFailure | null {
  switch (assertion.type) {
    case 'status_code_exists':
      // Status code existence is always valid — it's in the spec
      return null;

    case 'required_field':
      return checkRequiredField(assertion, fixture);

    case 'field_type':
      return checkFieldType(assertion, fixture);

    case 'enum_value':
      return checkEnumValue(assertion, fixture);

    case 'array_items':
      return checkArrayItems(assertion, fixture);
  }
}

function checkRequiredField(
  assertion: ContractAssertion,
  fixture: Record<string, unknown> | undefined
): AssertionFailure | null {
  if (!fixture) {
    return { assertion, actual: 'no fixture', message: 'No fixture response provided' };
  }

  const fieldName = extractFieldName(assertion.path);
  const target = resolveTarget(fixture, assertion.path);

  if (target === undefined || !(fieldName in (target as Record<string, unknown>))) {
    return { assertion, actual: 'missing', message: `Required field "${fieldName}" is missing` };
  }

  return null;
}

function checkFieldType(
  assertion: ContractAssertion,
  fixture: Record<string, unknown> | undefined
): AssertionFailure | null {
  if (!fixture) return null; // Skip type checks without fixture

  const fieldName = extractFieldName(assertion.path);
  const target = resolveTarget(fixture, assertion.path);

  if (target === undefined) return null;
  const value = (target as Record<string, unknown>)[fieldName];
  if (value === undefined) return null;

  const actualType = getJsonType(value);
  if (actualType !== assertion.expected) {
    return {
      assertion,
      actual: actualType,
      message: `Expected type "${assertion.expected}", got "${actualType}"`,
    };
  }

  return null;
}

function checkEnumValue(
  assertion: ContractAssertion,
  fixture: Record<string, unknown> | undefined
): AssertionFailure | null {
  if (!fixture) return null;

  const fieldName = extractFieldName(assertion.path);
  const target = resolveTarget(fixture, assertion.path);

  if (target === undefined) return null;
  const value = (target as Record<string, unknown>)[fieldName];
  if (value === undefined) return null;

  const allowed = assertion.expected.split('|');
  if (!allowed.includes(String(value))) {
    return {
      assertion,
      actual: String(value),
      message: `Value "${String(value)}" not in allowed enum [${allowed.join(', ')}]`,
    };
  }

  return null;
}

function checkArrayItems(
  assertion: ContractAssertion,
  fixture: Record<string, unknown> | undefined
): AssertionFailure | null {
  if (!fixture) return null;

  if (!Array.isArray(fixture)) {
    return { assertion, actual: getJsonType(fixture), message: 'Expected array response' };
  }

  return null;
}

function extractFieldName(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] ?? path;
}

function resolveTarget(
  obj: Record<string, unknown>,
  path: string
): Record<string, unknown> | undefined {
  const parts = path.split('.').filter((p) => p !== '$' && p !== '$[]');
  if (parts.length <= 1) return obj;

  // Navigate to parent of the target field
  let current: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[parts[i] ?? ''];
  }

  return current as Record<string, unknown> | undefined;
}

function getJsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  // OpenAPI "integer" maps to JS "number" — treat integer as valid number subtype
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  return typeof value;
}
