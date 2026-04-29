import { IAM_SDK_NAME, IAM_SDK_VERSION } from './contracts';
import type { IamSdkCallContext } from './types';

export function buildIamSdkTelemetryHeaders(context?: IamSdkCallContext): Record<string, string> {
  const headers: Record<string, string> = {
    'x-idp-call-direction': 'east_west',
    'x-idp-integration-adapter': 'http',
    'x-idp-sdk-name': IAM_SDK_NAME,
    'x-idp-sdk-version': context?.sdkVersion?.trim() || IAM_SDK_VERSION,
    'x-idp-source-subsystem': context?.sourceSubsystem?.trim() || 'unknown',
    'x-idp-target-subsystem': context?.targetSubsystem?.trim() || 'iam',
  };

  if (context?.correlationId?.trim()) {
    headers['x-correlation-id'] = context.correlationId.trim();
  }

  if (typeof context?.fanoutCount === 'number' && Number.isFinite(context.fanoutCount)) {
    headers['x-idp-fanout-count'] = String(Math.max(0, Math.floor(context.fanoutCount)));
  }

  if (context?.fallbackUsed) {
    headers['x-idp-fallback-used'] = 'true';
    headers['x-idp-integration-outcome'] = 'fallback';
  }

  return headers;
}
