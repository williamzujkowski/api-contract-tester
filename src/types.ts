/**
 * Core types for api-contract-tester.
 *
 * Models OpenAPI 3.0 spec structures (simplified) and contract test
 * generation/execution types.
 */

// ============================================================================
// OpenAPI types (simplified subset)
// ============================================================================

export interface OpenAPISpec {
  readonly openapi: string;
  readonly info: { readonly title: string; readonly version: string };
  readonly paths: Record<string, PathItem>;
}

export interface PathItem {
  readonly get?: Operation;
  readonly post?: Operation;
  readonly put?: Operation;
  readonly patch?: Operation;
  readonly delete?: Operation;
}

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface Operation {
  readonly operationId?: string;
  readonly summary?: string;
  readonly responses: Record<string, ResponseObject>;
  readonly parameters?: readonly Parameter[];
  readonly requestBody?: RequestBody;
}

export interface ResponseObject {
  readonly description: string;
  readonly content?: Record<string, MediaType>;
}

export interface MediaType {
  readonly schema?: SchemaObject;
}

export interface SchemaObject {
  readonly type?: string;
  readonly properties?: Record<string, SchemaObject>;
  readonly required?: readonly string[];
  readonly items?: SchemaObject;
  readonly enum?: readonly unknown[];
  readonly format?: string;
  readonly $ref?: string;
}

export interface Parameter {
  readonly name: string;
  readonly in: 'query' | 'path' | 'header' | 'cookie';
  readonly required?: boolean;
  readonly schema?: SchemaObject;
}

export interface RequestBody {
  readonly required?: boolean;
  readonly content?: Record<string, MediaType>;
}

// ============================================================================
// Extracted endpoint
// ============================================================================

export interface Endpoint {
  readonly path: string;
  readonly method: HttpMethod;
  readonly operationId: string;
  readonly summary: string;
  readonly statusCodes: readonly string[];
  readonly responseSchemas: ReadonlyMap<string, SchemaObject | undefined>;
  readonly parameters: readonly Parameter[];
  readonly hasRequestBody: boolean;
}

// ============================================================================
// Contract test types
// ============================================================================

export type AssertionType =
  | 'status_code_exists'
  | 'required_field'
  | 'field_type'
  | 'enum_value'
  | 'array_items';

export interface ContractAssertion {
  readonly type: AssertionType;
  readonly path: string;
  readonly expected: string;
  readonly description: string;
}

export interface ContractTest {
  readonly endpoint: string;
  readonly method: HttpMethod;
  readonly operationId: string;
  readonly statusCode: string;
  readonly assertions: readonly ContractAssertion[];
}

// ============================================================================
// Test execution
// ============================================================================

export interface TestResult {
  readonly test: ContractTest;
  readonly passed: boolean;
  readonly failures: readonly AssertionFailure[];
}

export interface AssertionFailure {
  readonly assertion: ContractAssertion;
  readonly actual: string;
  readonly message: string;
}

// ============================================================================
// Report types
// ============================================================================

export type OutputFormat = 'markdown' | 'json' | 'text';

export interface TestReport {
  readonly specTitle: string;
  readonly specVersion: string;
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly TestResult[];
}
