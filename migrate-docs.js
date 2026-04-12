#!/usr/bin/env node

/**
 * IDP Platform Documentation Migration Script
 *
 * Safely migrates existing documentation to the new agent-optimized structure
 * while preserving all content and adding structured metadata.
 */

const fs = require('fs');
const path = require('path');

// Migration mapping from old paths to new paths
const MIGRATION_MAP = {
  // Analysis documents - preserve as-is with metadata
  'docs/analysis/IDP_SaaS_Readiness_Assessment.md': 'docs-new/analysis/saas-readiness-assessment.md',
  'docs/analysis/IDP_vs_Keycloak_Competitive_Analysis.md': 'docs-new/analysis/competitive-analysis.md',
  'docs/analysis/Test_Suite_Comprehensive_Analysis.md': 'docs-new/analysis/test-suite-analysis.md',

  // Foundation documents - reorganize core concepts
  'docs/spec/constitution.idp.md': 'docs-new/foundation/design-principles.md',
  'docs/spec/requirements.idp.md': 'docs-new/specs/platform-requirements.md',
  'docs/spec/capability-maturity-standard.idp.md': 'docs-new/reference/maturity-model.md',

  // Feature specs - move to appropriate spec domains
  'docs/features/authentication/oauth-oidc-flows.md': 'docs-new/specs/authentication/oauth-flows.md', // Already created
  'docs/design/README.md': 'docs-new/specs/ui/design-system.md',
  'docs/design/components/buttons.md': 'docs-new/specs/ui/component-specs.md',
  'docs/design/foundations/color-palette.md': 'docs-new/specs/ui/design-tokens.md',
  'docs/ux/README.md': 'docs-new/specs/ui/information-architecture.md',
  'docs/ux/style-guide.md': 'docs-new/specs/ui/interaction-patterns.md',

  // Implementation plans - reorganize by domain
  'docs/spec/plans/Headless_IAM_Full_IDP_Implementation_Plan.md': 'docs-new/implementation/deployment/implementation-plan.md',
  'docs/spec/plans/Headless_IAM_Standalone_Implementation_Roadmap.md': 'docs-new/implementation/deployment/roadmap.md',
  'docs/spec/plans/Headless_IAM_Gap_Remediation_Plan.md': 'docs-new/implementation/deployment/gap-remediation.md',
  'docs/spec/plans/Headless_IAM_Keycloak_Parity_Plan.md': 'docs-new/implementation/deployment/migration-from-keycloak.md',

  // Operational procedures
  'docs/spec/plans/Headless_IAM_Runtime_Cutover_Runbook.md': 'docs-new/implementation/deployment/cutover-runbook.md',
  'docs/spec/plans/Headless_IAM_Runtime_Cutover_Environment_Readiness.md': 'docs-new/implementation/deployment/environment-readiness.md',
  'docs/spec/plans/Headless_IAM_Deployment_Mode_Matrix.md': 'docs-new/specs/operations/deployment-modes.md',

  // Support matrices and checklists - reference material
  'docs/spec/plans/Headless_IAM_Protocol_Support_Matrix.md': 'docs-new/reference/protocol-support-matrix.md',
  'docs/spec/plans/Headless_IAM_Passkey_Support_Matrix.md': 'docs-new/reference/webauthn-support-matrix.md',
  'docs/spec/plans/Headless_IAM_SAML_Profile_Matrix.md': 'docs-new/reference/saml-profile-matrix.md',
  'docs/spec/plans/Headless_IAM_Federation_Support_Matrix.md': 'docs-new/reference/federation-support-matrix.md',

  // User documentation
  'docs/wiki/Home.md': 'docs-new/implementation/quick-start/getting-started.md',
  'docs/idp-manifest.md': 'docs-new/reference/platform-manifest.md',

  // Keep article as-is
  'docs/articles/spec-driven-idp-medium-article.md': 'docs-new/analysis/spec-driven-development.md'
};

// Metadata templates for different document types
const METADATA_TEMPLATES = {
  foundation: {
    type: 'foundation',
    status: 'stable',
    tags: ['architecture', 'foundation']
  },
  specification: {
    type: 'specification',
    status: 'stable',
    tags: ['specification', 'technical']
  },
  implementation: {
    type: 'implementation',
    status: 'stable',
    tags: ['implementation', 'guide']
  },
  reference: {
    type: 'reference',
    status: 'stable',
    tags: ['reference', 'lookup']
  },
  analysis: {
    type: 'analysis',
    status: 'stable',
    tags: ['analysis', 'business']
  }
};

// Generate metadata based on new file path
function generateMetadata(newPath, title) {
  const pathParts = newPath.split('/');
  const domain = pathParts[1]; // foundation, specs, implementation, reference, analysis
  const subdomain = pathParts[2] || 'general';

  // Determine document type from path
  let docType = 'reference';
  if (domain === 'foundation') docType = 'foundation';
  else if (domain === 'specs') docType = 'specification';
  else if (domain === 'implementation') docType = 'implementation';
  else if (domain === 'reference') docType = 'reference';
  else if (domain === 'analysis') docType = 'analysis';

  const template = METADATA_TEMPLATES[docType];

  // Generate unique ID from filename
  const filename = path.basename(newPath, '.md');
  const id = filename.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();

  // Basic dependencies based on type
  let dependencies = [];
  if (docType === 'specification' || docType === 'implementation') {
    dependencies = ['platform-architecture'];
  }

  return {
    id,
    type: template.type,
    domain: subdomain,
    status: template.status,
    version: '"1.0"',
    dependencies,
    tags: [...template.tags, subdomain],
    last_updated: '"2024-04-12"',
    related: []
  };
}

// Convert filename to title
function filenameToTitle(filename) {
  return filename
    .replace(/\.md$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// Add metadata frontmatter to content
function addMetadata(content, metadata) {
  const frontmatter = [
    '---',
    `id: ${metadata.id}`,
    `type: ${metadata.type}`,
    `domain: ${metadata.domain}`,
    `status: ${metadata.status}`,
    `version: ${metadata.version}`,
    `dependencies: [${metadata.dependencies.join(', ')}]`,
    `tags: [${metadata.tags.map(t => `${t}`).join(', ')}]`,
    `last_updated: ${metadata.last_updated}`,
    `related: [${metadata.related.join(', ')}]`,
    '---',
    ''
  ].join('\n');

  // If content already has frontmatter, replace it
  if (content.startsWith('---\n')) {
    const endIndex = content.indexOf('\n---\n', 4);
    if (endIndex !== -1) {
      content = content.substring(endIndex + 5);
    }
  }

  return frontmatter + content;
}

// Ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Main migration function
function migrateDocumentation() {
  console.log('🚀 Starting IDP Platform documentation migration...');
  console.log(`📄 Processing ${Object.keys(MIGRATION_MAP).length} documents`);

  let processed = 0;
  let errors = 0;

  // Process each file in the migration map
  for (const [oldPath, newPath] of Object.entries(MIGRATION_MAP)) {
    try {
      if (!fs.existsSync(oldPath)) {
        console.log(`⚠️  Source file not found: ${oldPath}`);
        continue;
      }

      // Read original content
      const originalContent = fs.readFileSync(oldPath, 'utf8');
      const title = filenameToTitle(path.basename(newPath));

      // Generate metadata
      const metadata = generateMetadata(newPath, title);

      // Add metadata to content
      const newContent = addMetadata(originalContent, metadata);

      // Ensure target directory exists
      ensureDir(path.dirname(newPath));

      // Write migrated content
      fs.writeFileSync(newPath, newContent, 'utf8');

      console.log(`✅ Migrated: ${oldPath} → ${newPath}`);
      processed++;

    } catch (error) {
      console.error(`❌ Error migrating ${oldPath}: ${error.message}`);
      errors++;
    }
  }

  // Handle remaining files not in migration map
  const remainingFiles = findRemainingFiles();
  for (const filePath of remainingFiles) {
    try {
      const newPath = generateNewPath(filePath);
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const title = filenameToTitle(path.basename(newPath));
      const metadata = generateMetadata(newPath, title);
      const newContent = addMetadata(originalContent, metadata);

      ensureDir(path.dirname(newPath));
      fs.writeFileSync(newPath, newContent, 'utf8');

      console.log(`✅ Auto-migrated: ${filePath} → ${newPath}`);
      processed++;

    } catch (error) {
      console.error(`❌ Error auto-migrating ${filePath}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successfully processed: ${processed} files`);
  console.log(`❌ Errors: ${errors} files`);
  console.log('🎉 Migration complete!');

  if (errors === 0) {
    console.log('\n🔄 Next steps:');
    console.log('1. Review migrated content in docs-new/');
    console.log('2. Validate all cross-references');
    console.log('3. Test with agents for navigation');
    console.log('4. Replace docs/ with docs-new/');
  }
}

// Find files not explicitly mapped
function findRemainingFiles() {
  const allMdFiles = [];

  function scan(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scan(fullPath);
        } else if (file.endsWith('.md')) {
          allMdFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore directories that don't exist or can't be read
    }
  }

  scan('docs');

  // Filter out files already in migration map
  return allMdFiles.filter(file => !MIGRATION_MAP[file]);
}

// Generate new path for unmapped files
function generateNewPath(oldPath) {
  const pathParts = oldPath.split('/');
  const filename = pathParts[pathParts.length - 1];

  // Try to categorize based on old path
  if (oldPath.includes('/plans/')) {
    if (filename.includes('Cutover') || filename.includes('Evidence')) {
      return `docs-new/implementation/deployment/${filename.toLowerCase().replace(/_/g, '-')}`;
    } else if (filename.includes('Matrix') || filename.includes('Support')) {
      return `docs-new/reference/${filename.toLowerCase().replace(/_/g, '-')}`;
    } else {
      return `docs-new/implementation/planning/${filename.toLowerCase().replace(/_/g, '-')}`;
    }
  } else if (oldPath.includes('/spec/')) {
    return `docs-new/specs/general/${filename.toLowerCase().replace(/_/g, '-')}`;
  } else {
    return `docs-new/reference/${filename.toLowerCase().replace(/_/g, '-')}`;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDocumentation();
}

module.exports = { migrateDocumentation, MIGRATION_MAP, generateMetadata };