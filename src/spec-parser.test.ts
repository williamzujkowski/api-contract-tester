/**
 * Tests for spec-parser module.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSpec, extractEndpoints } from './spec-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const petstoreJson = readFileSync(join(__dirname, 'fixtures/petstore.json'), 'utf-8');

describe('parseSpec', () => {
  it('parses valid OpenAPI spec', () => {
    const spec = parseSpec(petstoreJson);
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('Petstore API');
    expect(spec.info.version).toBe('1.0.0');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseSpec('not json')).toThrow();
  });

  it('throws on missing openapi field', () => {
    expect(() => parseSpec('{"info":{},"paths":{}}')).toThrow('openapi');
  });

  it('throws on missing info field', () => {
    expect(() => parseSpec('{"openapi":"3.0.0","paths":{}}')).toThrow('info');
  });

  it('throws on missing paths field', () => {
    expect(() => parseSpec('{"openapi":"3.0.0","info":{"title":"T","version":"1"}}')).toThrow('paths');
  });
});

describe('extractEndpoints', () => {
  it('extracts all endpoints from petstore spec', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);

    expect(endpoints).toHaveLength(4); // GET /pets, POST /pets, GET /pets/{petId}, DELETE /pets/{petId}
  });

  it('extracts correct methods', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const methods = endpoints.map((e) => `${e.method} ${e.path}`);

    expect(methods).toContain('get /pets');
    expect(methods).toContain('post /pets');
    expect(methods).toContain('get /pets/{petId}');
    expect(methods).toContain('delete /pets/{petId}');
  });

  it('extracts operationIds', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const ids = endpoints.map((e) => e.operationId);

    expect(ids).toContain('listPets');
    expect(ids).toContain('createPet');
    expect(ids).toContain('getPet');
    expect(ids).toContain('deletePet');
  });

  it('extracts response status codes', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const listPets = endpoints.find((e) => e.operationId === 'listPets');

    expect(listPets?.statusCodes).toEqual(['200', '500']);
  });

  it('detects request body presence', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);

    const createPet = endpoints.find((e) => e.operationId === 'createPet');
    const listPets = endpoints.find((e) => e.operationId === 'listPets');

    expect(createPet?.hasRequestBody).toBe(true);
    expect(listPets?.hasRequestBody).toBe(false);
  });

  it('extracts parameters', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const getPet = endpoints.find((e) => e.operationId === 'getPet');

    expect(getPet?.parameters).toHaveLength(1);
    expect(getPet?.parameters[0]?.name).toBe('petId');
    expect(getPet?.parameters[0]?.in).toBe('path');
  });

  it('extracts response schemas', () => {
    const spec = parseSpec(petstoreJson);
    const endpoints = extractEndpoints(spec);
    const createPet = endpoints.find((e) => e.operationId === 'createPet');

    const schema201 = createPet?.responseSchemas.get('201');
    expect(schema201?.type).toBe('object');
    expect(schema201?.required).toContain('id');
    expect(schema201?.required).toContain('name');
  });

  it('handles empty paths', () => {
    const spec = parseSpec('{"openapi":"3.0.0","info":{"title":"Empty","version":"1.0.0"},"paths":{}}');
    const endpoints = extractEndpoints(spec);
    expect(endpoints).toHaveLength(0);
  });
});
