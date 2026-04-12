#!/usr/bin/env node

const { spawnSync } = require('child_process')
const path = require('path')

const preflightPath = process.argv[2]
if (!preflightPath) {
  console.error('Usage: node scripts/scaffold-idp-ticket-evidence.js <preflight.json>')
  process.exit(1)
}

const genericScript = path.join(__dirname, 'scaffold-idp-runtime-cutover-evidence.js')
const result = spawnSync(
  process.execPath,
  [
    genericScript,
    preflightPath,
    '2',
    'Tickets',
    'docs/spec/plans/Headless_IAM_Ticket_Cutover_Checklist.md',
  ],
  {
    stdio: 'inherit',
  },
)

process.exit(result.status ?? 1)
