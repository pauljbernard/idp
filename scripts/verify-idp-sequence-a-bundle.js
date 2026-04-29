#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function fail(message) {
  console.error(message)
  process.exit(1)
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail(`Failed to read JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch (error) {
    fail(`Failed to read text from ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function countMatches(text, pattern) {
  const matches = text.match(pattern)
  return matches ? matches.length : 0
}

function resolveParentStatusMatrixPath(manifest, manifestPath) {
  if (manifest.parent_artifacts && typeof manifest.parent_artifacts.status_matrix_markdown === 'string') {
    return manifest.parent_artifacts.status_matrix_markdown
  }
  if (typeof manifest.status_matrix_markdown === 'string') {
    return manifest.status_matrix_markdown
  }
  return path.join(path.dirname(manifestPath), 'sequence-a-status-matrix.md')
}

function resolveStepArtifactPath(step, key, fallbackName) {
  if (step && step.artifacts && typeof step.artifacts[key] === 'string') {
    return step.artifacts[key]
  }
  return path.join(step.output_dir, fallbackName)
}

const manifestPath = process.argv[2]

if (!manifestPath) {
  fail('Usage: node scripts/verify-idp-sequence-a-bundle.js <sequence-a-manifest.json>')
}

const manifest = readJson(manifestPath)

if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) {
  fail('Sequence A manifest is missing a non-empty steps array.')
}

const outputMode = (process.env.OUTPUT_MODE || 'text').trim().toLowerCase()
const manifestKind = typeof manifest.manifest_kind === 'string' ? manifest.manifest_kind : 'unknown'
const manifestVersion = Number.isInteger(manifest.manifest_version) ? manifest.manifest_version : null
const bundleStatus = typeof manifest.bundle_status === 'string' ? manifest.bundle_status : 'unknown'
const parentStatusMatrixPath = resolveParentStatusMatrixPath(manifest, manifestPath)

const parentStatusMatrix = readText(parentStatusMatrixPath)
const parentPlaceholderCount = countMatches(parentStatusMatrix, /<fill>/g)

const stepResults = manifest.steps.map((step) => {
  const evidencePath = resolveStepArtifactPath(step, 'live_evidence_markdown', `${step.slug}-live-evidence.md`)
  const preflightPath = resolveStepArtifactPath(step, 'preflight_json', `${step.slug}-preflight.json`)
  const evidenceExists = fs.existsSync(evidencePath)
  const preflightExists = fs.existsSync(preflightPath)
  const evidenceText = evidenceExists ? readText(evidencePath) : ''
  const placeholderCount = evidenceExists ? countMatches(evidenceText, /<fill>/g) : -1
  return {
    slug: step.slug,
    step_number: step.step_number,
    entity_family: step.entity_family,
    evidence_path: evidencePath,
    preflight_path: preflightPath,
    preflight_present: preflightExists,
    evidence_present: evidenceExists,
    placeholder_count: placeholderCount,
    review_ready: preflightExists && evidenceExists && placeholderCount === 0,
  }
})

const reviewReadyCount = stepResults.filter((step) => step.review_ready).length
const missingArtifacts = stepResults.filter((step) => !step.preflight_present || !step.evidence_present)
const incompleteEvidence = stepResults.filter((step) => step.evidence_present && step.placeholder_count > 0)

function computeExpectedBundleStatus() {
  if (missingArtifacts.length > 0) {
    return 'scaffolded'
  }

  if (parentPlaceholderCount > 0 || incompleteEvidence.length > 0) {
    return 'in-progress'
  }

  return 'review-ready'
}

const expectedBundleStatus = computeExpectedBundleStatus()
const bundleStatusMatchesContent = bundleStatus === expectedBundleStatus

const payload = {
  manifest_path: manifestPath,
  manifest_kind: manifestKind,
  manifest_version: manifestVersion,
  bundle_status: bundleStatus,
  expected_bundle_status: expectedBundleStatus,
  bundle_status_matches_content: bundleStatusMatchesContent,
  parent_status_matrix_path: parentStatusMatrixPath,
  parent_status_matrix_placeholder_count: parentPlaceholderCount,
  all_steps_review_ready: reviewReadyCount === stepResults.length,
  review_ready_step_count: reviewReadyCount,
  step_count: stepResults.length,
  missing_artifact_count: missingArtifacts.length,
  incomplete_evidence_count: incompleteEvidence.length,
  steps: stepResults,
}

function exitCodeForPayload(value) {
  return value.all_steps_review_ready
    && value.parent_status_matrix_placeholder_count === 0
    && value.bundle_status_matches_content
    ? 0
    : 1
}

if (outputMode === 'markdown') {
  const lines = [
    '# Sequence A Bundle Verification',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Manifest path | \`${payload.manifest_path}\` |`,
    `| Manifest kind | \`${payload.manifest_kind}\` |`,
    `| Manifest version | \`${payload.manifest_version ?? 'unknown'}\` |`,
    `| Bundle status | \`${payload.bundle_status}\` |`,
    `| Expected bundle status | \`${payload.expected_bundle_status}\` |`,
    `| Bundle status matches content | \`${payload.bundle_status_matches_content}\` |`,
    `| Parent status matrix | \`${payload.parent_status_matrix_path}\` |`,
    `| Parent placeholder count | \`${payload.parent_status_matrix_placeholder_count}\` |`,
    `| Review-ready steps | \`${payload.review_ready_step_count}/${payload.step_count}\` |`,
    `| Missing artifact count | \`${payload.missing_artifact_count}\` |`,
    `| Incomplete evidence count | \`${payload.incomplete_evidence_count}\` |`,
    `| Overall status | \`${exitCodeForPayload(payload) === 0 ? 'PASS' : 'INCOMPLETE'}\` |`,
    '',
    '## Step Results',
    '',
    '| Step | Entity family | Preflight present | Evidence present | Placeholder count | Review-ready |',
    '| --- | --- | --- | --- | --- | --- |',
    ...payload.steps.map(
      (step) =>
        `| \`Step ${step.step_number}\` | ${step.entity_family} | \`${step.preflight_present}\` | \`${step.evidence_present}\` | \`${step.placeholder_count}\` | \`${step.review_ready}\` |`,
    ),
  ]

  process.stdout.write(`${lines.join('\n')}\n`)
  process.exit(exitCodeForPayload(payload))
}

if (outputMode === 'json') {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
  process.exit(exitCodeForPayload(payload))
}

process.stdout.write(`parent_status_matrix=${parentStatusMatrixPath}\n`)
process.stdout.write(`manifest_kind=${manifestKind}\n`)
process.stdout.write(`manifest_version=${manifestVersion ?? 'unknown'}\n`)
process.stdout.write(`bundle_status=${bundleStatus}\n`)
process.stdout.write(`expected_bundle_status=${expectedBundleStatus}\n`)
process.stdout.write(`bundle_status_matches_content=${bundleStatusMatchesContent}\n`)
process.stdout.write(`parent_status_matrix_placeholder_count=${parentPlaceholderCount}\n`)
process.stdout.write(`review_ready_steps=${reviewReadyCount}/${stepResults.length}\n`)

for (const step of stepResults) {
  process.stdout.write(
    [
      `step=${step.step_number}`,
      `slug=${step.slug}`,
      `preflight_present=${step.preflight_present}`,
      `evidence_present=${step.evidence_present}`,
      `placeholder_count=${step.placeholder_count}`,
      `review_ready=${step.review_ready}`,
    ].join(' '),
  )
  process.stdout.write('\n')
}

process.exit(exitCodeForPayload(payload))
