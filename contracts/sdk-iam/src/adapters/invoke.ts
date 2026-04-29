import type { IamSdkOperation } from '../contracts';
import type { IamSdkAdapter, IamSdkRequestInput, IamSdkTransport } from '../types';

export interface IamInvokePayload {
  operation: IamSdkOperation;
  input?: IamSdkRequestInput;
}

export interface IamInvokeResponse<T = unknown> {
  ok: boolean;
  payload?: T;
  error?: string;
}

export interface IamInvokeAdapter {
  invoke<T = unknown>(payload: IamInvokePayload): Promise<IamInvokeResponse<T>>;
}

export class IamInvokeTransport implements IamSdkTransport {
  readonly adapter: IamSdkAdapter = 'invoke';
  private readonly invokeAdapter: IamInvokeAdapter;

  constructor(invokeAdapter: IamInvokeAdapter) {
    this.invokeAdapter = invokeAdapter;
  }

  async request<T = unknown>(operation: IamSdkOperation, input?: IamSdkRequestInput): Promise<T> {
    const response = await this.invokeAdapter.invoke<T>({ operation, input });
    if (!response.ok) {
      throw new Error(response.error || `IAM invoke adapter failed for operation ${operation}`);
    }
    return response.payload as T;
  }
}
