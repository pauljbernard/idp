import { IAM_OPERATION_DEFINITIONS, type IamSdkOperation } from '../contracts';
import { buildIamSdkTelemetryHeaders } from '../telemetry';
import type { IamSdkAdapter, IamSdkRequestInput, IamSdkTransport } from '../types';

type FetchLike = (input: string, init?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export interface IamHttpTransportOptions {
  baseUrl: string;
  fetchImpl?: FetchLike;
  defaultHeaders?: Record<string, string>;
}

function encodeQuery(query: Record<string, unknown> | undefined): string {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }

  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

function applyPathParams(pathTemplate: string, pathParams: Record<string, string | number> | undefined): string {
  if (!pathParams) {
    return pathTemplate;
  }

  let path = pathTemplate;
  for (const [key, value] of Object.entries(pathParams)) {
    path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
  }

  return path;
}

async function parseJson<T>(response: { ok: boolean; status: number; text(): Promise<string> }): Promise<T> {
  const raw = await response.text();
  const parsed = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    const message = parsed?.error || `IAM SDK HTTP transport request failed with status ${response.status}`;
    throw new Error(message);
  }

  return parsed as T;
}

export class IamHttpTransport implements IamSdkTransport {
  readonly adapter: IamSdkAdapter = 'http';
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: IamHttpTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    if (!this.fetchImpl) {
      throw new Error('No fetch implementation available for IamHttpTransport');
    }
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  async request<T = unknown>(operation: IamSdkOperation, input?: IamSdkRequestInput): Promise<T> {
    const definition = IAM_OPERATION_DEFINITIONS[operation];
    const pathWithParams = applyPathParams(definition.path, input?.pathParams);
    const pathWithQuery = `${pathWithParams}${encodeQuery(input?.query)}`;
    const hasBody = input?.body !== undefined;

    const response = await this.fetchImpl(`${this.baseUrl}${pathWithQuery}`, {
      method: definition.method,
      headers: {
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
        ...this.defaultHeaders,
        ...buildIamSdkTelemetryHeaders(input?.context),
      },
      body: hasBody ? JSON.stringify(input?.body) : undefined,
    });

    return parseJson<T>(response);
  }
}
