import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function parseList(value) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
function formatList(values) {
    return values.join(', ');
}
function emptyExtensionForm() {
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
    };
}
function emptyProviderForm(extensionId = '') {
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
    };
}
function emptyBindingForm(realmId = '') {
    return {
        id: null,
        realmId,
        providerId: '',
        bindingSlot: '',
        priority: 50,
        status: 'ACTIVE',
        configurationJson: '{}',
    };
}
function buildExtensionForm(record) {
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
    };
}
function buildProviderForm(record) {
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
    };
}
function buildBindingForm(record) {
    return {
        id: record.id,
        realmId: record.realm_id,
        providerId: record.provider_id,
        bindingSlot: record.binding_slot,
        priority: record.priority,
        status: record.status,
        configurationJson: JSON.stringify(record.configuration ?? {}, null, 2),
    };
}
function parseConfigurationJson(value) {
    if (!value.trim()) {
        return {};
    }
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Configuration must be a JSON object');
    }
    return parsed;
}
export function IamExtensionsPanel({ realms, selectedRealmId }) {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [interfaces, setInterfaces] = useState([]);
    const [extensions, setExtensions] = useState([]);
    const [providers, setProviders] = useState([]);
    const [bindings, setBindings] = useState([]);
    const [extensionForm, setExtensionForm] = useState(emptyExtensionForm());
    const [providerForm, setProviderForm] = useState(emptyProviderForm());
    const [bindingForm, setBindingForm] = useState(emptyBindingForm(selectedRealmId));
    async function loadData() {
        setLoading(true);
        try {
            const [summaryResponse, interfacesResponse, extensionsResponse, providersResponse, bindingsResponse] = await Promise.all([
                idpApi.getIamExtensionSummary(),
                idpApi.listIamProviderInterfaces(),
                idpApi.listIamExtensions(),
                idpApi.listIamExtensionProviders(),
                idpApi.listIamExtensionBindings({ realmId: selectedRealmId || undefined }),
            ]);
            setSummary(summaryResponse);
            setInterfaces(interfacesResponse.interfaces);
            setExtensions(extensionsResponse.extensions);
            setProviders(providersResponse.providers);
            setBindings(bindingsResponse.bindings);
            setProviderForm((current) => current.extensionId ? current : emptyProviderForm(extensionsResponse.extensions[0]?.id ?? ''));
            setBindingForm((current) => current.realmId ? current : emptyBindingForm(selectedRealmId || realms[0]?.id || ''));
        }
        catch (error) {
            console.error('Failed to load IAM extensions:', error);
            toast.error('Failed to load IAM extensions.');
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void loadData();
    }, [selectedRealmId]);
    useEffect(() => {
        setBindingForm((current) => current.id ? current : emptyBindingForm(selectedRealmId || realms[0]?.id || ''));
    }, [selectedRealmId, realms]);
    async function handleExtensionSubmit(event) {
        event.preventDefault();
        try {
            const request = {
                key: extensionForm.key,
                name: extensionForm.name,
                summary: extensionForm.summary,
                publisher: extensionForm.publisher,
                version: extensionForm.version,
                source_type: extensionForm.sourceType,
                delivery_model: extensionForm.deliveryModel,
                status: extensionForm.status,
                interface_kinds: parseList(extensionForm.interfaceKinds),
            };
            if (extensionForm.id) {
                await idpApi.updateIamExtension(extensionForm.id, request);
                toast.success('Extension package updated.');
            }
            else {
                await idpApi.createIamExtension(request);
                toast.success('Extension package created.');
            }
            setExtensionForm(emptyExtensionForm());
            await loadData();
        }
        catch (error) {
            console.error('Failed to save IAM extension package:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save extension package.');
        }
    }
    async function handleProviderSubmit(event) {
        event.preventDefault();
        try {
            const request = {
                extension_id: providerForm.extensionId,
                key: providerForm.key,
                name: providerForm.name,
                summary: providerForm.summary,
                interface_kind: providerForm.interfaceKind,
                status: providerForm.status,
                implementation_mode: providerForm.implementationMode,
                runtime_reference: providerForm.runtimeReference,
                supported_protocols: parseList(providerForm.supportedProtocols),
                binding_slots: parseList(providerForm.bindingSlots),
                configuration_fields: parseList(providerForm.configurationFields),
            };
            if (providerForm.id) {
                await idpApi.updateIamExtensionProvider(providerForm.id, request);
                toast.success('Provider updated.');
            }
            else {
                await idpApi.createIamExtensionProvider(request);
                toast.success('Provider created.');
            }
            setProviderForm(emptyProviderForm(providerForm.extensionId || extensions[0]?.id || ''));
            await loadData();
        }
        catch (error) {
            console.error('Failed to save IAM extension provider:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save provider.');
        }
    }
    async function handleBindingSubmit(event) {
        event.preventDefault();
        try {
            const request = {
                realm_id: bindingForm.realmId,
                provider_id: bindingForm.providerId,
                binding_slot: bindingForm.bindingSlot,
                priority: bindingForm.priority,
                status: bindingForm.status,
                configuration: parseConfigurationJson(bindingForm.configurationJson),
            };
            if (bindingForm.id) {
                await idpApi.updateIamExtensionBinding(bindingForm.id, request);
                toast.success('Provider binding updated.');
            }
            else {
                await idpApi.createIamExtensionBinding(request);
                toast.success('Provider binding created.');
            }
            setBindingForm(emptyBindingForm(bindingForm.realmId));
            await loadData();
        }
        catch (error) {
            console.error('Failed to save IAM extension binding:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save provider binding.');
        }
    }
    const extensionOptions = extensions.map((extension) => (_jsx("option", { value: extension.id, children: extension.name }, extension.id)));
    const providerOptions = providers.map((provider) => (_jsx("option", { value: provider.id, children: provider.name }, provider.id)));
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("section", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: "Extension Plane" }), _jsx("p", { className: "mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300", children: "Manage bounded provider interfaces, extension packages, registered providers, and realm-bound activation slots." })] }), summary && (_jsxs("div", { className: "text-right text-sm text-slate-500 dark:text-slate-400", children: [_jsx("div", { children: summary.phase }), _jsx("div", { children: summary.subsystem_status })] }))] }), _jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-4", children: [_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60", children: [_jsx("div", { className: "text-xs uppercase tracking-wide text-slate-500", children: "Interfaces" }), _jsx("div", { className: "mt-1 text-2xl font-semibold text-slate-900 dark:text-white", children: summary?.extension_interface_count ?? 0 })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60", children: [_jsx("div", { className: "text-xs uppercase tracking-wide text-slate-500", children: "Packages" }), _jsx("div", { className: "mt-1 text-2xl font-semibold text-slate-900 dark:text-white", children: summary?.extension_package_count ?? 0 })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60", children: [_jsx("div", { className: "text-xs uppercase tracking-wide text-slate-500", children: "Providers" }), _jsx("div", { className: "mt-1 text-2xl font-semibold text-slate-900 dark:text-white", children: summary?.extension_provider_count ?? 0 })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60", children: [_jsx("div", { className: "text-xs uppercase tracking-wide text-slate-500", children: "Realm Bindings" }), _jsx("div", { className: "mt-1 text-2xl font-semibold text-slate-900 dark:text-white", children: summary?.extension_binding_count ?? 0 })] })] })] }), _jsxs("section", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950", children: [_jsx("h3", { className: "text-base font-semibold text-slate-900 dark:text-white", children: "Provider Interfaces" }), _jsx("div", { className: "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3", children: interfaces.map((entry) => (_jsxs("article", { className: "rounded-xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h4", { className: "font-medium text-slate-900 dark:text-white", children: entry.name }), _jsx("span", { className: "rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300", children: entry.kind })] }), _jsx("p", { className: "mt-2 text-sm text-slate-600 dark:text-slate-300", children: entry.summary }), _jsxs("div", { className: "mt-3 text-xs text-slate-500 dark:text-slate-400", children: ["Slots: ", entry.binding_slots.join(', ')] })] }, entry.id))) })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-2", children: [_jsxs("section", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-base font-semibold text-slate-900 dark:text-white", children: "Extension Packages" }), _jsx("button", { type: "button", onClick: () => setExtensionForm(emptyExtensionForm()), className: "text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400", children: "New package" })] }), _jsx("div", { className: "mt-4 max-h-80 space-y-3 overflow-y-auto pr-1", children: extensions.map((extension) => (_jsxs("button", { type: "button", onClick: () => setExtensionForm(buildExtensionForm(extension)), className: "block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-sky-300 dark:border-slate-800 dark:hover:border-sky-700", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: extension.name }), _jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: extension.status })] }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: extension.summary }), _jsx("div", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: extension.interface_kinds.join(', ') })] }, extension.id))) }), _jsxs("form", { className: "mt-4 space-y-3", onSubmit: handleExtensionSubmit, children: [_jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: extensionForm.key, onChange: (event) => setExtensionForm((current) => ({ ...current, key: event.target.value })), placeholder: "Package key" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: extensionForm.name, onChange: (event) => setExtensionForm((current) => ({ ...current, name: event.target.value })), placeholder: "Package name" }), _jsx("textarea", { className: "min-h-[88px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: extensionForm.summary, onChange: (event) => setExtensionForm((current) => ({ ...current, summary: event.target.value })), placeholder: "Summary" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsx("input", { className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: extensionForm.publisher, onChange: (event) => setExtensionForm((current) => ({ ...current, publisher: event.target.value })), placeholder: "Publisher" }), _jsx("input", { className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: extensionForm.version, onChange: (event) => setExtensionForm((current) => ({ ...current, version: event.target.value })), placeholder: "Version" })] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("select", { className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: extensionForm.sourceType, onChange: (event) => setExtensionForm((current) => ({ ...current, sourceType: event.target.value })), children: [_jsx("option", { value: "BUILT_IN", children: "Built-in" }), _jsx("option", { value: "VALIDATION_PACKAGE", children: "Validation Package" }), _jsx("option", { value: "THIRD_PARTY_PREPARED", children: "Third-Party Prepared" })] }), _jsxs("select", { className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: extensionForm.deliveryModel, onChange: (event) => setExtensionForm((current) => ({ ...current, deliveryModel: event.target.value })), children: [_jsx("option", { value: "INLINE_RUNTIME", children: "Inline Runtime" }), _jsx("option", { value: "AWS_LAMBDA", children: "AWS Lambda" }), _jsx("option", { value: "EVENTBRIDGE_CONSUMER", children: "EventBridge Consumer" }), _jsx("option", { value: "S3_THEME_PACKAGE", children: "S3 Theme Package" }), _jsx("option", { value: "DYNAMODB_STORAGE_ADAPTER", children: "DynamoDB Storage Adapter" })] }), _jsxs("select", { className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: extensionForm.status, onChange: (event) => setExtensionForm((current) => ({ ...current, status: event.target.value })), children: [_jsx("option", { value: "DRAFT", children: "Draft" }), _jsx("option", { value: "ACTIVE", children: "Active" }), _jsx("option", { value: "ARCHIVED", children: "Archived" })] })] }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: extensionForm.interfaceKinds, onChange: (event) => setExtensionForm((current) => ({ ...current, interfaceKinds: event.target.value })), placeholder: "Interface kinds (comma-separated)" }), _jsx("button", { disabled: loading, className: "rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60", children: extensionForm.id ? 'Update package' : 'Create package' })] })] }), _jsxs("section", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-base font-semibold text-slate-900 dark:text-white", children: "Providers" }), _jsx("button", { type: "button", onClick: () => setProviderForm(emptyProviderForm(extensions[0]?.id ?? '')), className: "text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400", children: "New provider" })] }), _jsx("div", { className: "mt-4 max-h-80 space-y-3 overflow-y-auto pr-1", children: providers.map((provider) => (_jsxs("button", { type: "button", onClick: () => setProviderForm(buildProviderForm(provider)), className: "block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-sky-300 dark:border-slate-800 dark:hover:border-sky-700", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: provider.name }), _jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: provider.interface_kind })] }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: provider.summary }), _jsx("div", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: provider.binding_slots.join(', ') || 'No slots declared' })] }, provider.id))) }), _jsxs("form", { className: "mt-4 space-y-3", onSubmit: handleProviderSubmit, children: [_jsxs("select", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.extensionId, onChange: (event) => setProviderForm((current) => ({ ...current, extensionId: event.target.value })), children: [_jsx("option", { value: "", children: "Select extension package" }), extensionOptions] }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.key, onChange: (event) => setProviderForm((current) => ({ ...current, key: event.target.value })), placeholder: "Provider key" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.name, onChange: (event) => setProviderForm((current) => ({ ...current, name: event.target.value })), placeholder: "Provider name" }), _jsx("textarea", { className: "min-h-[88px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.summary, onChange: (event) => setProviderForm((current) => ({ ...current, summary: event.target.value })), placeholder: "Summary" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsx("select", { className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.interfaceKind, onChange: (event) => setProviderForm((current) => ({ ...current, interfaceKind: event.target.value })), children: interfaces.map((entry) => _jsx("option", { value: entry.kind, children: entry.kind }, entry.id)) }), _jsxs("select", { className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.status, onChange: (event) => setProviderForm((current) => ({ ...current, status: event.target.value })), children: [_jsx("option", { value: "DRAFT", children: "Draft" }), _jsx("option", { value: "ACTIVE", children: "Active" }), _jsx("option", { value: "DISABLED", children: "Disabled" }), _jsx("option", { value: "ARCHIVED", children: "Archived" })] }), _jsxs("select", { className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.implementationMode, onChange: (event) => setProviderForm((current) => ({ ...current, implementationMode: event.target.value })), children: [_jsx("option", { value: "BUILT_IN", children: "Built-in" }), _jsx("option", { value: "MANIFEST_BOUND", children: "Manifest Bound" })] })] }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.runtimeReference, onChange: (event) => setProviderForm((current) => ({ ...current, runtimeReference: event.target.value })), placeholder: "Runtime reference" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.supportedProtocols, onChange: (event) => setProviderForm((current) => ({ ...current, supportedProtocols: event.target.value })), placeholder: "Supported protocols" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.bindingSlots, onChange: (event) => setProviderForm((current) => ({ ...current, bindingSlots: event.target.value })), placeholder: "Binding slots" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: providerForm.configurationFields, onChange: (event) => setProviderForm((current) => ({ ...current, configurationFields: event.target.value })), placeholder: "Configuration fields" }), _jsx("button", { disabled: loading, className: "rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60", children: providerForm.id ? 'Update provider' : 'Create provider' })] })] })] }), _jsxs("section", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-base font-semibold text-slate-900 dark:text-white", children: "Realm Provider Bindings" }), _jsx("button", { type: "button", onClick: () => setBindingForm(emptyBindingForm(selectedRealmId || realms[0]?.id || '')), className: "text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400", children: "New binding" })] }), _jsxs("div", { className: "mt-4 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]", children: [_jsx("div", { className: "max-h-[28rem] space-y-3 overflow-y-auto pr-1", children: bindings.map((binding) => {
                                    const provider = providers.find((candidate) => candidate.id === binding.provider_id);
                                    const realm = realms.find((candidate) => candidate.id === binding.realm_id);
                                    return (_jsxs("button", { type: "button", onClick: () => setBindingForm(buildBindingForm(binding)), className: "block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-sky-300 dark:border-slate-800 dark:hover:border-sky-700", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: binding.binding_slot }), _jsxs("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: ["P", binding.priority] })] }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: provider?.name ?? binding.provider_id }), _jsxs("div", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: [realm?.name ?? binding.realm_id, " \u00B7 ", binding.interface_kind, " \u00B7 ", binding.status] })] }, binding.id));
                                }) }), _jsxs("form", { className: "space-y-3", onSubmit: handleBindingSubmit, children: [_jsx("select", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: bindingForm.realmId, onChange: (event) => setBindingForm((current) => ({ ...current, realmId: event.target.value })), children: realms.map((realm) => (_jsx("option", { value: realm.id, children: realm.name }, realm.id))) }), _jsxs("select", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: bindingForm.providerId, onChange: (event) => {
                                            const nextProviderId = event.target.value;
                                            const provider = providers.find((candidate) => candidate.id === nextProviderId);
                                            setBindingForm((current) => ({
                                                ...current,
                                                providerId: nextProviderId,
                                                bindingSlot: current.bindingSlot || provider?.binding_slots[0] || '',
                                            }));
                                        }, children: [_jsx("option", { value: "", children: "Select provider" }), providerOptions] }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: bindingForm.bindingSlot, onChange: (event) => setBindingForm((current) => ({ ...current, bindingSlot: event.target.value })), placeholder: "Binding slot" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsx("input", { type: "number", className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: bindingForm.priority, onChange: (event) => setBindingForm((current) => ({ ...current, priority: Number(event.target.value) })), placeholder: "Priority" }), _jsxs("select", { className: "rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900", value: bindingForm.status, onChange: (event) => setBindingForm((current) => ({ ...current, status: event.target.value })), children: [_jsx("option", { value: "ACTIVE", children: "Active" }), _jsx("option", { value: "DISABLED", children: "Disabled" })] })] }), _jsx("textarea", { className: "min-h-[160px] w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900", value: bindingForm.configurationJson, onChange: (event) => setBindingForm((current) => ({ ...current, configurationJson: event.target.value })) }), _jsx("button", { disabled: loading, className: "rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60", children: bindingForm.id ? 'Update binding' : 'Create binding' })] })] })] })] }));
}
