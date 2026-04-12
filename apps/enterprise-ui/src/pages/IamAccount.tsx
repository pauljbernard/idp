import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { KeyRound, LogOut, Shield, ShieldCheck, Users } from 'lucide-react'
import { PublicSiteShell } from '../components/public/PublicSiteShell'
import {
  clearIamSession,
  idpApi,
  getCurrentIamRealmId,
  getCurrentIamSessionId,
  type IamAccountDelegatedConsentRecord,
  type IamAccountDelegatedConsentRequestRecord,
  type IamAccountDelegatedRelationshipRecord,
  type BeginIamMfaEnrollmentResponse,
  type IamAccountConsentRecord,
  type IamAccountOrganizationsResponse,
  type IamAccountProfileResponse,
  type IamRealmExperienceResponse,
  type IamAccountSecurityResponse,
  type IamAccountSessionContextResponse,
  type IamAccountSessionSummary,
  type IamLinkedIdentityRecord,
  type IamUserProfileAttributeValue,
  type IamWebAuthnCredentialRecord,
  type BeginIamWebAuthnRegistrationResponse,
} from '../services/standaloneApi'
import {
  createIamSoftwarePasskey,
  getIamLocalPasskeyDeviceLabels,
  removeIamLocalPasskey,
} from '../utils/iamPasskeys'

export function IamAccount() {
  const navigate = useNavigate()
  const [realmId, setRealmId] = useState(() => getCurrentIamRealmId())
  const [sessionId, setSessionId] = useState(() => getCurrentIamSessionId())
  const [sessionContext, setSessionContext] = useState<IamAccountSessionContextResponse | null>(null)
  const [profile, setProfile] = useState<IamAccountProfileResponse | null>(null)
  const [security, setSecurity] = useState<IamAccountSecurityResponse | null>(null)
  const [experience, setExperience] = useState<IamRealmExperienceResponse | null>(null)
  const [sessions, setSessions] = useState<IamAccountSessionSummary[]>([])
  const [consents, setConsents] = useState<IamAccountConsentRecord[]>([])
  const [delegatedRelationships, setDelegatedRelationships] = useState<IamAccountDelegatedRelationshipRecord[]>([])
  const [delegatedConsents, setDelegatedConsents] = useState<IamAccountDelegatedConsentRecord[]>([])
  const [delegatedConsentRequests, setDelegatedConsentRequests] = useState<IamAccountDelegatedConsentRequestRecord[]>([])
  const [linkedIdentities, setLinkedIdentities] = useState<IamLinkedIdentityRecord[]>([])
  const [organizations, setOrganizations] = useState<IamAccountOrganizationsResponse['organizations']>([])
  const [passkeys, setPasskeys] = useState<IamWebAuthnCredentialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' })
  const [profileAttributes, setProfileAttributes] = useState<Record<string, IamUserProfileAttributeValue>>({})
  const [delegatedGrantForm, setDelegatedGrantForm] = useState({
    relationship_id: '',
    scope_names: '',
    purpose_names: '',
    expires_at: '',
    notes: '',
  })
  const [delegatedRequestForm, setDelegatedRequestForm] = useState({
    relationship_id: '',
    requested_scope_names: '',
    requested_purpose_names: '',
    expires_at: '',
    request_notes: '',
  })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' })
  const [emailVerification, setEmailVerification] = useState({ ticket_id: '', code: '' })
  const [mfaEnrollment, setMfaEnrollment] = useState<BeginIamMfaEnrollmentResponse | null>(null)
  const [passkeyEnrollment, setPasskeyEnrollment] = useState<BeginIamWebAuthnRegistrationResponse | null>(null)
  const [passkeyDeviceLabel, setPasskeyDeviceLabel] = useState('Primary Browser Passkey')
  const [mfaVerificationCode, setMfaVerificationCode] = useState('')
  const [disableMfaCode, setDisableMfaCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGovernanceSubmitting, setIsGovernanceSubmitting] = useState(false)

  useEffect(() => {
    const activeRealmId = getCurrentIamRealmId()
    const activeSessionId = getCurrentIamSessionId()
    if (!activeRealmId || !activeSessionId) {
      navigate('/iam/login')
      return
    }
    setRealmId(activeRealmId)
    setSessionId(activeSessionId)
  }, [navigate])

  const isCurrentAccountSession = (activeRealmId: string, activeSessionId: string) => (
    getCurrentIamRealmId() === activeRealmId && getCurrentIamSessionId() === activeSessionId
  )

  const loadAccount = async (
    activeRealmId: string,
    activeSessionId: string,
    options?: { suppressStaleFailure?: boolean },
  ) => {
    setLoading(true)
    try {
      const [
        sessionResponse,
        profileResponse,
        securityResponse,
        sessionsResponse,
        consentsResponse,
        delegatedRelationshipsResponse,
        delegatedConsentsResponse,
        delegatedConsentRequestsResponse,
        linkedIdentityResponse,
        organizationsResponse,
        passkeyResponse,
        experienceResponse,
      ] = await Promise.all([
        idpApi.getIamAccountSession(activeRealmId, activeSessionId),
        idpApi.getIamAccountProfile(activeRealmId, activeSessionId),
        idpApi.getIamAccountSecurity(activeRealmId, activeSessionId),
        idpApi.listIamAccountSessions(activeRealmId, activeSessionId),
        idpApi.listIamAccountConsents(activeRealmId, activeSessionId),
        idpApi.listIamAccountDelegatedRelationships(activeRealmId, activeSessionId),
        idpApi.listIamAccountDelegatedConsents(activeRealmId, activeSessionId),
        idpApi.listIamAccountDelegatedConsentRequests(activeRealmId, activeSessionId),
        idpApi.listIamAccountLinkedIdentities(activeRealmId, activeSessionId),
        idpApi.listIamAccountOrganizations(activeRealmId, activeSessionId),
        idpApi.listIamAccountWebAuthnCredentials(activeRealmId, activeSessionId),
        idpApi.getIamRealmExperience(activeRealmId),
      ])
      if (options?.suppressStaleFailure && !isCurrentAccountSession(activeRealmId, activeSessionId)) {
        return
      }
      setSessionContext(sessionResponse)
      setProfile(profileResponse)
      setSecurity(securityResponse)
      setSessions(sessionsResponse.sessions)
      setConsents(consentsResponse.consents)
      setDelegatedRelationships(delegatedRelationshipsResponse.delegated_relationships)
      setDelegatedConsents(delegatedConsentsResponse.delegated_consents)
      setDelegatedConsentRequests(delegatedConsentRequestsResponse.delegated_consent_requests)
      setLinkedIdentities(linkedIdentityResponse.linked_identities)
      setOrganizations(organizationsResponse.organizations)
      setPasskeys(passkeyResponse.credentials)
      setExperience(experienceResponse)
      setProfileForm({
        first_name: profileResponse.user.first_name,
        last_name: profileResponse.user.last_name,
        email: profileResponse.user.email,
      })
      setProfileAttributes(profileResponse.profile_attributes)
      const delegateRelationships = delegatedRelationshipsResponse.delegated_relationships.filter(
        (relationship) => relationship.current_party === 'DELEGATE' && relationship.status === 'ACTIVE',
      )
      const principalRelationships = delegatedRelationshipsResponse.delegated_relationships.filter(
        (relationship) => relationship.current_party === 'PRINCIPAL' && relationship.status === 'ACTIVE',
      )
      setDelegatedRequestForm((current) => ({
        ...current,
        relationship_id: delegateRelationships.some((relationship) => relationship.id === current.relationship_id)
          ? current.relationship_id
          : delegateRelationships[0]?.id ?? '',
      }))
      setDelegatedGrantForm((current) => ({
        ...current,
        relationship_id: principalRelationships.some((relationship) => relationship.id === current.relationship_id)
          ? current.relationship_id
          : principalRelationships[0]?.id ?? '',
      }))
    } catch (error: any) {
      if (options?.suppressStaleFailure && !isCurrentAccountSession(activeRealmId, activeSessionId)) {
        return
      }
      console.error('Failed to load IAM account:', error)
      clearIamSession()
      toast.error(error?.response?.data?.error ?? 'IAM account session expired')
      navigate('/iam/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!realmId || !sessionId) {
      return
    }
    void loadAccount(realmId, sessionId, { suppressStaleFailure: true })
  }, [realmId, sessionId])

  const refresh = async () => {
    if (!realmId || !sessionId) {
      return
    }
    await loadAccount(realmId, sessionId)
  }

  const localeStrings = experience?.localization.translations[experience.localization.default_locale] ?? {}
  const translate = (key: string, fallback: string) => {
    const value = localeStrings[key]
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback
  }
  const localPasskeys = sessionContext
    ? getIamLocalPasskeyDeviceLabels({
      realm_id: realmId,
      user_id: sessionContext.user.id,
    })
    : []

  const handleLogout = async () => {
    if (!realmId || !sessionId) {
      toast.dismiss()
      clearIamSession()
      navigate('/iam/login?logged_out=1')
      return
    }
    try {
      await idpApi.logoutIamAccount(realmId, sessionId)
    } catch (error) {
      console.error('IAM logout failed:', error)
    } finally {
      toast.dismiss()
      clearIamSession()
      navigate('/iam/login?logged_out=1')
    }
  }

  const handleProfileSave = async () => {
    if (!realmId || !sessionId) {
      return
    }
    setIsSubmitting(true)
    try {
      await idpApi.updateIamAccountProfile(realmId, sessionId, {
        ...profileForm,
        attributes: profileAttributes,
      })
      toast.success('IAM account profile updated')
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to update IAM profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!realmId || !sessionId || !passwordForm.current_password || !passwordForm.new_password) {
      toast.error('Enter the current and new password')
      return
    }
    setIsSubmitting(true)
    try {
      await idpApi.changeIamAccountPassword(realmId, sessionId, passwordForm)
      toast.success('IAM account password updated')
      setPasswordForm({ current_password: '', new_password: '' })
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to update IAM password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestEmailVerification = async () => {
    if (!realmId || !profile?.user.email) {
      return
    }
    try {
      const response = await idpApi.requestIamEmailVerification(realmId, {
        username_or_email: profile.user.email,
      })
      setEmailVerification((current) => ({ ...current, ticket_id: response.ticket_id }))
      toast.success(`Verification code: ${response.code_preview}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to request email verification')
    }
  }

  const handleConfirmEmailVerification = async () => {
    if (!realmId || !emailVerification.ticket_id || !emailVerification.code) {
      toast.error('Enter the verification ticket and code')
      return
    }
    try {
      await idpApi.confirmIamEmailVerification(realmId, {
        ticket_id: emailVerification.ticket_id,
        code: emailVerification.code,
      })
      toast.success('IAM email verification completed')
      setEmailVerification({ ticket_id: '', code: '' })
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to confirm email verification')
    }
  }

  const handleBeginMfa = async () => {
    if (!realmId || !sessionId) {
      return
    }
    try {
      const response = await idpApi.beginIamMfaEnrollment(realmId, sessionId)
      setMfaEnrollment(response)
      toast.success('IAM MFA enrollment started')
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to start MFA enrollment')
    }
  }

  const handleVerifyMfa = async () => {
    if (!realmId || !sessionId || !mfaEnrollment || !mfaVerificationCode.trim()) {
      toast.error('Enter the MFA verification code')
      return
    }
    try {
      await idpApi.verifyIamMfaEnrollment(realmId, sessionId, {
        enrollment_id: mfaEnrollment.enrollment_id,
        code: mfaVerificationCode,
      })
      toast.success('IAM MFA enabled')
      setMfaEnrollment(null)
      setMfaVerificationCode('')
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to verify MFA enrollment')
    }
  }

  const handleDisableMfa = async () => {
    if (!realmId || !sessionId || !disableMfaCode.trim()) {
      toast.error('Enter an authenticator or backup code')
      return
    }
    try {
      await idpApi.disableIamMfa(realmId, sessionId, {
        code: disableMfaCode,
      })
      toast.success('IAM MFA disabled')
      setDisableMfaCode('')
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to disable MFA')
    }
  }

  const handleBeginPasskeyEnrollment = async () => {
    if (!realmId || !sessionId) {
      return
    }
    try {
      const response = await idpApi.beginIamWebAuthnRegistration(realmId, sessionId)
      setPasskeyEnrollment(response)
      toast.success('Passkey enrollment started')
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to start passkey enrollment')
    }
  }

  const handleCompletePasskeyEnrollment = async () => {
    if (!realmId || !sessionId || !passkeyEnrollment || !passkeyDeviceLabel.trim()) {
      toast.error('Enter a device label and start passkey enrollment first')
      return
    }
    try {
      const localRegistration = await createIamSoftwarePasskey({
        realm_id: realmId,
        user_id: passkeyEnrollment.user_id,
        challenge_id: passkeyEnrollment.challenge_id,
        challenge: passkeyEnrollment.challenge,
        device_label: passkeyDeviceLabel.trim(),
      })
      await idpApi.completeIamWebAuthnRegistration(realmId, sessionId, {
        ...localRegistration,
        public_key_jwk: localRegistration.public_key_jwk as Record<string, unknown>,
        transports: [...localRegistration.transports],
      })
      toast.success(`Passkey registered on ${localRegistration.device_label}`)
      setPasskeyEnrollment(null)
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? error?.message ?? 'Failed to complete passkey enrollment')
    }
  }

  const handleRevokePasskey = async (credential: IamWebAuthnCredentialRecord) => {
    if (!realmId || !sessionId) {
      return
    }
    try {
      await idpApi.revokeIamAccountWebAuthnCredential(realmId, sessionId, credential.id)
      removeIamLocalPasskey({
        realm_id: realmId,
        user_id: credential.user_id,
        credential_id: credential.credential_id,
      })
      toast.success(`Revoked passkey ${credential.device_label}`)
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to revoke passkey')
    }
  }

  const handleRevokeSession = async (targetSessionId: string) => {
    if (!realmId || !sessionId) {
      return
    }
    try {
      await idpApi.revokeIamAccountSession(realmId, sessionId, targetSessionId)
      toast.success('IAM session revoked')
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to revoke IAM session')
    }
  }

  const handleRevokeOthers = async () => {
    if (!realmId || !sessionId) {
      return
    }
    try {
      const response = await idpApi.revokeOtherIamAccountSessions(realmId, sessionId)
      toast.success(`Revoked ${response.revoked_count} other IAM sessions`)
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to revoke other IAM sessions')
    }
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!realmId || !sessionId) {
      return
    }
    try {
      await idpApi.acceptIamAccountOrganizationInvitation(realmId, sessionId, invitationId)
      toast.success('Organization invitation accepted')
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to accept organization invitation')
    }
  }

  const updateProfileAttributeValue = (key: string, value: IamUserProfileAttributeValue) => {
    setProfileAttributes((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const delegateRelationships = delegatedRelationships.filter(
    (relationship) => relationship.current_party === 'DELEGATE' && relationship.status === 'ACTIVE',
  )
  const principalRelationships = delegatedRelationships.filter(
    (relationship) => relationship.current_party === 'PRINCIPAL' && relationship.status === 'ACTIVE',
  )
  const selectedDelegatedRequestRelationship = delegateRelationships.find(
    (relationship) => relationship.id === delegatedRequestForm.relationship_id,
  ) ?? delegateRelationships[0] ?? null
  const selectedDelegatedGrantRelationship = principalRelationships.find(
    (relationship) => relationship.id === delegatedGrantForm.relationship_id,
  ) ?? principalRelationships[0] ?? null

  const handleGrantDelegatedConsent = async () => {
    if (!realmId || !sessionId || !delegatedGrantForm.relationship_id) {
      toast.error('Select a delegated relationship first')
      return
    }
    const scopeNames = parseDelimitedValues(delegatedGrantForm.scope_names)
    if (scopeNames.length === 0) {
      toast.error('Enter at least one delegated scope')
      return
    }
    setIsGovernanceSubmitting(true)
    try {
      await idpApi.grantIamAccountDelegatedConsent(realmId, sessionId, {
        relationship_id: delegatedGrantForm.relationship_id,
        scope_names: scopeNames,
        purpose_names: parseDelimitedValues(delegatedGrantForm.purpose_names),
        expires_at: normalizeOptionalValue(delegatedGrantForm.expires_at),
        notes: parseDelimitedValues(delegatedGrantForm.notes),
      })
      toast.success('Delegated consent granted')
      setDelegatedGrantForm((current) => ({
        ...current,
        scope_names: '',
        purpose_names: '',
        expires_at: '',
        notes: '',
      }))
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to grant delegated consent')
    } finally {
      setIsGovernanceSubmitting(false)
    }
  }

  const handleRevokeDelegatedConsent = async (consentId: string) => {
    if (!realmId || !sessionId) {
      return
    }
    setIsGovernanceSubmitting(true)
    try {
      await idpApi.revokeIamAccountDelegatedConsent(realmId, sessionId, consentId)
      toast.success('Delegated consent revoked')
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to revoke delegated consent')
    } finally {
      setIsGovernanceSubmitting(false)
    }
  }

  const handleRequestDelegatedConsent = async () => {
    if (!realmId || !sessionId || !delegatedRequestForm.relationship_id) {
      toast.error('Select a delegated relationship first')
      return
    }
    const requestedScopeNames = parseDelimitedValues(delegatedRequestForm.requested_scope_names)
    if (requestedScopeNames.length === 0) {
      toast.error('Enter at least one requested scope')
      return
    }
    setIsGovernanceSubmitting(true)
    try {
      await idpApi.requestIamAccountDelegatedConsent(realmId, sessionId, {
        relationship_id: delegatedRequestForm.relationship_id,
        requested_scope_names: requestedScopeNames,
        requested_purpose_names: parseDelimitedValues(delegatedRequestForm.requested_purpose_names),
        expires_at: normalizeOptionalValue(delegatedRequestForm.expires_at),
        request_notes: parseDelimitedValues(delegatedRequestForm.request_notes),
      })
      toast.success('Delegated consent request created')
      setDelegatedRequestForm((current) => ({
        ...current,
        requested_scope_names: '',
        requested_purpose_names: '',
        expires_at: '',
        request_notes: '',
      }))
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to create delegated consent request')
    } finally {
      setIsGovernanceSubmitting(false)
    }
  }

  const handleApproveDelegatedConsentRequest = async (requestId: string) => {
    if (!realmId || !sessionId) {
      return
    }
    setIsGovernanceSubmitting(true)
    try {
      await idpApi.approveIamAccountDelegatedConsentRequest(realmId, sessionId, requestId)
      toast.success('Delegated consent request approved')
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to approve delegated consent request')
    } finally {
      setIsGovernanceSubmitting(false)
    }
  }

  const handleDenyDelegatedConsentRequest = async (requestId: string) => {
    if (!realmId || !sessionId) {
      return
    }
    setIsGovernanceSubmitting(true)
    try {
      await idpApi.denyIamAccountDelegatedConsentRequest(realmId, sessionId, requestId)
      toast.success('Delegated consent request denied')
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to deny delegated consent request')
    } finally {
      setIsGovernanceSubmitting(false)
    }
  }

  const handleCancelDelegatedConsentRequest = async (requestId: string) => {
    if (!realmId || !sessionId) {
      return
    }
    setIsGovernanceSubmitting(true)
    try {
      await idpApi.cancelIamAccountDelegatedConsentRequest(realmId, sessionId, requestId)
      toast.success('Delegated consent request cancelled')
      await refresh()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to cancel delegated consent request')
    } finally {
      setIsGovernanceSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PublicSiteShell contentClassName="py-16">
        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-10 text-center dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading standalone IAM account console…</p>
        </div>
      </PublicSiteShell>
    )
  }

  return (
    <PublicSiteShell contentClassName="py-10">
      <div className="space-y-6">
        <section
          className="rounded-[28px] border bg-white/90 p-8 shadow-xl shadow-slate-200/60 dark:bg-slate-900/80 dark:shadow-none"
          style={{
            borderColor: experience?.theme.surface_tint ?? undefined,
            backgroundImage: experience
              ? `linear-gradient(135deg, ${experience.theme.surface_tint}22 0%, transparent 42%)`
              : undefined,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 text-sky-700 dark:text-sky-300">
                <KeyRound className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.22em]">{experience?.theme.brand_name ?? 'Standalone IAM Account'}</span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {experience?.theme.account_title ?? translate('account_headline', `${profile?.user.first_name ?? ''} ${profile?.user.last_name ?? ''}`.trim())}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                {experience?.theme.account_subtitle ?? translate('account_subtitle', 'Manage your standalone identity profile, security posture, and linked identities.')}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Realm: <span className="font-medium text-slate-900 dark:text-white">{realmId}</span>
                {' '}| Session assurance: <span className="font-medium text-slate-900 dark:text-white">{sessionContext?.session.assurance_level}</span>
              </p>
              {experience ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Locale {experience.localization.default_locale} · Support {experience.theme.support_email}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/iam">Open Admin Console</LinkButton>
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <Card
              title="Profile"
              description="This updates the realm-local identity profile used by the standalone identity platform."
              icon={<Users className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input value={profileForm.first_name} onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))} className={inputClassName} placeholder="First name" />
                <input value={profileForm.last_name} onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))} className={inputClassName} placeholder="Last name" />
                <input value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} className={`md:col-span-2 ${inputClassName}`} placeholder="Email address" />
                {profile?.profile_schema.attributes.map((attribute) => {
                  const currentValue = profileAttributes[attribute.key]
                  if (attribute.type === 'BOOLEAN') {
                    return (
                      <label key={attribute.id} className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={Boolean(currentValue)}
                          onChange={(event) => updateProfileAttributeValue(attribute.key, event.target.checked)}
                        />
                        <span>
                          <span className="font-medium text-slate-900 dark:text-white">{attribute.label}</span>
                          {attribute.help_text ? <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{attribute.help_text}</span> : null}
                        </span>
                      </label>
                    )
                  }
                  if (attribute.type === 'ENUM' && !attribute.multivalued) {
                    return (
                      <label key={attribute.id} className="space-y-2 text-sm md:col-span-2">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{attribute.label}</span>
                        <select
                          value={typeof currentValue === 'string' ? currentValue : ''}
                          onChange={(event) => updateProfileAttributeValue(attribute.key, event.target.value || null)}
                          className={inputClassName}
                        >
                          <option value="">Select…</option>
                          {attribute.allowed_values.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        {attribute.help_text ? <p className="text-xs text-slate-500 dark:text-slate-400">{attribute.help_text}</p> : null}
                      </label>
                    )
                  }
                  return (
                    <label key={attribute.id} className="space-y-2 text-sm md:col-span-2">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{attribute.label}</span>
                      <input
                        value={Array.isArray(currentValue) ? currentValue.join(', ') : typeof currentValue === 'string' || typeof currentValue === 'number' ? String(currentValue) : ''}
                        onChange={(event) => updateProfileAttributeValue(
                          attribute.key,
                          attribute.multivalued
                            ? event.target.value.split(',').map((value) => value.trim()).filter(Boolean)
                            : event.target.value,
                        )}
                        className={inputClassName}
                        placeholder={attribute.placeholder ?? attribute.label}
                      />
                      {attribute.help_text ? <p className="text-xs text-slate-500 dark:text-slate-400">{attribute.help_text}</p> : null}
                    </label>
                  )
                })}
              </div>
              <div className="mt-5">
                <button type="button" onClick={handleProfileSave} disabled={isSubmitting} className={primaryButtonClassName}>
                  {isSubmitting ? 'Saving…' : 'Save IAM profile'}
                </button>
              </div>
            </Card>

            <Card
              title="Email verification"
              description="The standalone identity platform tracks its own verification state and required-action lifecycle."
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Status:{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {security?.email_verified_at ? `Verified ${new Date(security.email_verified_at).toLocaleString()}` : 'Verification required'}
                </span>
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={handleRequestEmailVerification} className={secondaryButtonClassName}>
                  Issue verification code
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input value={emailVerification.ticket_id} onChange={(event) => setEmailVerification((current) => ({ ...current, ticket_id: event.target.value }))} className={inputClassName} placeholder="Verification ticket" />
                <input value={emailVerification.code} onChange={(event) => setEmailVerification((current) => ({ ...current, code: event.target.value }))} className={inputClassName} placeholder="Verification code" />
              </div>
              <div className="mt-4">
                <button type="button" onClick={handleConfirmEmailVerification} className={primaryButtonClassName}>
                  Confirm email verification
                </button>
              </div>
            </Card>

            <Card
              title="Linked identities"
              description="Brokered and federated identities attached to this identity account."
              icon={<Users className="h-5 w-5" />}
            >
              <div className="space-y-3">
                {linkedIdentities.length === 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">No brokered or federated identities are linked to this account yet.</p>
                )}
                {linkedIdentities.map((record) => (
                  <div key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="font-medium text-slate-900 dark:text-white">{record.provider_name}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {record.source_type} · {record.external_username} · {record.external_email}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Linked {new Date(record.linked_at).toLocaleString()}
                      {record.last_authenticated_at ? ` · Last broker login ${new Date(record.last_authenticated_at).toLocaleString()}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title="Organizations"
              description="This account can belong to one or more B2B organizations inside the active identity realm."
              icon={<Users className="h-5 w-5" />}
            >
              <div className="space-y-3">
                {organizations.length === 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">No organization memberships or pending invitations are attached to this account yet.</p>
                )}
                {organizations.map((entry) => (
                  <div key={entry.organization.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{entry.organization.name}</div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.organization.summary}</div>
                      </div>
                      {entry.membership ? (
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {entry.membership.role} · {entry.membership.status}
                        </div>
                      ) : null}
                    </div>
                    {entry.pending_invitations.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {entry.pending_invitations.map((invitation) => (
                          <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
                            <div>
                              Pending invitation as {invitation.role}
                              {invitation.linked_identity_provider_aliases.length > 0
                                ? ` · IdPs ${invitation.linked_identity_provider_aliases.join(', ')}`
                                : ''}
                            </div>
                            <button type="button" onClick={() => handleAcceptInvitation(invitation.id)} className={secondaryButtonClassName}>
                              Accept invitation
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title="Password"
              description="Password changes update the credential store used by browser login and direct grants."
              icon={<KeyRound className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input type="password" value={passwordForm.current_password} onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))} className={inputClassName} placeholder="Current password" />
                <input type="password" value={passwordForm.new_password} onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))} className={inputClassName} placeholder="New password" />
              </div>
              <div className="mt-5">
                <button type="button" onClick={handlePasswordChange} className={primaryButtonClassName}>
                  Update password
                </button>
              </div>
            </Card>
          </section>

          <section className="space-y-6">
            <Card
              title="MFA"
              description="TOTP and backup-code flows are managed within the standalone identity platform."
              icon={<Shield className="h-5 w-5" />}
            >
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Status:{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {security?.mfa_enabled ? 'Enabled' : 'Not enabled'}
                </span>
              </p>
              {!security?.mfa_enabled && (
                <div className="mt-4 space-y-4">
                  <button type="button" onClick={handleBeginMfa} className={secondaryButtonClassName}>
                    Start MFA enrollment
                  </button>
                  {mfaEnrollment && (
                    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                      <p className="text-sm text-slate-700 dark:text-slate-200">Shared secret: <span className="font-mono">{mfaEnrollment.shared_secret}</span></p>
                      <p className="text-sm text-slate-700 dark:text-slate-200 break-all">URI: {mfaEnrollment.otpauth_uri}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {mfaEnrollment.backup_codes.map((code) => (
                          <div key={code} className="rounded-xl bg-white px-3 py-2 text-sm font-mono text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                            {code}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <input value={mfaVerificationCode} onChange={(event) => setMfaVerificationCode(event.target.value)} className={inputClassName} placeholder="Authenticator code" />
                        <button type="button" onClick={handleVerifyMfa} className={primaryButtonClassName}>
                          Verify enrollment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {security?.mfa_enabled && (
                <div className="mt-4 space-y-3">
                  <input value={disableMfaCode} onChange={(event) => setDisableMfaCode(event.target.value)} className={inputClassName} placeholder="Authenticator or backup code" />
                  <button type="button" onClick={handleDisableMfa} className={secondaryButtonClassName}>
                    Disable MFA
                  </button>
                </div>
              )}
            </Card>

            <Card
              title="Passkeys"
              description="Passkeys provide phishing-resistant sign-in and can satisfy the strong-auth step without falling back to TOTP."
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Status:{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {security?.passwordless_ready ? `${security.passkey_count} registered` : 'No passkeys registered'}
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Local device keys available here: {localPasskeys.length}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={handleBeginPasskeyEnrollment} className={secondaryButtonClassName}>
                  Start passkey enrollment
                </button>
              </div>
              {passkeyEnrollment && (
                <div className="mt-4 space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/30">
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Challenge active until {new Date(passkeyEnrollment.expires_at).toLocaleString()} for {passkeyEnrollment.display_name}.
                  </p>
                  <input
                    value={passkeyDeviceLabel}
                    onChange={(event) => setPasskeyDeviceLabel(event.target.value)}
                    className={inputClassName}
                    placeholder="Device label"
                  />
                  <button type="button" onClick={handleCompletePasskeyEnrollment} className={primaryButtonClassName}>
                    Register software passkey on this browser
                  </button>
                </div>
              )}
              <div className="mt-5 space-y-3">
                {passkeys.length === 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">No passkeys are registered for this identity account yet.</p>
                )}
                {passkeys.map((credential) => {
                  const localDevice = localPasskeys.find((record) => record.credential_id === credential.credential_id)
                  return (
                    <div key={credential.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {credential.device_label}
                          {localDevice ? ' · Available on this browser' : ''}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {credential.algorithm} · {credential.transports.join(', ')} · Registered {new Date(credential.created_at).toLocaleString()}
                        </p>
                        {credential.last_used_at && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Last used {new Date(credential.last_used_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {credential.status === 'ACTIVE' && (
                        <button type="button" onClick={() => handleRevokePasskey(credential)} className="rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          Revoke
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card
              title="Sessions"
              description="These are browser sessions issued by the standalone identity platform."
              icon={<Users className="h-5 w-5" />}
            >
              <div className="flex justify-end">
                <button type="button" onClick={handleRevokeOthers} className={secondaryButtonClassName}>
                  Revoke other sessions
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {sessions.map((session) => (
                  <div key={session.session_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {session.client_name ?? 'Account console'}{session.is_current ? ' · Current session' : ''}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {session.assurance_level} · {new Date(session.authenticated_at).toLocaleString()}
                      </p>
                    </div>
                    {!session.is_current && session.status === 'ACTIVE' && (
                      <button type="button" onClick={() => handleRevokeSession(session.session_id)} className="rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title="Consents"
              description="Each consent is stored per client and scope set within the active realm."
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              <div className="space-y-3">
                {consents.length === 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">No client consents have been granted yet.</p>
                )}
                {consents.map((consent) => (
                  <div key={consent.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{consent.client_name}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(consent.granted_at).toLocaleString()}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {consent.scope_names.map((scope) => (
                        <span key={scope} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </div>

        <Card
          title="Delegated access"
          description="Guardian, proxy, and principal-managed approval workflows are governed here from the standalone IAM account console."
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          <div className="space-y-6">
            {delegatedRelationships.length === 0 && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No delegated guardian, proxy, or representative relationships are attached to this account in the active realm.
              </p>
            )}

            {delegatedRelationships.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Relationships</h3>
                {delegatedRelationships.map((relationship) => (
                  <div key={relationship.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {relationship.counterpart_user.first_name} {relationship.counterpart_user.last_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {relationship.relationship_kind} · You are {relationship.current_party.toLowerCase()} · {relationship.counterpart_user.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={relationship.status} tone={relationship.status === 'ACTIVE' ? 'green' : 'slate'} />
                        <StatusBadge label={relationship.consent_required ? 'CONSENT REQUIRED' : 'DIRECT GRANT ALLOWED'} tone={relationship.consent_required ? 'amber' : 'blue'} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {relationship.allowed_scopes.map((scope) => (
                        <span key={scope} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {scope}
                        </span>
                      ))}
                    </div>
                    {relationship.allowed_purposes && relationship.allowed_purposes.length > 0 && (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Purposes: {relationship.allowed_purposes.join(', ')}
                      </p>
                    )}
                    {relationship.notes.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Notes: {relationship.notes.join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              {principalRelationships.length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Grant delegated consent</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Principals can grant direct delegated access without waiting for a request.
                  </p>
                  <div className="mt-4 space-y-3">
                    <select
                      value={delegatedGrantForm.relationship_id}
                      onChange={(event) => setDelegatedGrantForm((current) => ({ ...current, relationship_id: event.target.value }))}
                      className={inputClassName}
                    >
                      <option value="">Select relationship</option>
                      {principalRelationships.map((relationship) => (
                        <option key={relationship.id} value={relationship.id}>
                          {relationship.relationship_kind} · {relationship.counterpart_user.first_name} {relationship.counterpart_user.last_name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={delegatedGrantForm.scope_names}
                      onChange={(event) => setDelegatedGrantForm((current) => ({ ...current, scope_names: event.target.value }))}
                      className={inputClassName}
                      placeholder={selectedDelegatedGrantRelationship ? `Scopes, e.g. ${selectedDelegatedGrantRelationship.allowed_scopes.join(', ')}` : 'Scopes'}
                    />
                    <input
                      value={delegatedGrantForm.purpose_names}
                      onChange={(event) => setDelegatedGrantForm((current) => ({ ...current, purpose_names: event.target.value }))}
                      className={inputClassName}
                      placeholder={selectedDelegatedGrantRelationship?.allowed_purposes?.length ? `Purposes, e.g. ${selectedDelegatedGrantRelationship.allowed_purposes.join(', ')}` : 'Purposes (optional)'}
                    />
                    <input
                      value={delegatedGrantForm.expires_at}
                      onChange={(event) => setDelegatedGrantForm((current) => ({ ...current, expires_at: event.target.value }))}
                      className={inputClassName}
                      placeholder="Expires at (optional ISO timestamp)"
                    />
                    <textarea
                      value={delegatedGrantForm.notes}
                      onChange={(event) => setDelegatedGrantForm((current) => ({ ...current, notes: event.target.value }))}
                      className="min-h-[96px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="Optional notes"
                    />
                    <button type="button" onClick={handleGrantDelegatedConsent} disabled={isGovernanceSubmitting} className={primaryButtonClassName}>
                      {isGovernanceSubmitting ? 'Submitting…' : 'Grant delegated consent'}
                    </button>
                  </div>
                </div>
              )}

              {delegateRelationships.length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Request delegated consent</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Delegates can request additional access scopes for principal review and approval.
                  </p>
                  <div className="mt-4 space-y-3">
                    <select
                      value={delegatedRequestForm.relationship_id}
                      onChange={(event) => setDelegatedRequestForm((current) => ({ ...current, relationship_id: event.target.value }))}
                      className={inputClassName}
                    >
                      <option value="">Select relationship</option>
                      {delegateRelationships.map((relationship) => (
                        <option key={relationship.id} value={relationship.id}>
                          {relationship.relationship_kind} · {relationship.counterpart_user.first_name} {relationship.counterpart_user.last_name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={delegatedRequestForm.requested_scope_names}
                      onChange={(event) => setDelegatedRequestForm((current) => ({ ...current, requested_scope_names: event.target.value }))}
                      className={inputClassName}
                      placeholder={selectedDelegatedRequestRelationship ? `Requested scopes, e.g. ${selectedDelegatedRequestRelationship.allowed_scopes.join(', ')}` : 'Requested scopes'}
                    />
                    <input
                      value={delegatedRequestForm.requested_purpose_names}
                      onChange={(event) => setDelegatedRequestForm((current) => ({ ...current, requested_purpose_names: event.target.value }))}
                      className={inputClassName}
                      placeholder={selectedDelegatedRequestRelationship?.allowed_purposes?.length ? `Purposes, e.g. ${selectedDelegatedRequestRelationship.allowed_purposes.join(', ')}` : 'Purposes (optional)'}
                    />
                    <input
                      value={delegatedRequestForm.expires_at}
                      onChange={(event) => setDelegatedRequestForm((current) => ({ ...current, expires_at: event.target.value }))}
                      className={inputClassName}
                      placeholder="Expires at (optional ISO timestamp)"
                    />
                    <textarea
                      value={delegatedRequestForm.request_notes}
                      onChange={(event) => setDelegatedRequestForm((current) => ({ ...current, request_notes: event.target.value }))}
                      className="min-h-[96px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="Optional request notes"
                    />
                    <button type="button" onClick={handleRequestDelegatedConsent} disabled={isGovernanceSubmitting} className={primaryButtonClassName}>
                      {isGovernanceSubmitting ? 'Submitting…' : 'Request delegated consent'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Delegated consents</h3>
                {delegatedConsents.length === 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">No delegated consents are recorded yet.</p>
                )}
                {delegatedConsents.map((consent) => (
                  <div key={consent.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {consent.relationship_kind} · {consent.counterpart_user.first_name} {consent.counterpart_user.last_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Granted {new Date(consent.granted_at).toLocaleString()}
                          {consent.expires_at ? ` · Expires ${new Date(consent.expires_at).toLocaleString()}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={consent.status} tone={consent.status === 'ACTIVE' ? 'green' : 'slate'} />
                        <StatusBadge label={consent.current_party} tone={consent.current_party === 'PRINCIPAL' ? 'blue' : 'amber'} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {consent.scope_names.map((scope) => (
                        <span key={scope} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {scope}
                        </span>
                      ))}
                    </div>
                    {consent.purpose_names.length > 0 && (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Purposes: {consent.purpose_names.join(', ')}
                      </p>
                    )}
                    {consent.notes.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Notes: {consent.notes.join(' · ')}
                      </p>
                    )}
                    {consent.can_manage && consent.status === 'ACTIVE' && (
                      <div className="mt-4">
                        <button type="button" onClick={() => handleRevokeDelegatedConsent(consent.id)} disabled={isGovernanceSubmitting} className={secondaryButtonClassName}>
                          Revoke delegated consent
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Consent requests</h3>
                {delegatedConsentRequests.length === 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">No delegated consent requests are recorded yet.</p>
                )}
                {delegatedConsentRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {request.relationship_kind} · {request.counterpart_user.first_name} {request.counterpart_user.last_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Requested {new Date(request.requested_at).toLocaleString()}
                          {request.responded_at ? ` · Responded ${new Date(request.responded_at).toLocaleString()}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={request.status} tone={request.status === 'PENDING' ? 'amber' : request.status === 'APPROVED' ? 'green' : 'slate'} />
                        <StatusBadge label={request.current_party} tone={request.current_party === 'PRINCIPAL' ? 'blue' : 'amber'} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {request.requested_scope_names.map((scope) => (
                        <span key={scope} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {scope}
                        </span>
                      ))}
                    </div>
                    {request.requested_purpose_names.length > 0 && (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Purposes: {request.requested_purpose_names.join(', ')}
                      </p>
                    )}
                    {request.request_notes.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Request notes: {request.request_notes.join(' · ')}
                      </p>
                    )}
                    {request.decision_notes.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Decision notes: {request.decision_notes.join(' · ')}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {request.can_approve && (
                        <button type="button" onClick={() => handleApproveDelegatedConsentRequest(request.id)} disabled={isGovernanceSubmitting} className={primaryButtonClassName}>
                          Approve
                        </button>
                      )}
                      {request.can_deny && (
                        <button type="button" onClick={() => handleDenyDelegatedConsentRequest(request.id)} disabled={isGovernanceSubmitting} className={secondaryButtonClassName}>
                          Deny
                        </button>
                      )}
                      {request.can_cancel && (
                        <button type="button" onClick={() => handleCancelDelegatedConsentRequest(request.id)} disabled={isGovernanceSubmitting} className={secondaryButtonClassName}>
                          Cancel request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PublicSiteShell>
  )
}

function Card({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
        {icon}
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
      </div>
      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
      {children}
    </a>
  )
}

function StatusBadge({ label, tone }: { label: string; tone: 'green' | 'amber' | 'blue' | 'slate' }) {
  const toneClassName = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    blue: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
    slate: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  }[tone]

  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClassName}`}>
      {label.replace(/_/g, ' ')}
    </span>
  )
}

function parseDelimitedValues(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  )
}

function normalizeOptionalValue(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const inputClassName = 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white'
const primaryButtonClassName = 'rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950'
const secondaryButtonClassName = 'rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200'
