/**
 * Tests for reporter module.
 */

import { describe, it, expect } from 'vitest';
import { formatReport } from './reporter.js';
import type { TestReport } from './types.js';

function makeReport(overrides: Partial<TestReport> = {}): TestReport {
  return {
    specTitle: 'Test API',
    specVersion: '1.0.0',
    totalTests: 2,
    passed: 1,
    failed: 1,
    results: [
      {
        test: {
          endpoint: '/users',
          method: 'get',
          operationId: 'listUsers',
          statusCode: '200',
          assertions: [{ type: 'status_code_exists', path: '$', expected: '200', description: 'Status 200' }],
        },
        passed: true,
        failures: [],
      },
      {
        test: {
          endpoint: '/users',
          method: 'post',
          operationId: 'createUser',
          statusCode: '201',
          assertions: [
            { type: 'required_field', path: '$.id', expected: 'present', description: 'id required' },
          ],
        },
        passed: false,
        failures: [
          {
            assertion: { type: 'required_field', path: '$.id', expected: 'present', description: 'id required' },
            actual: 'missing',
            message: 'Required field "id" is missing',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('formatReport', () => {
  it('formats as text', () => {
    const output = formatReport(makeReport(), 'text');

    expect(output).toContain('Test API');
    expect(output).toContain('Total: 2');
    expect(output).toContain('[PASS]');
    expect(output).toContain('[FAIL]');
    expect(output).toContain('required_field');
  });

  it('formats as markdown', () => {
    const output = formatReport(makeReport(), 'markdown');

    expect(output).toContain('# Contract Test Report');
    expect(output).toContain('**Total:** 2');
    expect(output).toContain('## Failures');
    expect(output).toContain('POST /users');
  });

  it('formats as JSON', () => {
    const output = formatReport(makeReport(), 'json');
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed['specTitle']).toBe('Test API');
    expect(parsed['totalTests']).toBe(2);
    expect(parsed['passed']).toBe(1);
  });

  it('shows "all passed" in markdown when no failures', () => {
    const report = makeReport({
      failed: 0,
      results: [makeReport().results[0]!],
      totalTests: 1,
      passed: 1,
    });
    const output = formatReport(report, 'markdown');

    expect(output).toContain('All contract tests passed');
    expect(output).not.toContain('## Failures');
  });
});
