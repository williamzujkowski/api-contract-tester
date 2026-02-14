/**
 * Tests for test-runner module.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSpec, extractEndpoints } from './spec-parser.js';
import { generateTests } from './test-generator.js';
import { runTests, fixtureKey } from './test-runner.js';
import type { FixtureMap } from './test-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const petstoreJson = readFileSync(join(__dirname, 'fixtures/petstore.json'), 'utf-8');

function buildFixtures(): FixtureMap {
  const fixtures = new Map<string, Record<string, unknown>>();

  fixtures.set(fixtureKey('get', '/pets', '200'), [
    { id: 1, name: 'Fido', status: 'available' },
    { id: 2, name: 'Rex', status: 'sold' },
  ] as unknown as Record<string, unknown>);

  fixtures.set(fixtureKey('post', '/pets', '201'), {
    id: 3,
    name: 'Buddy',
    tag: 'dog',
  });

  fixtures.set(fixtureKey('get', '/pets/{petId}', '200'), {
    id: 1,
    name: 'Fido',
    status: 'available',
  });

  return fixtures;
}

describe('fixtureKey', () => {
  it('builds uppercase method key', () => {
    expect(fixtureKey('get', '/pets', '200')).toBe('GET /pets 200');
  });
});

describe('runTests', () => {
  it('runs all tests', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);
    const fixtures = buildFixtures();
    const results = runTests(tests, fixtures);

    expect(results).toHaveLength(8);
  });

  it('passes tests with matching fixtures', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);
    const fixtures = buildFixtures();
    const results = runTests(tests, fixtures);

    const getPet200 = results.find(
      (r) => r.test.operationId === 'getPet' && r.test.statusCode === '200'
    );

    expect(getPet200?.passed).toBe(true);
    expect(getPet200?.failures).toHaveLength(0);
  });

  it('reports failures for missing required fields', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    // Fixture missing required "id" field
    const fixtures = new Map<string, Record<string, unknown>>();
    fixtures.set(fixtureKey('get', '/pets/{petId}', '200'), {
      name: 'Fido',
      status: 'available',
    });

    const results = runTests(tests, fixtures);
    const getPet200 = results.find(
      (r) => r.test.operationId === 'getPet' && r.test.statusCode === '200'
    );

    expect(getPet200?.passed).toBe(false);
    const requiredFailures = getPet200?.failures.filter(
      (f) => f.assertion.type === 'required_field'
    );
    expect(requiredFailures?.length).toBeGreaterThanOrEqual(1);
  });

  it('reports failures for wrong field type', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    // id should be integer but is string
    const fixtures = new Map<string, Record<string, unknown>>();
    fixtures.set(fixtureKey('get', '/pets/{petId}', '200'), {
      id: 'not-a-number',
      name: 'Fido',
      status: 'available',
    });

    const results = runTests(tests, fixtures);
    const getPet200 = results.find(
      (r) => r.test.operationId === 'getPet' && r.test.statusCode === '200'
    );

    expect(getPet200?.passed).toBe(false);
    const typeFailures = getPet200?.failures.filter(
      (f) => f.assertion.type === 'field_type'
    );
    expect(typeFailures?.length).toBeGreaterThanOrEqual(1);
  });

  it('reports failures for invalid enum values', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    const fixtures = new Map<string, Record<string, unknown>>();
    fixtures.set(fixtureKey('get', '/pets/{petId}', '200'), {
      id: 1,
      name: 'Fido',
      status: 'unknown_status', // not in enum
    });

    const results = runTests(tests, fixtures);
    const getPet200 = results.find(
      (r) => r.test.operationId === 'getPet' && r.test.statusCode === '200'
    );

    expect(getPet200?.passed).toBe(false);
    const enumFailures = getPet200?.failures.filter(
      (f) => f.assertion.type === 'enum_value'
    );
    expect(enumFailures).toHaveLength(1);
  });

  it('handles tests with no fixture (graceful)', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);
    const fixtures = new Map<string, Record<string, unknown>>();

    const results = runTests(tests, fixtures);

    // createPet 201 has required fields — should fail with "no fixture"
    const createPet201 = results.find(
      (r) => r.test.operationId === 'createPet' && r.test.statusCode === '201'
    );
    expect(createPet201?.passed).toBe(false);
  });

  it('passes status_code_exists even without fixture', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);
    const fixtures = new Map<string, Record<string, unknown>>();

    const results = runTests(tests, fixtures);

    // deletePet 204 has no schema, only status_code_exists → passes
    const deletePet204 = results.find(
      (r) => r.test.operationId === 'deletePet' && r.test.statusCode === '204'
    );
    expect(deletePet204?.passed).toBe(true);
  });
});
