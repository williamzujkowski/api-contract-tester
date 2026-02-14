/**
 * Tests for test-generator module.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSpec, extractEndpoints } from './spec-parser.js';
import { generateTests } from './test-generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const petstoreJson = readFileSync(join(__dirname, 'fixtures/petstore.json'), 'utf-8');

describe('generateTests', () => {
  it('generates tests for all endpoint+status combos', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    // GET /pets: 200, 500 = 2
    // POST /pets: 201, 400 = 2
    // GET /pets/{petId}: 200, 404 = 2
    // DELETE /pets/{petId}: 204, 404 = 2
    expect(tests).toHaveLength(8);
  });

  it('generates status_code_exists assertion for every test', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    for (const test of tests) {
      const hasStatusAssertion = test.assertions.some(
        (a) => a.type === 'status_code_exists'
      );
      expect(hasStatusAssertion).toBe(true);
    }
  });

  it('generates required_field assertions for required properties', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    const createPet201 = tests.find(
      (t) => t.operationId === 'createPet' && t.statusCode === '201'
    );
    const requiredAssertions = createPet201?.assertions.filter(
      (a) => a.type === 'required_field'
    );

    expect(requiredAssertions?.length).toBeGreaterThanOrEqual(2); // id, name
    const fieldNames = requiredAssertions?.map((a) => a.path);
    expect(fieldNames).toContain('$.id');
    expect(fieldNames).toContain('$.name');
  });

  it('generates field_type assertions', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    const getPet200 = tests.find(
      (t) => t.operationId === 'getPet' && t.statusCode === '200'
    );
    const typeAssertions = getPet200?.assertions.filter((a) => a.type === 'field_type');

    expect(typeAssertions?.length).toBeGreaterThanOrEqual(2);
    const idType = typeAssertions?.find((a) => a.path === '$.id');
    expect(idType?.expected).toBe('integer');
  });

  it('generates enum assertions', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    const getPet200 = tests.find(
      (t) => t.operationId === 'getPet' && t.statusCode === '200'
    );
    const enumAssertions = getPet200?.assertions.filter((a) => a.type === 'enum_value');

    expect(enumAssertions).toHaveLength(1);
    expect(enumAssertions?.[0]?.expected).toBe('available|pending|sold');
  });

  it('generates array_items assertion for array responses', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    const listPets200 = tests.find(
      (t) => t.operationId === 'listPets' && t.statusCode === '200'
    );
    const arrayAssertions = listPets200?.assertions.filter(
      (a) => a.type === 'array_items'
    );

    expect(arrayAssertions).toHaveLength(1);
    expect(arrayAssertions?.[0]?.expected).toBe('object');
  });

  it('handles endpoints without response schemas', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const tests = generateTests(endpoints);

    const deletePet204 = tests.find(
      (t) => t.operationId === 'deletePet' && t.statusCode === '204'
    );

    // Should only have status_code_exists assertion
    expect(deletePet204?.assertions).toHaveLength(1);
    expect(deletePet204?.assertions[0]?.type).toBe('status_code_exists');
  });
});
