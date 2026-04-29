import React, { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type CreateIamExtensionBindingRequest,
  type CreateIamExtensionPackageRequest,
  type CreateIamExtensionProviderRequest,
  type IamExtensionBindingRecord,
  type IamExtensionBindingStatus,
  type IamExtensionDeliveryModel,
  type IamExtensionInterfaceKind,
  type IamExtensionPackageRecord,
  type IamExtensionPackageStatus,
  type IamExtensionProviderRecord,
  type IamExtensionProviderStatus,
  type IamProviderImplementationMode,
  type IamProviderInterfaceRecord,
  type IamRealmRecord,
  type UpdateIamExtensionBindingRequest,
  type UpdateIamExtensionPackageRequest,
  type UpdateIamExtensionProviderRequest,
} from '../../services/standaloneApi'

type ExtensionFormState = {
  id: string | null
  key: string
  name: string
  summary: string
  publisher: string
  version: string
  sourceType: 'BUILT_IN' | 'VALIDATION_PACKAGE' | 'THIRD_PARTY_PREPARED'
  deliveryModel: IamExtensionDeliveryModel
  status: IamExtensionPackageStatus
  interfaceKinds: string
}

type ProviderFormState = {
  id: string | null
  extensionId: string
  key: string
  name: string
  summary: string
  interfaceKind: IamExtensionInterfaceKind
  status: IamExtensionProviderStatus
  implementationMode: IamProviderImplementationMode
  runtimeReference: string
  supportedProtocols: string
  bindingSlots: string
  configurationFields: string
}

type BindingFormState = {
  id: string | null
  realmId: string
  providerId: string
  bindingSlot: string
  priority: number
  status: IamExtensionBindingStatus
  configurationJson: string
}

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatList(values: string[]) {
  return values.join(', ')
}

function emptyExtensionForm(): ExtensionFormState {
  return {
    id: null,
    key: '',
    name: '',
    summary: '',
    publisher: 'Standalone IAM',
    version: '1.0.0',
    sourceType: 'VALIDATION_PACKAGE',
    deliveryModel: 'AWS_LAMBDA',
    status: 'DRAFT',
    interfaceKinds: 'AUTHENTICATOR',
  }
}

function emptyProviderForm(extensionId = ''): ProviderFormState {
  return {
    id: null,
    extensionId,
    key: '',
    name: '',
    summary: '',
    interfaceKind: 'AUTHENTICATOR',
    status: 'DRAFT',
    implementationMode: 'MANIFEST_BOUND',
    runtimeReference: 'provider:external',
    supportedProtocols: 'OIDC, OAUTH2, SAML',
    bindingSlots: '',
    configurationFields: '',
  }
}

function emptyBindingForm(realmId = ''): BindingFormState {
  return {
    id: null,
    realmId,
    providerId: '',
    bindingSlot: '',
    priority: 50,
    status: 'ACTIVE',
    configurationJson: '{}',
  }
}

function buildExtensionForm(record: IamExtensionPackageRecord): ExtensionFormState {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    summary: record.summary,
    publisher: record.publisher,
    version: record.version,
    sourceType: record.source_type,
    deliveryModel: record.delivery_model,
    status: record.status,
    interfaceKinds: formatList(record.interface_kinds),
  }
}

function buildProviderForm(record: IamExtensionProviderRecord): ProviderFormState {
  return {
    id: record.id,
    extensionId: record.extension_id,
    key: record.key,
    name: record.name,
    summary: record.summary,
    interfaceKind: record.interface_kind,
    status: record.status,
    implementationMode: record.implementation_mode,
    runtimeReference: record.runtime_reference,
    supportedProtocols: formatList(record.supported_protocols),
    bindingSlots: formatList(record.binding_slots),
    configurationFields: formatList(record.configuration_fields),
  }
}

function buildBindingForm(record: IamExtensionBindingRecord): BindingFormState {
  return {
    id: record.id,
    realmId: record.realm_id,
    providerId: record.provider_id,
    bindingSlot: record.binding_slot,
    priority: record.priority,
    status: record.status,
    configurationJson: JSON.stringify(record.configuration ?? {}, null, 2),
  }
}

function parseConfigurationJson(value: string) {
  if (!value.trim()) {
    return {}
  }
  const parsed = JSON.parse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Configuration must be a JSON object')
  }
  return parsed as Record<string, string | number | boolean>
}

interface IamExtensionsPanelProps {
  realms: IamRealmRecord[]
  selectedRealmId: string
}

export function IamExtensionsPanel({ realms, selectedRealmId }: IamExtensionsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof idpApi.getIamExtensionSummary>> | null>(null)
  const [interfaces, setInterfaces] = useState<IamProviderInterfaceRecord[]>([])
  const [extensions, setExtensions] = useState<IamExtensionPackageRecord[]>([])
  const [providers, setProviders] = useState<IamExtensionProviderRecord[]>([])
  const [bindings, setBindings] = useState<IamExtensionBindingRecord[]>([])
  const [extensionForm, setExtensionForm] = useState<ExtensionFormState>(emptyExtensionForm())
  const [providerForm, setProviderForm] = useState<ProviderFormState>(emptyProviderForm())
  const [bindingForm, setBindingForm] = useState<BindingFormState>(emptyBindingForm(selectedRealmId))

  async function loadData() {
    setLoading(true)
    try {
      const [summaryResponse, interfacesResponse, extensionsResponse, providersResponse, bindingsResponse] = await Promise.all([
        idpApi.getIamExtensionSummary(),
        idpApi.listIamProviderInterfaces(),
        idpApi.listIamExtensions(),
        idpApi.listIamExtensionProviders(),
        idpApi.listIamExtensionBindings({ realmId: selectedRealmId || undefined }),
      ])
      setSummary(summaryResponse)
      setInterfaces(interfacesResponse.interfaces)
      setExtensions(extensionsResponse.extensions)
      setProviders(providersResponse.providers)
      setBindings(bindingsResponse.bindings)
      setProviderForm((current) => current.extensionId ? current : emptyProviderForm(extensionsResponse.extensions[0]?.id ?? ''))
      setBindingForm((current) => current.realmId ? current : emptyBindingForm(selectedRealmId || realms[0]?.id || ''))
    } catch (error) {
      console.error('Failed to load IAM extensions:', error)
      toast.error('Failed to load IAM extensions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [selectedRealmId])

  useEffect(() => {
    setBindingForm((current) => current.id ? current : emptyBindingForm(selectedRealmId || realms[0]?.id || ''))
  }, [selectedRealmId, realms])

  async function handleExtensionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const request: CreateIamExtensionPackageRequest | UpdateIamExtensionPackageRequest = {
        key: extensionForm.key,
        name: extensionForm.name,
        summary: extensionForm.summary,
        publisher: extensionForm.publisher,
        version: extensionForm.version,
        source_type: extensionForm.sourceType,
        delivery_model: extensionForm.deliveryModel,
        status: extensionForm.status,
        interface_kinds: parseList(extensionForm.interfaceKinds) as IamExtensionInterfaceKind[],
      }
      if (extensionForm.id) {
        await idpApi.updateIamExtension(extensionForm.id, request as UpdateIamExtensionPackageRequest)
        toast.success('Extension package updated.')
      } else {
        await idpApi.createIamExtension(request as CreateIamExtensionPackageRequest)
        toast.success('Extension package created.')
      }
      setExtensionForm(emptyExtensionForm())
      await loadData()
    } catch (error) {
      console.error('Failed to save IAM extension package:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save extension package.')
    }
  }

  async function handleProviderSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const request: CreateIamExtensionProviderRequest | UpdateIamExtensionProviderRequest = {
        extension_id: providerForm.extensionId,
        key: providerForm.key,
        name: providerForm.name,
        summary: providerForm.summary,
        interface_kind: providerForm.interfaceKind,
        status: providerForm.status,
        implementation_mode: providerForm.implementationMode,
        runtime_reference: providerForm.runtimeReference,
        supported_protocols: parseList(providerForm.supportedProtocols) as Array<'OIDC' | 'OAUTH2' | 'SAML'>,
        binding_slots: parseList(providerForm.bindingSlots),
        configuration_fields: parseList(providerForm.configurationFields),
      }
      if (providerForm.id) {
        await idpApi.updateIamExtensionProvider(providerForm.id, request as UpdateIamExtensionProviderRequest)
        toast.success('Provider updated.')
      } else {
        await idpApi.createIamExtensionProvider(request as CreateIamExtensionProviderRequest)
        toast.success('Provider created.')
      }
      setProviderForm(emptyProviderForm(providerForm.extensionId || extensions[0]?.id || ''))
      await loadData()
    } catch (error) {
      console.error('Failed to save IAM extension provider:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save provider.')
    }
  }

  async function handleBindingSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const request: CreateIamExtensionBindingRequest | UpdateIamExtensionBindingRequest = {
        realm_id: bindingForm.realmId,
        provider_id: bindingForm.providerId,
        binding_slot: bindingForm.bindingSlot,
        priority: bindingForm.priority,
        status: bindingForm.status,
        configuration: parseConfigurationJson(bindingForm.configurationJson),
      }
      if (bindingForm.id) {
        await idpApi.updateIamExtensionBinding(bindingForm.id, request as UpdateIamExtensionBindingRequest)
        toast.success('Provider binding updated.')
      } else {
        await idpApi.createIamExtensionBinding(request as CreateIamExtensionBindingRequest)
        toast.success('Provider binding created.')
      }
      setBindingForm(emptyBindingForm(bindingForm.realmId))
      await loadData()
    } catch (error) {
      console.error('Failed to save IAM extension binding:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save provider binding.')
    }
  }

  const extensionOptions = extensions.map((extension) => (
    <option key={extension.id} value={extension.id}>
      {extension.name}
    </option>
  ))

  const providerOptions = providers.map((provider) => (
    <option key={provider.id} value={provider.id}>
      {provider.name}
    </option>
  ))

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Extension Plane</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Manage bounded provider interfaces, extension packages, registered providers, and realm-bound activation slots.
            </p>
          </div>
          {summary && (
            <div className="text-right text-sm text-slate-500 dark:text-slate-400">
              <div>{summary.phase}</div>
              <div>{summary.subsystem_status}</div>
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="text-xs uppercase tracking-wide text-slate-500">Interfaces</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{summary?.extension_interface_count ?? 0}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="text-xs uppercase tracking-wide text-slate-500">Packages</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{summary?.extension_package_count ?? 0}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="text-xs uppercase tracking-wide text-slate-500">Providers</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{summary?.extension_provider_count ?? 0}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="text-xs uppercase tracking-wide text-slate-500">Realm Bindings</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{summary?.extension_binding_count ?? 0}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Provider Interfaces</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {interfaces.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900 dark:text-white">{entry.name}</h4>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {entry.kind}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{entry.summary}</p>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">Slots: {entry.binding_slots.join(', ')}</div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Extension Packages</h3>
            <button type="button" onClick={() => setExtensionForm(emptyExtensionForm())} className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400">
              New package
            </button>
          </div>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {extensions.map((extension) => (
              <button
                key={extension.id}
                type="button"
                onClick={() => setExtensionForm(buildExtensionForm(extension))}
                className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-sky-300 dark:border-slate-800 dark:hover:border-sky-700"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900 dark:text-white">{extension.name}</div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{extension.status}</span>
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{extension.summary}</div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{extension.interface_kinds.join(', ')}</div>
              </button>
            ))}
          </div>
          <form className="mt-4 space-y-3" onSubmit={handleExtensionSubmit}>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={extensionForm.key} onChange={(event) => setExtensionForm((current) => ({ ...current, key: event.target.value }))} placeholder="Package key" />
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={extensionForm.name} onChange={(event) => setExtensionForm((current) => ({ ...current, name: event.target.value }))} placeholder="Package name" />
            <textarea className="min-h-[88px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={extensionForm.summary} onChange={(event) => setExtensionForm((current) => ({ ...current, summary: event.target.value }))} placeholder="Summary" />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={extensionForm.publisher} onChange={(event) => setExtensionForm((current) => ({ ...current, publisher: event.target.value }))} placeholder="Publisher" />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={extensionForm.version} onChange={(event) => setExtensionForm((current) => ({ ...current, version: event.target.value }))} placeholder="Version" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={extensionForm.sourceType} onChange={(event) => setExtensionForm((current) => ({ ...current, sourceType: event.target.value as ExtensionFormState['sourceType'] }))}>
                <option value="BUILT_IN">Built-in</option>
                <option value="VALIDATION_PACKAGE">Validation Package</option>
                <option value="THIRD_PARTY_PREPARED">Third-Party Prepared</option>
              </select>
              <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={extensionForm.deliveryModel} onChange={(event) => setExtensionForm((current) => ({ ...current, deliveryModel: event.target.value as IamExtensionDeliveryModel }))}>
                <option value="INLINE_RUNTIME">Inline Runtime</option>
                <option value="AWS_LAMBDA">AWS Lambda</option>
                <option value="EVENTBRIDGE_CONSUMER">EventBridge Consumer</option>
                <option value="S3_THEME_PACKAGE">S3 Theme Package</option>
                <option value="DYNAMODB_STORAGE_ADAPTER">DynamoDB Storage Adapter</option>
              </select>
              <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={extensionForm.status} onChange={(event) => setExtensionForm((current) => ({ ...current, status: event.target.value as IamExtensionPackageStatus }))}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={extensionForm.interfaceKinds} onChange={(event) => setExtensionForm((current) => ({ ...current, interfaceKinds: event.target.value }))} placeholder="Interface kinds (comma-separated)" />
            <button disabled={loading} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
              {extensionForm.id ? 'Update package' : 'Create package'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Providers</h3>
            <button type="button" onClick={() => setProviderForm(emptyProviderForm(extensions[0]?.id ?? ''))} className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400">
              New provider
            </button>
          </div>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => setProviderForm(buildProviderForm(provider))}
                className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-sky-300 dark:border-slate-800 dark:hover:border-sky-700"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900 dark:text-white">{provider.name}</div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{provider.interface_kind}</span>
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{provider.summary}</div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{provider.binding_slots.join(', ') || 'No slots declared'}</div>
              </button>
            ))}
          </div>
          <form className="mt-4 space-y-3" onSubmit={handleProviderSubmit}>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.extensionId} onChange={(event) => setProviderForm((current) => ({ ...current, extensionId: event.target.value }))}>
              <option value="">Select extension package</option>
              {extensionOptions}
            </select>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.key} onChange={(event) => setProviderForm((current) => ({ ...current, key: event.target.value }))} placeholder="Provider key" />
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.name} onChange={(event) => setProviderForm((current) => ({ ...current, name: event.target.value }))} placeholder="Provider name" />
            <textarea className="min-h-[88px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.summary} onChange={(event) => setProviderForm((current) => ({ ...current, summary: event.target.value }))} placeholder="Summary" />
            <div className="grid gap-3 md:grid-cols-3">
              <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.interfaceKind} onChange={(event) => setProviderForm((current) => ({ ...current, interfaceKind: event.target.value as IamExtensionInterfaceKind }))}>
                {interfaces.map((entry) => <option key={entry.id} value={entry.kind}>{entry.kind}</option>)}
              </select>
              <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.status} onChange={(event) => setProviderForm((current) => ({ ...current, status: event.target.value as IamExtensionProviderStatus }))}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.implementationMode} onChange={(event) => setProviderForm((current) => ({ ...current, implementationMode: event.target.value as IamProviderImplementationMode }))}>
                <option value="BUILT_IN">Built-in</option>
                <option value="MANIFEST_BOUND">Manifest Bound</option>
              </select>
            </div>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.runtimeReference} onChange={(event) => setProviderForm((current) => ({ ...current, runtimeReference: event.target.value }))} placeholder="Runtime reference" />
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.supportedProtocols} onChange={(event) => setProviderForm((current) => ({ ...current, supportedProtocols: event.target.value }))} placeholder="Supported protocols" />
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.bindingSlots} onChange={(event) => setProviderForm((current) => ({ ...current, bindingSlots: event.target.value }))} placeholder="Binding slots" />
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={providerForm.configurationFields} onChange={(event) => setProviderForm((current) => ({ ...current, configurationFields: event.target.value }))} placeholder="Configuration fields" />
            <button disabled={loading} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
              {providerForm.id ? 'Update provider' : 'Create provider'}
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Realm Provider Bindings</h3>
          <button type="button" onClick={() => setBindingForm(emptyBindingForm(selectedRealmId || realms[0]?.id || ''))} className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400">
            New binding
          </button>
        </div>
        <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {bindings.map((binding) => {
              const provider = providers.find((candidate) => candidate.id === binding.provider_id)
              const realm = realms.find((candidate) => candidate.id === binding.realm_id)
              return (
                <button
                  key={binding.id}
                  type="button"
                  onClick={() => setBindingForm(buildBindingForm(binding))}
                  className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-sky-300 dark:border-slate-800 dark:hover:border-sky-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900 dark:text-white">{binding.binding_slot}</div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">P{binding.priority}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{provider?.name ?? binding.provider_id}</div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {realm?.name ?? binding.realm_id} · {binding.interface_kind} · {binding.status}
                  </div>
                </button>
              )
            })}
          </div>
          <form className="space-y-3" onSubmit={handleBindingSubmit}>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={bindingForm.realmId} onChange={(event) => setBindingForm((current) => ({ ...current, realmId: event.target.value }))}>
              {realms.map((realm) => (
                <option key={realm.id} value={realm.id}>
                  {realm.name}
                </option>
              ))}
            </select>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={bindingForm.providerId} onChange={(event) => {
              const nextProviderId = event.target.value
              const provider = providers.find((candidate) => candidate.id === nextProviderId)
              setBindingForm((current) => ({
                ...current,
                providerId: nextProviderId,
                bindingSlot: current.bindingSlot || provider?.binding_slots[0] || '',
              }))
            }}>
              <option value="">Select provider</option>
              {providerOptions}
            </select>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={bindingForm.bindingSlot} onChange={(event) => setBindingForm((current) => ({ ...current, bindingSlot: event.target.value }))} placeholder="Binding slot" />
            <div className="grid gap-3 md:grid-cols-2">
              <input type="number" className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={bindingForm.priority} onChange={(event) => setBindingForm((current) => ({ ...current, priority: Number(event.target.value) }))} placeholder="Priority" />
              <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={bindingForm.status} onChange={(event) => setBindingForm((current) => ({ ...current, status: event.target.value as IamExtensionBindingStatus }))}>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>
            <textarea className="min-h-[160px] w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900" value={bindingForm.configurationJson} onChange={(event) => setBindingForm((current) => ({ ...current, configurationJson: event.target.value }))} />
            <button disabled={loading} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
              {bindingForm.id ? 'Update binding' : 'Create binding'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
