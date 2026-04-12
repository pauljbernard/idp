#!/usr/bin/env node

const fs = require('fs')

function readInput() {
  const filePath = process.argv[2]
  if (filePath) {
    return fs.readFileSync(filePath, 'utf8')
  }

  return fs.readFileSync(0, 'utf8')
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

const raw = readInput().trim()
if (!raw) {
  fail('Expected runtime cutover preflight JSON on stdin or as the first file argument.')
}

let payload
try {
  payload = JSON.parse(raw)
} catch (error) {
  fail(`Failed to parse runtime cutover preflight JSON: ${error instanceof Error ? error.message : String(error)}`)
}

const requiredFields = [
  'health_status',
  'overall_status',
  'runtime_cutover_status',
  'runtime_cutover_summary',
  'realm_id',
  'client_id',
  'base_url',
]

for (const field of requiredFields) {
  if (typeof payload[field] !== 'string' || payload[field].trim().length === 0) {
    fail(`Missing required preflight field: ${field}`)
  }
}

const lines = [
  '## Preflight Record',
  '',
  '| Field | Value |',
  '| --- | --- |',
  `| Health endpoint status | \`${payload.health_status}\` |`,
  `| Overall IAM health | \`${payload.overall_status}\` |`,
  `| Runtime cutover status | \`${payload.runtime_cutover_status}\` |`,
  `| Realm context | \`${payload.realm_id}\` |`,
  `| Client context | \`${payload.client_id}\` |`,
  `| Base URL | \`${payload.base_url}\` |`,
  payload.auth_config_source ? `| Auth config source | \`${payload.auth_config_source}\` |` : null,
  payload.health_response && typeof payload.health_response.count === 'number'
    ? `| Health check count | \`${payload.health_response.count}\` |`
    : null,
  payload.tmp_dir ? `| Captured tmp dir | \`${payload.tmp_dir}\` |` : null,
  '',
  'Preflight summary:',
  '',
  `- ${payload.runtime_cutover_summary}`,
  '',
  'Operator note:',
  '',
  '- Attach the source JSON produced by `OUTPUT_MODE=json npm run verify:idp:runtime-cutover-readiness` alongside this rendered section.',
]

process.stdout.write(lines.filter(Boolean).join('\n') + '\n')
