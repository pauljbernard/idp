import React, { useEffect, useMemo, useState } from 'react'
import { BadgeInfo, Building2, Mail, Plus, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type CreateIamOrganizationInvitationRequest,
  type CreateIamOrganizationMembershipRequest,
  type CreateIamOrganizationRequest,
  type IamIdentityProviderRecord,
  type IamOrganizationInvitationRecord,
  type IamOrganizationKind,
  type IamOrganizationMembershipRecord,
  type IamOrganizationMembershipRole,
  type IamOrganizationMembershipStatus,
  type IamOrganizationRecord,
  type IamOrganizationStatus,
  type IamUserProfileAttributeDefinition,
  type IamUserProfileActorScope,
  type IamUserProfileAttributeType,
  type IamUserProfileSchemaRecord,
  type IamUserRecord,
  type UpdateIamOrganizationMembershipRequest,
  type UpdateIamOrganizationRequest,
  type UpdateIamUserProfileSchemaRequest,
} from '../../services/standaloneApi'

type SchemaAttributeForm = {
  id: string
  key: string
  label: string
  type: IamUserProfileAttributeType
  required: boolean
  multivalued: boolean
  allowedValues: string
  regexPattern: string
  placeholder: string
  helpText: string
  viewScopes: IamUserProfileActorScope[]
  editScopes: IamUserProfileActorScope[]
  orderIndex: string
}

type SchemaFormState = {
  displayName: string
  summary: string
  status: 'ACTIVE' | 'ARCHIVED'
  attributes: SchemaAttributeForm[]
}

type OrganizationFormState = {
  id: string | null
  name: string
  summary: string
  kind: IamOrganizationKind
  status: IamOrganizationStatus
  domainHint: string
  linkedAliases: string
}

type MembershipFormState = {
  id: string | null
  organizationId: string
  userId: string
  role: IamOrganizationMembershipRole
  status: IamOrganizationMembershipStatus
}

type InvitationFormState = {
  organizationId: string
  email: string
  role: IamOrganizationMembershipRole
  linkedAliases: string
}

function parseCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function emptySchemaAttribute(): SchemaAttributeForm {
  return {
    id: `new-attribute-${Math.random().toString(36).slice(2, 8)}`,
    key: '',
    label: '',
    type: 'STRING',
    required: false,
    multivalued: false,
    allowedValues: '',
    regexPattern: '',
    placeholder: '',
    helpText: '',
    viewScopes: ['SELF', 'ADMIN'],
    editScopes: ['SELF', 'ADMIN'],
    orderIndex: '10',
  }
}

function buildSchemaAttributeForm(attribute: IamUserProfileAttributeDefinition): SchemaAttributeForm {
  return {
    id: attribute.id,
    key: attribute.key,
    label: attribute.label,
    type: attribute.type,
    required: attribute.required,
    multivalued: attribute.multivalued,
    allowedValues: attribute.allowed_values.join(', '),
    regexPattern: attribute.regex_pattern ?? '',
    placeholder: attribute.placeholder ?? '',
    helpText: attribute.help_text ?? '',
    viewScopes: attribute.view_scopes,
    editScopes: attribute.edit_scopes,
    orderIndex: String(attribute.order_index),
  }
}

function buildSchemaForm(schema: IamUserProfileSchemaRecord | null): SchemaFormState {
  if (!schema) {
    return {
      displayName: '',
      summary: '',
      status: 'ACTIVE',
      attributes: [],
    }
  }
  return {
    displayName: schema.display_name,
    summary: schema.summary,
    status: schema.status,
    attributes: schema.attributes.map(buildSchemaAttributeForm),
  }
}

function emptyOrganizationForm(): OrganizationFormState {
  return {
    id: null,
    name: '',
    summary: '',
    kind: 'COMPANY',
    status: 'ACTIVE',
    domainHint: '',
    linkedAliases: '',
  }
}

function buildOrganizationForm(organization: IamOrganizationRecord): OrganizationFormState {
  return {
    id: organization.id,
    name: organization.name,
    summary: organization.summary,
    kind: organization.kind,
    status: organization.status,
    domainHint: organization.domain_hint ?? '',
    linkedAliases: organization.linked_identity_provider_aliases.join(', '),
  }
}

function emptyMembershipForm(realmId: string, organizations: IamOrganizationRecord[], users: IamUserRecord[]): MembershipFormState {
  return {
    id: null,
    organizationId: organizations[0]?.id ?? '',
    userId: users[0]?.id ?? '',
    role: 'MEMBER',
    status: 'ACTIVE',
  }
}

function emptyInvitationForm(organizations: IamOrganizationRecord[]): InvitationFormState {
  return {
    organizationId: organizations[0]?.id ?? '',
    email: '',
    role: 'MEMBER',
    linkedAliases: '',
  }
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="text-slate-500 dark:text-slate-400">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{detail}</div>
    </div>
  )
}

export function IamOrganizationsPanel({
  selectedRealmId,
  canManage,
  selectedOrganizationId = '',
  onSelectedOrganizationChange,
}: {
  selectedRealmId: string
  canManage: boolean
  selectedOrganizationId?: string
  onSelectedOrganizationChange?: (organizationId: string) => void
}) {
  const [schema, setSchema] = useState<IamUserProfileSchemaRecord | null>(null)
  const [organizations, setOrganizations] = useState<IamOrganizationRecord[]>([])
  const [memberships, setMemberships] = useState<Array<IamOrganizationMembershipRecord & {
    organization_name: string
    username: string
    email: string
  }>>([])
  const [invitations, setInvitations] = useState<Array<IamOrganizationInvitationRecord & { organization_name: string }>>([])
  const [users, setUsers] = useState<IamUserRecord[]>([])
  const [identityProviders, setIdentityProviders] = useState<IamIdentityProviderRecord[]>([])
  const [schemaForm, setSchemaForm] = useState<SchemaFormState>(buildSchemaForm(null))
  const [organizationForm, setOrganizationForm] = useState<OrganizationFormState>(emptyOrganizationForm)
  const [membershipForm, setMembershipForm] = useState<MembershipFormState>(emptyMembershipForm('', [], []))
  const [invitationForm, setInvitationForm] = useState<InvitationFormState>(emptyInvitationForm([]))
  const [loading, setLoading] = useState(false)
  const [savingSchema, setSavingSchema] = useState(false)
  const [savingOrganization, setSavingOrganization] = useState(false)
  const [savingMembership, setSavingMembership] = useState(false)
  const [savingInvitation, setSavingInvitation] = useState(false)

  const activeOrganizationId = selectedOrganizationId

  const loadRuntime = async () => {
    if (!selectedRealmId) {
      setSchema(null)
      setOrganizations([])
      setMemberships([])
      setInvitations([])
      setUsers([])
      setIdentityProviders([])
      return
    }
    setLoading(true)
    try {
      const [
        schemaResponse,
        organizationsResponse,
        membershipsResponse,
        invitationsResponse,
        usersResponse,
        identityProviderResponse,
      ] = await Promise.all([
        idpApi.listIamUserProfileSchemas({ realmId: selectedRealmId }),
        idpApi.listIamOrganizations({ realmId: selectedRealmId }),
        idpApi.listIamOrganizationMemberships({ realmId: selectedRealmId }),
        idpApi.listIamOrganizationInvitations({ realmId: selectedRealmId }),
        idpApi.listIamUsers({ realmId: selectedRealmId }),
        idpApi.listIamIdentityProviders({ realmId: selectedRealmId }),
      ])
      const nextSchema = schemaResponse.schemas[0] ?? null
      setSchema(nextSchema)
      setSchemaForm(buildSchemaForm(nextSchema))
      setOrganizations(organizationsResponse.organizations)
      setMemberships(membershipsResponse.memberships)
      setInvitations(invitationsResponse.invitations)
      setUsers(usersResponse.users)
      setIdentityProviders(identityProviderResponse.identity_providers)
      const resolvedOrganizationContextId = activeOrganizationId && organizationsResponse.organizations.some(
        (organization) => organization.id === activeOrganizationId,
      )
        ? activeOrganizationId
        : ''
      if (activeOrganizationId && !resolvedOrganizationContextId) {
        onSelectedOrganizationChange?.('')
      }
      const defaultOrganizationId = resolvedOrganizationContextId || organizationsResponse.organizations[0]?.id || ''
      setMembershipForm((current) => current.id ? current : {
        ...emptyMembershipForm(selectedRealmId, organizationsResponse.organizations, usersResponse.users),
        organizationId: defaultOrganizationId,
      })
      setInvitationForm((current) => current.organizationId ? current : {
        ...emptyInvitationForm(organizationsResponse.organizations),
        organizationId: defaultOrganizationId,
      })
    } catch (error) {
      console.error(error)
      toast.error('Failed to load organization and profile runtime')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRuntime()
  }, [selectedRealmId, activeOrganizationId])

  const identityProviderAliasSet = useMemo(
    () => new Set(identityProviders.map((provider) => provider.alias)),
    [identityProviders],
  )
  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [activeOrganizationId, organizations],
  )
  const scopedOrganizations = useMemo(
    () => activeOrganizationId
      ? organizations.filter((organization) => organization.id === activeOrganizationId)
      : organizations,
    [activeOrganizationId, organizations],
  )
  const scopedMemberships = useMemo(
    () => activeOrganizationId
      ? memberships.filter((membership) => membership.organization_id === activeOrganizationId)
      : memberships,
    [activeOrganizationId, memberships],
  )
  const scopedInvitations = useMemo(
    () => activeOrganizationId
      ? invitations.filter((invitation) => invitation.organization_id === activeOrganizationId)
      : invitations,
    [activeOrganizationId, invitations],
  )

  useEffect(() => {
    if (activeOrganizationId && !organizations.some((organization) => organization.id === activeOrganizationId)) {
      onSelectedOrganizationChange?.('')
    }
  }, [activeOrganizationId, onSelectedOrganizationChange, organizations])

  useEffect(() => {
    if (!activeOrganizationId) {
      return
    }
    setMembershipForm((current) => current.id ? current : { ...current, organizationId: activeOrganizationId })
    setInvitationForm((current) => current.organizationId ? current : { ...current, organizationId: activeOrganizationId })
  }, [activeOrganizationId])

  const handleSchemaAttributeChange = (
    attributeId: string,
    field: keyof SchemaAttributeForm,
    value: string | boolean | IamUserProfileActorScope[],
  ) => {
    setSchemaForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute) => (
        attribute.id === attributeId
          ? { ...attribute, [field]: value }
          : attribute
      )),
    }))
  }

  const buildSchemaPayload = (): UpdateIamUserProfileSchemaRequest => ({
    display_name: schemaForm.displayName.trim(),
    summary: schemaForm.summary.trim(),
    status: schemaForm.status,
    attributes: schemaForm.attributes.map((attribute, index) => ({
      id: attribute.id,
      key: attribute.key.trim(),
      label: attribute.label.trim(),
      type: attribute.type,
      required: attribute.required,
      multivalued: attribute.multivalued,
      placeholder: attribute.placeholder.trim() || null,
      help_text: attribute.helpText.trim() || null,
      allowed_values: parseCsv(attribute.allowedValues),
      regex_pattern: attribute.regexPattern.trim() || null,
      view_scopes: attribute.viewScopes,
      edit_scopes: attribute.editScopes,
      synthetic: false,
      order_index: Number(attribute.orderIndex) || (index + 1) * 10,
    })),
  })

  const handleSaveSchema = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) return
    setSavingSchema(true)
    try {
      await idpApi.updateIamUserProfileSchema(selectedRealmId, buildSchemaPayload())
      toast.success('IAM profile schema updated')
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to update IAM profile schema')
    } finally {
      setSavingSchema(false)
    }
  }

  const handleSaveOrganization = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) return
    setSavingOrganization(true)
    try {
      const payload: CreateIamOrganizationRequest | UpdateIamOrganizationRequest = {
        realm_id: selectedRealmId,
        name: organizationForm.name.trim(),
        summary: organizationForm.summary.trim(),
        kind: organizationForm.kind,
        status: organizationForm.status,
        domain_hint: organizationForm.domainHint.trim() || null,
        linked_identity_provider_aliases: parseCsv(organizationForm.linkedAliases),
      }
      if (organizationForm.id) {
        await idpApi.updateIamOrganization(organizationForm.id, payload as UpdateIamOrganizationRequest)
        toast.success('IAM organization updated')
      } else {
        await idpApi.createIamOrganization(payload as CreateIamOrganizationRequest)
        toast.success('IAM organization created')
      }
      setOrganizationForm(emptyOrganizationForm())
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to save IAM organization')
    } finally {
      setSavingOrganization(false)
    }
  }

  const handleSaveMembership = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) return
    setSavingMembership(true)
    try {
      if (membershipForm.id) {
        const payload: UpdateIamOrganizationMembershipRequest = {
          role: membershipForm.role,
          status: membershipForm.status,
        }
        await idpApi.updateIamOrganizationMembership(membershipForm.id, payload)
        toast.success('IAM organization membership updated')
      } else {
        const payload: CreateIamOrganizationMembershipRequest = {
          realm_id: selectedRealmId,
          organization_id: membershipForm.organizationId,
          user_id: membershipForm.userId,
          role: membershipForm.role,
          status: membershipForm.status,
        }
        await idpApi.createIamOrganizationMembership(payload)
        toast.success('IAM organization membership created')
      }
      setMembershipForm(emptyMembershipForm(selectedRealmId, organizations, users))
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to save IAM organization membership')
    } finally {
      setSavingMembership(false)
    }
  }

  const handleSaveInvitation = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) return
    setSavingInvitation(true)
    try {
      const payload: CreateIamOrganizationInvitationRequest = {
        realm_id: selectedRealmId,
        organization_id: invitationForm.organizationId,
        email: invitationForm.email.trim(),
        role: invitationForm.role,
        linked_identity_provider_aliases: parseCsv(invitationForm.linkedAliases),
      }
      await idpApi.createIamOrganizationInvitation(payload)
      toast.success('IAM organization invitation created')
      setInvitationForm(emptyInvitationForm(organizations))
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to create IAM organization invitation')
    } finally {
      setSavingInvitation(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await idpApi.revokeIamOrganizationInvitation(invitationId)
      toast.success('IAM organization invitation revoked')
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to revoke IAM organization invitation')
    }
  }

  if (!selectedRealmId) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
        Select a realm to manage organization and user-profile behavior.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Schemas"
          value={schema ? '1' : '0'}
          detail={schema ? `${schema.attributes.length} attributes defined` : 'No schema loaded'}
          icon={<BadgeInfo className="h-4 w-4" />}
        />
        <MetricCard
          label="Organizations"
          value={String(scopedOrganizations.length)}
          detail={activeOrganizationId ? `Filtered from ${organizations.length} organizations` : 'Realm-scoped B2B identity containers'}
          icon={<Building2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Memberships"
          value={String(scopedMemberships.length)}
          detail={activeOrganizationId ? `Filtered from ${memberships.length} memberships` : 'Linked user-to-organization identities'}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          label="Invitations"
          value={String(scopedInvitations.filter((invitation) => invitation.status === 'PENDING').length)}
          detail="Pending external organization onboarding"
          icon={<Mail className="h-4 w-4" />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Organization Context</div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Scope organization management workflows to a specific organization when needed.
        </p>
        <div className="mt-3 max-w-lg">
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={activeOrganizationId}
            onChange={(event) => onSelectedOrganizationChange?.(event.target.value)}
          >
            <option value="">All organizations in selected realm</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
        </div>
        {selectedOrganization && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/60">
            <div className="font-medium text-slate-900 dark:text-white">{selectedOrganization.name}</div>
            <div className="mt-1 text-slate-600 dark:text-slate-300">{selectedOrganization.summary}</div>
          </div>
        )}
      </div>

      <Section
        title="Profile Schema"
        description="Define schema-driven profile attributes, validation rules, and self/admin edit posture for the selected realm."
      >
        <form className="space-y-5" onSubmit={handleSaveSchema}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Display Name</span>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                value={schemaForm.displayName}
                onChange={(event) => setSchemaForm((current) => ({ ...current, displayName: event.target.value }))}
                disabled={!canManage}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Status</span>
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                value={schemaForm.status}
                onChange={(event) => setSchemaForm((current) => ({ ...current, status: event.target.value as 'ACTIVE' | 'ARCHIVED' }))}
                disabled={!canManage}
              >
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">Summary</span>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                value={schemaForm.summary}
                onChange={(event) => setSchemaForm((current) => ({ ...current, summary: event.target.value }))}
                disabled={!canManage}
              />
            </label>
          </div>

          <div className="space-y-3">
            {schemaForm.attributes.map((attribute) => (
              <div key={attribute.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="grid gap-3 md:grid-cols-4">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Key</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                      value={attribute.key}
                      onChange={(event) => handleSchemaAttributeChange(attribute.id, 'key', event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Label</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                      value={attribute.label}
                      onChange={(event) => handleSchemaAttributeChange(attribute.id, 'label', event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Type</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                      value={attribute.type}
                      onChange={(event) => handleSchemaAttributeChange(attribute.id, 'type', event.target.value as IamUserProfileAttributeType)}
                      disabled={!canManage}
                    >
                      {(['STRING', 'TEXT', 'EMAIL', 'PHONE', 'URL', 'BOOLEAN', 'NUMBER', 'DATE', 'ENUM'] as IamUserProfileAttributeType[]).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Order</span>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                      value={attribute.orderIndex}
                      onChange={(event) => handleSchemaAttributeChange(attribute.id, 'orderIndex', event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Allowed Values</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                      value={attribute.allowedValues}
                      onChange={(event) => handleSchemaAttributeChange(attribute.id, 'allowedValues', event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Regex Pattern</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                      value={attribute.regexPattern}
                      onChange={(event) => handleSchemaAttributeChange(attribute.id, 'regexPattern', event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Placeholder</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                      value={attribute.placeholder}
                      onChange={(event) => handleSchemaAttributeChange(attribute.id, 'placeholder', event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Help Text</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                      value={attribute.helpText}
                      onChange={(event) => handleSchemaAttributeChange(attribute.id, 'helpText', event.target.value)}
                      disabled={!canManage}
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={attribute.required} onChange={(event) => handleSchemaAttributeChange(attribute.id, 'required', event.target.checked)} disabled={!canManage} />
                    Required
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={attribute.multivalued} onChange={(event) => handleSchemaAttributeChange(attribute.id, 'multivalued', event.target.checked)} disabled={!canManage} />
                    Multivalued
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={attribute.viewScopes.includes('SELF')} onChange={(event) => handleSchemaAttributeChange(attribute.id, 'viewScopes', event.target.checked ? ['SELF', 'ADMIN'] : ['ADMIN'])} disabled={!canManage} />
                    Self View
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={attribute.editScopes.includes('SELF')} onChange={(event) => handleSchemaAttributeChange(attribute.id, 'editScopes', event.target.checked ? ['SELF', 'ADMIN'] : ['ADMIN'])} disabled={!canManage} />
                    Self Edit
                  </label>
                  {canManage && (
                    <button
                      type="button"
                      className="text-rose-600"
                      onClick={() => setSchemaForm((current) => ({
                        ...current,
                        attributes: current.attributes.filter((candidate) => candidate.id !== attribute.id),
                      }))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
                onClick={() => setSchemaForm((current) => ({
                  ...current,
                  attributes: [...current.attributes, emptySchemaAttribute()],
                }))}
              >
                <Plus className="h-4 w-4" />
                Add Attribute
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
                disabled={savingSchema}
              >
                {savingSchema ? 'Saving…' : 'Save Schema'}
              </button>
            </div>
          )}
        </form>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Organizations"
          description="Manage B2B organization containers, domain hints, and linked identity-provider posture for the selected realm."
        >
          <form className="space-y-4" onSubmit={handleSaveOrganization}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Name</span>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={organizationForm.name} onChange={(event) => setOrganizationForm((current) => ({ ...current, name: event.target.value }))} disabled={!canManage} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Kind</span>
                <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={organizationForm.kind} onChange={(event) => setOrganizationForm((current) => ({ ...current, kind: event.target.value as IamOrganizationKind }))} disabled={!canManage}>
                  {(['COMPANY', 'PARTNER', 'PUBLIC_SECTOR', 'TEAM', 'EDUCATION'] as IamOrganizationKind[]).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">Summary</span>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={organizationForm.summary} onChange={(event) => setOrganizationForm((current) => ({ ...current, summary: event.target.value }))} disabled={!canManage} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Status</span>
                <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={organizationForm.status} onChange={(event) => setOrganizationForm((current) => ({ ...current, status: event.target.value as IamOrganizationStatus }))} disabled={!canManage}>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Domain Hint</span>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={organizationForm.domainHint} onChange={(event) => setOrganizationForm((current) => ({ ...current, domainHint: event.target.value }))} disabled={!canManage} />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">Linked IdP Aliases</span>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={organizationForm.linkedAliases} onChange={(event) => setOrganizationForm((current) => ({ ...current, linkedAliases: event.target.value }))} disabled={!canManage} />
              </label>
            </div>
            {identityProviders.length > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Available aliases: {identityProviders.map((provider) => provider.alias).join(', ')}
              </div>
            )}
            {canManage && (
              <div className="flex gap-3">
                <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900" disabled={savingOrganization}>
                  {savingOrganization ? 'Saving…' : organizationForm.id ? 'Update Organization' : 'Create Organization'}
                </button>
                {organizationForm.id && (
                  <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" onClick={() => setOrganizationForm(emptyOrganizationForm())}>
                    Reset
                  </button>
                )}
              </div>
            )}
          </form>

          <div className="mt-5 space-y-3">
            {scopedOrganizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                onClick={() => {
                  onSelectedOrganizationChange?.(organization.id)
                  setOrganizationForm(buildOrganizationForm(organization))
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{organization.name}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{organization.summary}</div>
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{organization.kind}</div>
                </div>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {organization.linked_identity_provider_aliases.length > 0
                    ? `Linked IdPs: ${organization.linked_identity_provider_aliases.join(', ')}`
                    : 'No linked IdP aliases'}
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Memberships and Invitations"
          description="Assign users into organizations and issue realm-scoped invitations for B2B onboarding."
        >
          <form className="space-y-4" onSubmit={handleSaveMembership}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Organization</span>
                <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={membershipForm.organizationId} onChange={(event) => setMembershipForm((current) => ({ ...current, organizationId: event.target.value }))} disabled={!canManage}>
                  <option value="">Select organization</option>
                  {scopedOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">User</span>
                <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={membershipForm.userId} onChange={(event) => setMembershipForm((current) => ({ ...current, userId: event.target.value }))} disabled={!canManage || Boolean(membershipForm.id)}>
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.username} ({user.email})</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Role</span>
                <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={membershipForm.role} onChange={(event) => setMembershipForm((current) => ({ ...current, role: event.target.value as IamOrganizationMembershipRole }))} disabled={!canManage}>
                  {(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as IamOrganizationMembershipRole[]).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Status</span>
                <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={membershipForm.status} onChange={(event) => setMembershipForm((current) => ({ ...current, status: event.target.value as IamOrganizationMembershipStatus }))} disabled={!canManage}>
                  {(['ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED'] as IamOrganizationMembershipStatus[]).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            {canManage && (
              <div className="flex gap-3">
                <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900" disabled={savingMembership}>
                  {savingMembership ? 'Saving…' : membershipForm.id ? 'Update Membership' : 'Create Membership'}
                </button>
                {membershipForm.id && (
                  <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" onClick={() => setMembershipForm(emptyMembershipForm(selectedRealmId, scopedOrganizations, users))}>
                    Reset
                  </button>
                )}
              </div>
            )}
          </form>

          <form className="mt-6 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800" onSubmit={handleSaveInvitation}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Organization</span>
                <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={invitationForm.organizationId} onChange={(event) => setInvitationForm((current) => ({ ...current, organizationId: event.target.value }))} disabled={!canManage}>
                  <option value="">Select organization</option>
                  {scopedOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Email</span>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={invitationForm.email} onChange={(event) => setInvitationForm((current) => ({ ...current, email: event.target.value }))} disabled={!canManage} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Role</span>
                <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={invitationForm.role} onChange={(event) => setInvitationForm((current) => ({ ...current, role: event.target.value as IamOrganizationMembershipRole }))} disabled={!canManage}>
                  {(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as IamOrganizationMembershipRole[]).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Linked IdP Aliases</span>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={invitationForm.linkedAliases} onChange={(event) => setInvitationForm((current) => ({ ...current, linkedAliases: event.target.value }))} disabled={!canManage} />
              </label>
            </div>
            {canManage && (
              <button type="submit" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700" disabled={savingInvitation}>
                {savingInvitation ? 'Issuing…' : 'Issue Invitation'}
              </button>
            )}
          </form>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Membership Ledger</div>
              {scopedMemberships.map((membership) => (
                <button
                  key={membership.id}
                  type="button"
                  className="w-full rounded-2xl border border-slate-200 p-3 text-left hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                  onClick={() => {
                    onSelectedOrganizationChange?.(membership.organization_id)
                    setMembershipForm({
                      id: membership.id,
                      organizationId: membership.organization_id,
                      userId: membership.user_id,
                      role: membership.role,
                      status: membership.status,
                    })
                  }}
                >
                  <div className="font-medium text-slate-900 dark:text-white">{membership.username} → {membership.organization_name}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{membership.role} · {membership.status}</div>
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Invitations</div>
              {scopedInvitations.map((invitation) => (
                <div key={invitation.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="font-medium text-slate-900 dark:text-white">{invitation.email}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{invitation.organization_name} · {invitation.role} · {invitation.status}</div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {invitation.linked_identity_provider_aliases.length > 0
                      ? `IdPs: ${invitation.linked_identity_provider_aliases.filter((alias) => identityProviderAliasSet.has(alias)).join(', ')}`
                      : 'No IdP aliases'}
                  </div>
                  {canManage && invitation.status === 'PENDING' && (
                    <button type="button" className="mt-3 text-sm font-medium text-rose-600" onClick={() => handleRevokeInvitation(invitation.id)}>
                      Revoke invitation
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {loading && <div className="text-sm text-slate-500 dark:text-slate-400">Refreshing organization and schema runtime…</div>}
    </div>
  )
}
