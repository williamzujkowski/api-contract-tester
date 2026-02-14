/**
 * api-contract-tester — library API.
 *
 * Generates and runs contract tests from OpenAPI 3.0 specs.
 */

export { parseSpec, extractEndpoints } from './spec-parser.js';
export { generateTests } from './test-generator.js';
export { runTests, fixtureKey } from './test-runner.js';
export type { FixtureMap } from './test-runner.js';
export { formatReport } from './reporter.js';
export type {
  OpenAPISpec,
  Endpoint,
  ContractTest,
  ContractAssertion,
  TestResult,
  TestReport,
  OutputFormat,
  HttpMethod,
  SchemaObject,
  AssertionType,
  AssertionFailure,
} from './types.js';

import { parseSpec, extractEndpoints } from './spec-parser.js';
import { generateTests } from './test-generator.js';
import { runTests } from './test-runner.js';
import { formatReport } from './reporter.js';
import type { FixtureMap } from './test-runner.js';
import type { OutputFormat, TestReport } from './types.js';

interface RunOptions {
  readonly specJson: string;
  readonly fixtures: FixtureMap;
  readonly format?: OutputFormat;
}

/**
 * Run the full pipeline: parse → extract → generate → run → report.
 */
export function runContractTests(options: RunOptions): {
  report: TestReport;
  formatted: string;
} {
  const spec = parseSpec(options.specJson);
  const endpoints = extractEndpoints(spec);
  const tests = generateTests(endpoints);
  const results = runTests(tests, options.fixtures);
  const format = options.format ?? 'text';

  const report: TestReport = {
    specTitle: spec.info.title,
    specVersion: spec.info.version,
    totalTests: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };

  return { report, formatted: formatReport(report, format) };
}
