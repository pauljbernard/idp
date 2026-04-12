import type { IamSdkOperation } from './contracts';

export type IamSdkAdapter = 'local' | 'invoke' | 'http';

export interface IamSdkCallContext {
  correlationId?: string;
  sourceSubsystem?: string;
  targetSubsystem?: string;
  fanoutCount?: number;
  fallbackUsed?: boolean;
  sdkVersion?: string;
}

export interface IamSdkRequestInput {
  pathParams?: Record<string, string | number>;
  query?: Record<string, unknown>;
  body?: unknown;
  context?: IamSdkCallContext;
}

export interface IamSdkTransport {
  adapter: IamSdkAdapter;
  request<T = unknown>(operation: IamSdkOperation, input?: IamSdkRequestInput): Promise<T>;
}
