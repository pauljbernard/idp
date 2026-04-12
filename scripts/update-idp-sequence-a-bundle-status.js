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

function computeEffectiveBundleStatus(manifest, manifestPath) {
  const parentStatusMatrixPath = resolveParentStatusMatrixPath(manifest, manifestPath)
  const parentStatusMatrixExists = fs.existsSync(parentStatusMatrixPath)
  const parentPlaceholderCount = parentStatusMatrixExists
    ? countMatches(fs.readFileSync(parentStatusMatrixPath, 'utf8'), /<fill>/g)
    : -1

  let missingArtifacts = false
  let unresolvedPlaceholders = parentPlaceholderCount > 0

  for (const step of manifest.steps) {
    const preflightPath = resolveStepArtifactPath(step, 'preflight_json', `${step.slug}-preflight.json`)
    const evidencePath = resolveStepArtifactPath(step, 'live_evidence_markdown', `${step.slug}-live-evidence.md`)
    const preflightExists = fs.existsSync(preflightPath)
    const evidenceExists = fs.existsSync(evidencePath)

    if (!preflightExists || !evidenceExists) {
      missingArtifacts = true
      continue
    }

    const evidenceText = fs.readFileSync(evidencePath, 'utf8')
    if (countMatches(evidenceText, /<fill>/g) > 0) {
      unresolvedPlaceholders = true
    }
  }

  if (missingArtifacts) {
    return 'scaffolded'
  }

  if (unresolvedPlaceholders) {
    return 'in-progress'
  }

  return 'review-ready'
}

const manifestPath = process.argv[2]

if (!manifestPath) {
  fail('Usage: node scripts/update-idp-sequence-a-bundle-status.js <sequence-a-manifest.json>')
}

const manifest = readJson(manifestPath)

if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) {
  fail('Sequence A manifest is missing a non-empty steps array.')
}

const previousStatus = typeof manifest.bundle_status === 'string' ? manifest.bundle_status : 'unknown'
const nextStatus = computeEffectiveBundleStatus(manifest, manifestPath)

manifest.bundle_status = nextStatus

try {
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
} catch (error) {
  fail(`Failed to write updated manifest to ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`)
}

process.stdout.write(`manifest_path=${manifestPath}\n`)
process.stdout.write(`previous_bundle_status=${previousStatus}\n`)
process.stdout.write(`updated_bundle_status=${nextStatus}\n`)
