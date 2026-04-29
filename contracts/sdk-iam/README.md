# @idp/sdk-iam

Internal IAM SDK scaffold for standalone IDP subsystem integration.

This package provides:

- operation/path contract definitions aligned with `contracts/sdk-iam/contract-manifest.json`,
- a thin SDK client wrapper,
- `local`, `invoke`, and `http` transport adapters,
- telemetry header helpers for HTTP transport.

## Build

```bash
npm --prefix contracts/sdk-iam run build
```

## Contract Verification

```bash
npm run verify:sdk:iam-contract
```
