import React, { useEffect, useMemo, useState } from 'react'
import { Globe2, Mail, Palette, Send, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type IamNotificationDeliveriesResponse,
  type IamNotificationTemplateKey,
  type IamNotificationTemplateRecord,
  type IamRealmExperienceResponse,
  type IamRealmLocalizationMode,
  type IamRealmThemePreset,
} from '../../services/standaloneApi'

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

type ThemeFormState = {
  preset: IamRealmThemePreset
  brandName: string
  logoLabel: string
  supportEmail: string
  supportUrl: string
  docsUrl: string
  primaryColor: string
  accentColor: string
  surfaceTint: string
  loginTitle: string
  loginSubtitle: string
  accountTitle: string
  accountSubtitle: string
  adminTitle: string
  adminSubtitle: string
  footerNote: string
}

type LocalizationFormState = {
  defaultLocale: string
  supportedLocales: string
  mode: IamRealmLocalizationMode
  translationsJson: string
}

type NotificationTemplateFormState = {
  id: string | null
  key: IamNotificationTemplateKey
  name: string
  subjectTemplate: string
  bodyTemplate: string
  ctaLabel: string
}

type RealmAttributeRecord = {
  id: string
  realm_id: string
  key: string
  value: string
  updated_at: string
  updated_by_user_id: string
}

type RealmAttributeFormState = {
  originalKey: string | null
  key: string
  value: string
}

function emptyThemeForm(): ThemeFormState {
  return {
    preset: 'PLATFORM_DEFAULT',
    brandName: '',
    logoLabel: '',
    supportEmail: '',
    supportUrl: '',
    docsUrl: '',
    primaryColor: '#0f172a',
    accentColor: '#2563eb',
    surfaceTint: '#e2e8f0',
    loginTitle: '',
    loginSubtitle: '',
    accountTitle: '',
    accountSubtitle: '',
    adminTitle: '',
    adminSubtitle: '',
    footerNote: '',
  }
}

function emptyLocalizationForm(): LocalizationFormState {
  return {
    defaultLocale: 'en-US',
    supportedLocales: 'en-US, es-US',
    mode: 'REALM_DEFAULT',
    translationsJson: '{}',
  }
}

function emptyTemplateForm(): NotificationTemplateFormState {
  return {
    id: null,
    key: 'TEST_NOTIFICATION',
    name: '',
    subjectTemplate: '',
    bodyTemplate: '',
    ctaLabel: '',
  }
}

function emptyAttributeForm(): RealmAttributeFormState {
  return {
    originalKey: null,
    key: '',
    value: '',
  }
}

function buildThemeForm(experience: IamRealmExperienceResponse): ThemeFormState {
  return {
    preset: experience.theme.preset,
    brandName: experience.theme.brand_name,
    logoLabel: experience.theme.logo_label,
    supportEmail: experience.theme.support_email,
    supportUrl: experience.theme.support_url ?? '',
    docsUrl: experience.theme.docs_url ?? '',
    primaryColor: experience.theme.primary_color,
    accentColor: experience.theme.accent_color,
    surfaceTint: experience.theme.surface_tint,
    loginTitle: experience.theme.login_title,
    loginSubtitle: experience.theme.login_subtitle,
    accountTitle: experience.theme.account_title,
    accountSubtitle: experience.theme.account_subtitle,
    adminTitle: experience.theme.admin_title,
    adminSubtitle: experience.theme.admin_subtitle,
    footerNote: experience.theme.footer_note,
  }
}

function buildLocalizationForm(experience: IamRealmExperienceResponse): LocalizationFormState {
  return {
    defaultLocale: experience.localization.default_locale,
    supportedLocales: experience.localization.supported_locales.join(', '),
    mode: experience.localization.mode,
    translationsJson: stringifyJson(experience.localization.translations),
  }
}

function buildTemplateForm(template: IamNotificationTemplateRecord): NotificationTemplateFormState {
  return {
    id: template.id,
    key: template.key,
    name: template.name,
    subjectTemplate: template.subject_template,
    bodyTemplate: template.body_template,
    ctaLabel: template.cta_label ?? '',
  }
}

export function IamExperiencePanel({
  selectedRealmId,
  canManage,
}: {
  selectedRealmId: string
  canManage: boolean
}) {
  const [experience, setExperience] = useState<IamRealmExperienceResponse | null>(null)
  const [templates, setTemplates] = useState<IamNotificationTemplateRecord[]>([])
  const [deliveries, setDeliveries] = useState<IamNotificationDeliveriesResponse['notification_deliveries']>([])
  const [realmAttributes, setRealmAttributes] = useState<RealmAttributeRecord[]>([])
  const [themeForm, setThemeForm] = useState<ThemeFormState>(emptyThemeForm)
  const [localizationForm, setLocalizationForm] = useState<LocalizationFormState>(emptyLocalizationForm)
  const [templateForm, setTemplateForm] = useState<NotificationTemplateFormState>(emptyTemplateForm)
  const [attributeForm, setAttributeForm] = useState<RealmAttributeFormState>(emptyAttributeForm)
  const [templatePreview, setTemplatePreview] = useState<{ subject: string; body: string } | null>(null)
  const [testRecipient, setTestRecipient] = useState('ops@iam.local')
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingTheme, setIsSavingTheme] = useState(false)
  const [isSavingLocalization, setIsSavingLocalization] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [isSavingAttribute, setIsSavingAttribute] = useState(false)
  const [deletingAttributeKey, setDeletingAttributeKey] = useState<string | null>(null)
  const [isSendingTest, setIsSendingTest] = useState(false)

  const loadExperience = async () => {
    if (!selectedRealmId) {
      setExperience(null)
      setTemplates([])
      setDeliveries([])
      setRealmAttributes([])
      return
    }
    setIsLoading(true)
    try {
      const [experienceResponse, templateResponse, deliveryResponse, attributeResponse] = await Promise.all([
        idpApi.getIamRealmExperience(selectedRealmId),
        idpApi.listIamNotificationTemplates(selectedRealmId),
        idpApi.listIamNotificationDeliveries(selectedRealmId),
        idpApi.listIamRealmAttributes(selectedRealmId),
      ])
      setExperience(experienceResponse)
      setTemplates(templateResponse.notification_templates)
      setDeliveries(deliveryResponse.notification_deliveries)
      setThemeForm(buildThemeForm(experienceResponse))
      setLocalizationForm(buildLocalizationForm(experienceResponse))
      setTemplateForm(templateResponse.notification_templates[0] ? buildTemplateForm(templateResponse.notification_templates[0]) : emptyTemplateForm())
      setRealmAttributes((attributeResponse as { attributes: RealmAttributeRecord[] }).attributes)
      setAttributeForm(emptyAttributeForm())
      setTemplatePreview(null)
    } catch (error) {
      console.error('Failed to load IAM realm experience', error)
      toast.error('Failed to load IAM realm experience')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadExperience()
  }, [selectedRealmId])

  const activeLocalePreview = useMemo(() => {
    if (!experience) {
      return {}
    }
    return experience.localization.translations[localizationForm.defaultLocale] ?? {}
  }, [experience, localizationForm.defaultLocale])

  const handleThemeSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) {
      return
    }
    setIsSavingTheme(true)
    try {
      await idpApi.updateIamRealmTheme(selectedRealmId, {
        preset: themeForm.preset,
        brand_name: themeForm.brandName,
        logo_label: themeForm.logoLabel,
        support_email: themeForm.supportEmail,
        support_url: themeForm.supportUrl || null,
        docs_url: themeForm.docsUrl || null,
        primary_color: themeForm.primaryColor,
        accent_color: themeForm.accentColor,
        surface_tint: themeForm.surfaceTint,
        login_title: themeForm.loginTitle,
        login_subtitle: themeForm.loginSubtitle,
        account_title: themeForm.accountTitle,
        account_subtitle: themeForm.accountSubtitle,
        admin_title: themeForm.adminTitle,
        admin_subtitle: themeForm.adminSubtitle,
        footer_note: themeForm.footerNote,
      })
      toast.success('IAM realm theme updated')
      await loadExperience()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to update realm theme')
    } finally {
      setIsSavingTheme(false)
    }
  }

  const handleLocalizationSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) {
      return
    }
    setIsSavingLocalization(true)
    try {
      const translations = JSON.parse(localizationForm.translationsJson) as Record<string, Record<string, string>>
      await idpApi.updateIamRealmLocalization(selectedRealmId, {
        default_locale: localizationForm.defaultLocale,
        supported_locales: parseList(localizationForm.supportedLocales),
        mode: localizationForm.mode,
        translations,
      })
      toast.success('IAM realm localization updated')
      await loadExperience()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to update realm localization')
    } finally {
      setIsSavingLocalization(false)
    }
  }

  const handleTemplateSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId || !templateForm.id) {
      return
    }
    setIsSavingTemplate(true)
    try {
      await idpApi.updateIamNotificationTemplate(selectedRealmId, templateForm.id, {
        name: templateForm.name,
        subject_template: templateForm.subjectTemplate,
        body_template: templateForm.bodyTemplate,
        cta_label: templateForm.ctaLabel || null,
      })
      toast.success('IAM notification template updated')
      await loadExperience()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to update notification template')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handlePreviewTemplate = async () => {
    if (!selectedRealmId || !templateForm.id) {
      return
    }
    try {
      const preview = await idpApi.previewIamNotificationTemplate(selectedRealmId, templateForm.id, {
        code: '482913',
      })
      setTemplatePreview({
        subject: preview.subject,
        body: preview.body,
      })
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to preview notification template')
    }
  }

  const handleSendTest = async () => {
    if (!selectedRealmId || !testRecipient.trim()) {
      toast.error('Enter a test recipient email')
      return
    }
    setIsSendingTest(true)
    try {
      await idpApi.sendIamTestNotification(selectedRealmId, {
        template_key: templateForm.key,
        recipient_email: testRecipient.trim(),
        variables: {
          code: '482913',
        },
      })
      toast.success('IAM notification test delivered')
      await loadExperience()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to send test notification')
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleAttributeSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) {
      return
    }
    setIsSavingAttribute(true)
    try {
      if (attributeForm.originalKey) {
        await idpApi.updateIamRealmAttribute(selectedRealmId, attributeForm.originalKey, {
          key: attributeForm.key,
          value: attributeForm.value,
        })
        toast.success('Realm attribute updated')
      } else {
        await idpApi.createIamRealmAttribute(selectedRealmId, {
          key: attributeForm.key,
          value: attributeForm.value,
        })
        toast.success('Realm attribute created')
      }
      await loadExperience()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to save realm attribute')
    } finally {
      setIsSavingAttribute(false)
    }
  }

  const handleDeleteAttribute = async (key: string) => {
    if (!selectedRealmId) {
      return
    }
    setDeletingAttributeKey(key)
    try {
      await idpApi.deleteIamRealmAttribute(selectedRealmId, key)
      toast.success('Realm attribute deleted')
      await loadExperience()
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to delete realm attribute')
    } finally {
      setDeletingAttributeKey(null)
    }
  }

  if (!selectedRealmId) {
    return null
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Phase 5</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Realm Experience</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Theme, localization, branded notifications, and operator-facing realm presentation now live in the standalone IAM subsystem.
          </p>
        </div>
        <div
          className="min-w-[280px] rounded-2xl border px-5 py-4 shadow-sm"
          style={{
            borderColor: themeForm.surfaceTint,
            background: `linear-gradient(135deg, ${themeForm.surfaceTint} 0%, ${themeForm.primaryColor}12 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-white"
              style={{ backgroundColor: themeForm.accentColor }}
            >
              {themeForm.logoLabel || 'IAM'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{themeForm.brandName || experience?.realm.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{themeForm.loginTitle || 'Realm login experience'}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{themeForm.footerNote || 'Standalone IAM validation runtime'}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Loading realm experience…
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel title="Theme and Branding" icon={<Palette className="h-5 w-5 text-slate-700 dark:text-slate-200" />}>
              <form className="grid gap-4" onSubmit={handleThemeSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledInput label="Brand name" value={themeForm.brandName} onChange={(value) => setThemeForm((current) => ({ ...current, brandName: value }))} />
                  <LabeledInput label="Logo label" value={themeForm.logoLabel} onChange={(value) => setThemeForm((current) => ({ ...current, logoLabel: value }))} />
                  <LabeledSelect label="Preset" value={themeForm.preset} onChange={(value) => setThemeForm((current) => ({ ...current, preset: value as IamRealmThemePreset }))} options={['PLATFORM_DEFAULT', 'OCEAN', 'FOREST', 'SUNSET', 'SLATE']} />
                  <LabeledInput label="Support email" value={themeForm.supportEmail} onChange={(value) => setThemeForm((current) => ({ ...current, supportEmail: value }))} />
                  <LabeledInput label="Support URL" value={themeForm.supportUrl} onChange={(value) => setThemeForm((current) => ({ ...current, supportUrl: value }))} />
                  <LabeledInput label="Docs URL" value={themeForm.docsUrl} onChange={(value) => setThemeForm((current) => ({ ...current, docsUrl: value }))} />
                  <LabeledInput label="Primary color" value={themeForm.primaryColor} onChange={(value) => setThemeForm((current) => ({ ...current, primaryColor: value }))} />
                  <LabeledInput label="Accent color" value={themeForm.accentColor} onChange={(value) => setThemeForm((current) => ({ ...current, accentColor: value }))} />
                  <LabeledInput label="Surface tint" value={themeForm.surfaceTint} onChange={(value) => setThemeForm((current) => ({ ...current, surfaceTint: value }))} />
                  <LabeledInput label="Footer note" value={themeForm.footerNote} onChange={(value) => setThemeForm((current) => ({ ...current, footerNote: value }))} />
                </div>
                <LabeledInput label="Login title" value={themeForm.loginTitle} onChange={(value) => setThemeForm((current) => ({ ...current, loginTitle: value }))} />
                <LabeledTextarea label="Login subtitle" value={themeForm.loginSubtitle} onChange={(value) => setThemeForm((current) => ({ ...current, loginSubtitle: value }))} rows={2} />
                <LabeledInput label="Account title" value={themeForm.accountTitle} onChange={(value) => setThemeForm((current) => ({ ...current, accountTitle: value }))} />
                <LabeledTextarea label="Account subtitle" value={themeForm.accountSubtitle} onChange={(value) => setThemeForm((current) => ({ ...current, accountSubtitle: value }))} rows={2} />
                <LabeledInput label="Admin title" value={themeForm.adminTitle} onChange={(value) => setThemeForm((current) => ({ ...current, adminTitle: value }))} />
                <LabeledTextarea label="Admin subtitle" value={themeForm.adminSubtitle} onChange={(value) => setThemeForm((current) => ({ ...current, adminSubtitle: value }))} rows={2} />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!canManage || isSavingTheme}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {isSavingTheme ? 'Saving…' : 'Save Theme'}
                  </button>
                </div>
              </form>
            </Panel>

            <Panel title="Localization" icon={<Globe2 className="h-5 w-5 text-slate-700 dark:text-slate-200" />}>
              <form className="grid gap-4" onSubmit={handleLocalizationSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledInput label="Default locale" value={localizationForm.defaultLocale} onChange={(value) => setLocalizationForm((current) => ({ ...current, defaultLocale: value }))} />
                  <LabeledSelect label="Mode" value={localizationForm.mode} onChange={(value) => setLocalizationForm((current) => ({ ...current, mode: value as IamRealmLocalizationMode }))} options={['REALM_DEFAULT', 'CUSTOM']} />
                </div>
                <LabeledInput label="Supported locales" value={localizationForm.supportedLocales} onChange={(value) => setLocalizationForm((current) => ({ ...current, supportedLocales: value }))} />
                <LabeledTextarea
                  label="Translations JSON"
                  value={localizationForm.translationsJson}
                  onChange={(value) => setLocalizationForm((current) => ({ ...current, translationsJson: value }))}
                  rows={14}
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-white">Active locale preview</p>
                  <p className="mt-2">login_headline: {String(activeLocalePreview.login_headline ?? '')}</p>
                  <p>account_headline: {String(activeLocalePreview.account_headline ?? '')}</p>
                  <p>admin_headline: {String(activeLocalePreview.admin_headline ?? '')}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!canManage || isSavingLocalization}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {isSavingLocalization ? 'Saving…' : 'Save Localization'}
                  </button>
                </div>
              </form>
            </Panel>
          </div>

          <Panel title="Realm Attributes" icon={<Sparkles className="h-5 w-5 text-slate-700 dark:text-slate-200" />}>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                Realm attributes provide extensible key/value configuration at the realm level. Public login currently consumes <code className="rounded bg-slate-200 px-1 py-0.5 dark:bg-slate-800">login.signup_url</code> from this store.
              </div>
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Key</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Value</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Updated</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                      {realmAttributes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            No realm attributes configured.
                          </td>
                        </tr>
                      ) : realmAttributes.map((attribute) => (
                        <tr key={attribute.id}>
                          <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{attribute.key}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            <span className="break-all">{attribute.value}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-500">{new Date(attribute.updated_at).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setAttributeForm({
                                  originalKey: attribute.key,
                                  key: attribute.key,
                                  value: attribute.value,
                                })}
                                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteAttribute(attribute.key)}
                                disabled={deletingAttributeKey === attribute.key || !canManage}
                                className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                              >
                                {deletingAttributeKey === attribute.key ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form className="grid gap-4" onSubmit={handleAttributeSubmit}>
                  <LabeledInput label="Key" value={attributeForm.key} onChange={(value) => setAttributeForm((current) => ({ ...current, key: value }))} />
                  <LabeledTextarea label="Value" value={attributeForm.value} onChange={(value) => setAttributeForm((current) => ({ ...current, value }))} rows={8} />
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                    Suggested key for login signup handoff: <code className="rounded bg-slate-200 px-1 py-0.5 dark:bg-slate-800">login.signup_url</code>
                  </div>
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setAttributeForm(emptyAttributeForm())}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={!canManage || isSavingAttribute}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {isSavingAttribute ? 'Saving…' : attributeForm.originalKey ? 'Update Attribute' : 'Create Attribute'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Panel>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Panel title="Notification Templates" icon={<Mail className="h-5 w-5 text-slate-700 dark:text-slate-200" />}>
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-[0.92fr_1.08fr]">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                      <thead className="bg-slate-50 dark:bg-slate-950/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Template</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Key</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {templates.map((template) => (
                          <tr
                            key={template.id}
                            className={`cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-950/50 ${templateForm.id === template.id ? 'bg-slate-50 dark:bg-slate-950/60' : ''}`}
                            onClick={() => {
                              setTemplateForm(buildTemplateForm(template))
                              setTemplatePreview(null)
                            }}
                          >
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{template.name}</td>
                            <td className="px-3 py-2 text-slate-500">{template.key}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <form className="grid gap-4" onSubmit={handleTemplateSubmit}>
                    <LabeledInput label="Template name" value={templateForm.name} onChange={(value) => setTemplateForm((current) => ({ ...current, name: value }))} />
                    <LabeledInput label="CTA label" value={templateForm.ctaLabel} onChange={(value) => setTemplateForm((current) => ({ ...current, ctaLabel: value }))} />
                    <LabeledTextarea label="Subject template" value={templateForm.subjectTemplate} onChange={(value) => setTemplateForm((current) => ({ ...current, subjectTemplate: value }))} rows={3} />
                    <LabeledTextarea label="Body template" value={templateForm.bodyTemplate} onChange={(value) => setTemplateForm((current) => ({ ...current, bodyTemplate: value }))} rows={8} />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handlePreviewTemplate}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Preview
                      </button>
                      <button
                        type="submit"
                        disabled={!canManage || isSavingTemplate}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        {isSavingTemplate ? 'Saving…' : 'Save Template'}
                      </button>
                    </div>
                  </form>
                </div>
                {templatePreview ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                    <p className="font-semibold text-slate-900 dark:text-white">Preview subject</p>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{templatePreview.subject}</p>
                    <p className="mt-4 font-semibold text-slate-900 dark:text-white">Preview body</p>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-slate-600 dark:text-slate-300">{templatePreview.body}</pre>
                  </div>
                ) : null}
              </div>
            </Panel>

            <Panel title="Notification Delivery" icon={<Send className="h-5 w-5 text-slate-700 dark:text-slate-200" />}>
              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <LabeledInput label="Test recipient" value={testRecipient} onChange={setTestRecipient} />
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={!canManage || isSendingTest}
                      className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {isSendingTest ? 'Sending…' : 'Send Test'}
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Sent</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Template</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Recipient</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                      {deliveries.slice(0, 8).map((delivery) => (
                        <tr key={delivery.id}>
                          <td className="px-3 py-2 text-slate-500">{new Date(delivery.sent_at).toLocaleString()}</td>
                          <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{delivery.template_key}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{delivery.recipient_email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </section>
  )
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">{icon}</div>
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  )
}

function LabeledTextarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  )
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
