import type { IamSdkOperation } from '../contracts';
import type { IamSdkAdapter, IamSdkRequestInput, IamSdkTransport } from '../types';

export interface IamLocalHandlerSet {
  request<T = unknown>(operation: IamSdkOperation, input?: IamSdkRequestInput): Promise<T> | T;
}

export class IamLocalTransport implements IamSdkTransport {
  readonly adapter: IamSdkAdapter = 'local';
  private readonly handlers: IamLocalHandlerSet;

  constructor(handlers: IamLocalHandlerSet) {
    this.handlers = handlers;
  }

  async request<T = unknown>(operation: IamSdkOperation, input?: IamSdkRequestInput): Promise<T> {
    return this.handlers.request<T>(operation, input);
  }
}
