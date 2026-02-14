#!/usr/bin/env node
/**
 * CLI entry point for api-contract-tester.
 */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { runContractTests, fixtureKey } from './index.js';
import type { OutputFormat } from './types.js';

const { values } = parseArgs({
  options: {
    spec: { type: 'string', short: 's' },
    fixtures: { type: 'string', short: 'f' },
    format: { type: 'string', default: 'text' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help || !values.spec) {
  console.log(`
api-contract-tester — Generate contract tests from OpenAPI specs

Usage:
  api-contract-tester --spec <path> [--fixtures <path>] [--format text|markdown|json]

Options:
  -s, --spec      Path to OpenAPI 3.0 JSON spec (required)
  -f, --fixtures  Path to fixture responses JSON (optional)
  --format        Output format: text, markdown, json (default: text)
  -h, --help      Show this help
`);
  process.exit(0);
}

const specJson = readFileSync(values.spec, 'utf-8');
const format = (values.format ?? 'text') as OutputFormat;

let fixtures = new Map<string, Record<string, unknown>>();
if (values.fixtures) {
  const raw: unknown = JSON.parse(readFileSync(values.fixtures, 'utf-8'));
  const entries = raw as Record<string, Record<string, unknown>>;
  for (const [key, value] of Object.entries(entries)) {
    fixtures.set(key, value);
  }
}

const { formatted } = runContractTests({ specJson, fixtures, format });
console.log(formatted);
