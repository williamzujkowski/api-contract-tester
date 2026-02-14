/**
 * Report formatter — renders test results as markdown, JSON, or text.
 */

import type { OutputFormat, TestReport, TestResult } from './types.js';

/**
 * Format a test report in the specified format.
 */
export function formatReport(report: TestReport, format: OutputFormat): string {
  switch (format) {
    case 'markdown':
      return formatMarkdown(report);
    case 'json':
      return JSON.stringify(report, null, 2);
    case 'text':
      return formatText(report);
  }
}

function formatMarkdown(report: TestReport): string {
  const lines: string[] = [];

  lines.push(`# Contract Test Report: ${report.specTitle} v${report.specVersion}`);
  lines.push('');
  lines.push(`**Total:** ${String(report.totalTests)} | **Passed:** ${String(report.passed)} | **Failed:** ${String(report.failed)}`);
  lines.push('');

  if (report.failed === 0) {
    lines.push('All contract tests passed.');
    return lines.join('\n');
  }

  lines.push('## Failures');
  lines.push('');

  for (const result of report.results) {
    if (result.passed) continue;
    lines.push(`### ${result.test.method.toUpperCase()} ${result.test.endpoint} (${result.test.statusCode})`);
    lines.push('');
    for (const failure of result.failures) {
      lines.push(`- **${failure.assertion.type}** at \`${failure.assertion.path}\`: ${failure.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatText(report: TestReport): string {
  const lines: string[] = [];

  lines.push(`Contract Test Report: ${report.specTitle} v${report.specVersion}`);
  lines.push(`Total: ${String(report.totalTests)} | Passed: ${String(report.passed)} | Failed: ${String(report.failed)}`);
  lines.push('');

  for (const result of report.results) {
    const icon = result.passed ? 'PASS' : 'FAIL';
    lines.push(`[${icon}] ${result.test.method.toUpperCase()} ${result.test.endpoint} ${result.test.statusCode}`);
    appendFailureLines(lines, result);
  }

  return lines.join('\n');
}

function appendFailureLines(lines: string[], result: TestResult): void {
  if (result.passed) return;
  for (const failure of result.failures) {
    lines.push(`  - ${failure.assertion.type}: ${failure.message}`);
  }
}
