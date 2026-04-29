import { describe, expect, it } from 'vitest'
import {
  hasStandaloneFeature,
  isStandaloneOperatorRoleId,
  isStandaloneSpecialistRoleId,
  parseStandaloneManagedRole,
  toLegacyPermissionId,
  toLegacySurfaceId,
  toStandaloneFeatureId,
  toStandaloneFeatureIds,
  toStandalonePermissionIds,
  toStandaloneSurfaceIds,
} from '../src/platform/tenantAliases'

describe('tenantAliases', () => {
  it('maps legacy features and deduplicates collections', () => {
    expect(toStandaloneFeatureId('mission_planning')).toBe('workflow_planning')
    expect(toStandaloneFeatureIds(['mission_planning', 'workflow_planning', 'fleet_management'])).toEqual([
      'workflow_planning',
      'managed_resources',
    ])
    expect(hasStandaloneFeature(['mission_planning'], 'workflow_planning')).toBe(true)
  })

  it('maps permission and surface aliases in both directions', () => {
    expect(toStandalonePermissionIds(['missions.read', 'workflows.read', 'fleet.write'])).toEqual([
      'workflows.read',
      'resources.write',
    ])
    expect(toLegacyPermissionId('public_programs.manage')).toBe('municipal_ops.manage')

    expect(toStandaloneSurfaceIds(['missions', 'workflow-detail', 'fleet'])).toEqual([
      'workflows',
      'workflow-detail',
      'resources',
    ])
    expect(toLegacySurfaceId('public-programs')).toBe('municipal-operations')
  })

  it('accepts standalone managed roles, normalizes legacy pilot aliases, and recognizes canonical role ids', () => {
    expect(parseStandaloneManagedRole('admin')).toBe('admin')
    expect(parseStandaloneManagedRole('specialist')).toBe('specialist')
    expect(parseStandaloneManagedRole('pilot')).toBe('specialist')
    expect(isStandaloneOperatorRoleId('service_operations_operator')).toBe(true)
    expect(isStandaloneOperatorRoleId('tenant_operator')).toBe(true)
    expect(isStandaloneOperatorRoleId('tenant_specialist')).toBe(false)
    expect(isStandaloneSpecialistRoleId('tenant_specialist')).toBe(true)
    expect(isStandaloneSpecialistRoleId('research_planner')).toBe(true)
    expect(isStandaloneSpecialistRoleId('tenant_operator')).toBe(false)
  })
})
