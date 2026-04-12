import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { BadgeInfo, Building2, Mail, Plus, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function parseCsv(value) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
function emptySchemaAttribute() {
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
    };
}
function buildSchemaAttributeForm(attribute) {
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
    };
}
function buildSchemaForm(schema) {
    if (!schema) {
        return {
            displayName: '',
            summary: '',
            status: 'ACTIVE',
            attributes: [],
        };
    }
    return {
        displayName: schema.display_name,
        summary: schema.summary,
        status: schema.status,
        attributes: schema.attributes.map(buildSchemaAttributeForm),
    };
}
function emptyOrganizationForm() {
    return {
        id: null,
        name: '',
        summary: '',
        kind: 'COMPANY',
        status: 'ACTIVE',
        domainHint: '',
        linkedAliases: '',
    };
}
function buildOrganizationForm(organization) {
    return {
        id: organization.id,
        name: organization.name,
        summary: organization.summary,
        kind: organization.kind,
        status: organization.status,
        domainHint: organization.domain_hint ?? '',
        linkedAliases: organization.linked_identity_provider_aliases.join(', '),
    };
}
function emptyMembershipForm(realmId, organizations, users) {
    return {
        id: null,
        organizationId: organizations[0]?.id ?? '',
        userId: users[0]?.id ?? '',
        role: 'MEMBER',
        status: 'ACTIVE',
    };
}
function emptyInvitationForm(organizations) {
    return {
        organizationId: organizations[0]?.id ?? '',
        email: '',
        role: 'MEMBER',
        linkedAliases: '',
    };
}
function Section({ title, description, children, }) {
    return (_jsxs("section", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: description })] }), children] }));
}
function MetricCard({ label, value, detail, icon, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }), _jsx("div", { className: "text-slate-500 dark:text-slate-400", children: icon })] }), _jsx("div", { className: "mt-3 text-2xl font-semibold text-slate-900 dark:text-white", children: value }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: detail })] }));
}
export function IamOrganizationsPanel({ selectedRealmId, canManage, selectedOrganizationId = '', onSelectedOrganizationChange, }) {
    const [schema, setSchema] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [users, setUsers] = useState([]);
    const [identityProviders, setIdentityProviders] = useState([]);
    const [schemaForm, setSchemaForm] = useState(buildSchemaForm(null));
    const [organizationForm, setOrganizationForm] = useState(emptyOrganizationForm);
    const [membershipForm, setMembershipForm] = useState(emptyMembershipForm('', [], []));
    const [invitationForm, setInvitationForm] = useState(emptyInvitationForm([]));
    const [loading, setLoading] = useState(false);
    const [savingSchema, setSavingSchema] = useState(false);
    const [savingOrganization, setSavingOrganization] = useState(false);
    const [savingMembership, setSavingMembership] = useState(false);
    const [savingInvitation, setSavingInvitation] = useState(false);
    const activeOrganizationId = selectedOrganizationId;
    const loadRuntime = async () => {
        if (!selectedRealmId) {
            setSchema(null);
            setOrganizations([]);
            setMemberships([]);
            setInvitations([]);
            setUsers([]);
            setIdentityProviders([]);
            return;
        }
        setLoading(true);
        try {
            const [schemaResponse, organizationsResponse, membershipsResponse, invitationsResponse, usersResponse, identityProviderResponse,] = await Promise.all([
                idpApi.listIamUserProfileSchemas({ realmId: selectedRealmId }),
                idpApi.listIamOrganizations({ realmId: selectedRealmId }),
                idpApi.listIamOrganizationMemberships({ realmId: selectedRealmId }),
                idpApi.listIamOrganizationInvitations({ realmId: selectedRealmId }),
                idpApi.listIamUsers({ realmId: selectedRealmId }),
                idpApi.listIamIdentityProviders({ realmId: selectedRealmId }),
            ]);
            const nextSchema = schemaResponse.schemas[0] ?? null;
            setSchema(nextSchema);
            setSchemaForm(buildSchemaForm(nextSchema));
            setOrganizations(organizationsResponse.organizations);
            setMemberships(membershipsResponse.memberships);
            setInvitations(invitationsResponse.invitations);
            setUsers(usersResponse.users);
            setIdentityProviders(identityProviderResponse.identity_providers);
            const resolvedOrganizationContextId = activeOrganizationId && organizationsResponse.organizations.some((organization) => organization.id === activeOrganizationId)
                ? activeOrganizationId
                : '';
            if (activeOrganizationId && !resolvedOrganizationContextId) {
                onSelectedOrganizationChange?.('');
            }
            const defaultOrganizationId = resolvedOrganizationContextId || organizationsResponse.organizations[0]?.id || '';
            setMembershipForm((current) => current.id ? current : {
                ...emptyMembershipForm(selectedRealmId, organizationsResponse.organizations, usersResponse.users),
                organizationId: defaultOrganizationId,
            });
            setInvitationForm((current) => current.organizationId ? current : {
                ...emptyInvitationForm(organizationsResponse.organizations),
                organizationId: defaultOrganizationId,
            });
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to load organization and profile runtime');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void loadRuntime();
    }, [selectedRealmId, activeOrganizationId]);
    const identityProviderAliasSet = useMemo(() => new Set(identityProviders.map((provider) => provider.alias)), [identityProviders]);
    const selectedOrganization = useMemo(() => organizations.find((organization) => organization.id === activeOrganizationId) ?? null, [activeOrganizationId, organizations]);
    const scopedOrganizations = useMemo(() => activeOrganizationId
        ? organizations.filter((organization) => organization.id === activeOrganizationId)
        : organizations, [activeOrganizationId, organizations]);
    const scopedMemberships = useMemo(() => activeOrganizationId
        ? memberships.filter((membership) => membership.organization_id === activeOrganizationId)
        : memberships, [activeOrganizationId, memberships]);
    const scopedInvitations = useMemo(() => activeOrganizationId
        ? invitations.filter((invitation) => invitation.organization_id === activeOrganizationId)
        : invitations, [activeOrganizationId, invitations]);
    useEffect(() => {
        if (activeOrganizationId && !organizations.some((organization) => organization.id === activeOrganizationId)) {
            onSelectedOrganizationChange?.('');
        }
    }, [activeOrganizationId, onSelectedOrganizationChange, organizations]);
    useEffect(() => {
        if (!activeOrganizationId) {
            return;
        }
        setMembershipForm((current) => current.id ? current : { ...current, organizationId: activeOrganizationId });
        setInvitationForm((current) => current.organizationId ? current : { ...current, organizationId: activeOrganizationId });
    }, [activeOrganizationId]);
    const handleSchemaAttributeChange = (attributeId, field, value) => {
        setSchemaForm((current) => ({
            ...current,
            attributes: current.attributes.map((attribute) => (attribute.id === attributeId
                ? { ...attribute, [field]: value }
                : attribute)),
        }));
    };
    const buildSchemaPayload = () => ({
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
    });
    const handleSaveSchema = async (event) => {
        event.preventDefault();
        if (!selectedRealmId)
            return;
        setSavingSchema(true);
        try {
            await idpApi.updateIamUserProfileSchema(selectedRealmId, buildSchemaPayload());
            toast.success('IAM profile schema updated');
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to update IAM profile schema');
        }
        finally {
            setSavingSchema(false);
        }
    };
    const handleSaveOrganization = async (event) => {
        event.preventDefault();
        if (!selectedRealmId)
            return;
        setSavingOrganization(true);
        try {
            const payload = {
                realm_id: selectedRealmId,
                name: organizationForm.name.trim(),
                summary: organizationForm.summary.trim(),
                kind: organizationForm.kind,
                status: organizationForm.status,
                domain_hint: organizationForm.domainHint.trim() || null,
                linked_identity_provider_aliases: parseCsv(organizationForm.linkedAliases),
            };
            if (organizationForm.id) {
                await idpApi.updateIamOrganization(organizationForm.id, payload);
                toast.success('IAM organization updated');
            }
            else {
                await idpApi.createIamOrganization(payload);
                toast.success('IAM organization created');
            }
            setOrganizationForm(emptyOrganizationForm());
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to save IAM organization');
        }
        finally {
            setSavingOrganization(false);
        }
    };
    const handleSaveMembership = async (event) => {
        event.preventDefault();
        if (!selectedRealmId)
            return;
        setSavingMembership(true);
        try {
            if (membershipForm.id) {
                const payload = {
                    role: membershipForm.role,
                    status: membershipForm.status,
                };
                await idpApi.updateIamOrganizationMembership(membershipForm.id, payload);
                toast.success('IAM organization membership updated');
            }
            else {
                const payload = {
                    realm_id: selectedRealmId,
                    organization_id: membershipForm.organizationId,
                    user_id: membershipForm.userId,
                    role: membershipForm.role,
                    status: membershipForm.status,
                };
                await idpApi.createIamOrganizationMembership(payload);
                toast.success('IAM organization membership created');
            }
            setMembershipForm(emptyMembershipForm(selectedRealmId, organizations, users));
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to save IAM organization membership');
        }
        finally {
            setSavingMembership(false);
        }
    };
    const handleSaveInvitation = async (event) => {
        event.preventDefault();
        if (!selectedRealmId)
            return;
        setSavingInvitation(true);
        try {
            const payload = {
                realm_id: selectedRealmId,
                organization_id: invitationForm.organizationId,
                email: invitationForm.email.trim(),
                role: invitationForm.role,
                linked_identity_provider_aliases: parseCsv(invitationForm.linkedAliases),
            };
            await idpApi.createIamOrganizationInvitation(payload);
            toast.success('IAM organization invitation created');
            setInvitationForm(emptyInvitationForm(organizations));
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to create IAM organization invitation');
        }
        finally {
            setSavingInvitation(false);
        }
    };
    const handleRevokeInvitation = async (invitationId) => {
        try {
            await idpApi.revokeIamOrganizationInvitation(invitationId);
            toast.success('IAM organization invitation revoked');
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to revoke IAM organization invitation');
        }
    };
    if (!selectedRealmId) {
        return (_jsx("div", { className: "rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300", children: "Select a realm to manage organization and user-profile behavior." }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsx(MetricCard, { label: "Schemas", value: schema ? '1' : '0', detail: schema ? `${schema.attributes.length} attributes defined` : 'No schema loaded', icon: _jsx(BadgeInfo, { className: "h-4 w-4" }) }), _jsx(MetricCard, { label: "Organizations", value: String(scopedOrganizations.length), detail: activeOrganizationId ? `Filtered from ${organizations.length} organizations` : 'Realm-scoped B2B identity containers', icon: _jsx(Building2, { className: "h-4 w-4" }) }), _jsx(MetricCard, { label: "Memberships", value: String(scopedMemberships.length), detail: activeOrganizationId ? `Filtered from ${memberships.length} memberships` : 'Linked user-to-organization identities', icon: _jsx(Users, { className: "h-4 w-4" }) }), _jsx(MetricCard, { label: "Invitations", value: String(scopedInvitations.filter((invitation) => invitation.status === 'PENDING').length), detail: "Pending external organization onboarding", icon: _jsx(Mail, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Organization Context" }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: "Scope organization management workflows to a specific organization when needed." }), _jsx("div", { className: "mt-3 max-w-lg", children: _jsxs("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950", value: activeOrganizationId, onChange: (event) => onSelectedOrganizationChange?.(event.target.value), children: [_jsx("option", { value: "", children: "All organizations in selected realm" }), organizations.map((organization) => (_jsx("option", { value: organization.id, children: organization.name }, organization.id)))] }) }), selectedOrganization && (_jsxs("div", { className: "mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/60", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: selectedOrganization.name }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-300", children: selectedOrganization.summary })] }))] }), _jsx(Section, { title: "Profile Schema", description: "Define schema-driven profile attributes, validation rules, and self/admin edit posture for the selected realm.", children: _jsxs("form", { className: "space-y-5", onSubmit: handleSaveSchema, children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Display Name" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: schemaForm.displayName, onChange: (event) => setSchemaForm((current) => ({ ...current, displayName: event.target.value })), disabled: !canManage })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Status" }), _jsxs("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: schemaForm.status, onChange: (event) => setSchemaForm((current) => ({ ...current, status: event.target.value })), disabled: !canManage, children: [_jsx("option", { value: "ACTIVE", children: "Active" }), _jsx("option", { value: "ARCHIVED", children: "Archived" })] })] }), _jsxs("label", { className: "space-y-2 text-sm md:col-span-1", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Summary" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: schemaForm.summary, onChange: (event) => setSchemaForm((current) => ({ ...current, summary: event.target.value })), disabled: !canManage })] })] }), _jsx("div", { className: "space-y-3", children: schemaForm.attributes.map((attribute) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-4", children: [_jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Key" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: attribute.key, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'key', event.target.value), disabled: !canManage })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Label" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: attribute.label, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'label', event.target.value), disabled: !canManage })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Type" }), _jsx("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: attribute.type, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'type', event.target.value), disabled: !canManage, children: ['STRING', 'TEXT', 'EMAIL', 'PHONE', 'URL', 'BOOLEAN', 'NUMBER', 'DATE', 'ENUM'].map((option) => (_jsx("option", { value: option, children: option }, option))) })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Order" }), _jsx("input", { type: "number", className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: attribute.orderIndex, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'orderIndex', event.target.value), disabled: !canManage })] })] }), _jsxs("div", { className: "mt-3 grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Allowed Values" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: attribute.allowedValues, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'allowedValues', event.target.value), disabled: !canManage })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Regex Pattern" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: attribute.regexPattern, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'regexPattern', event.target.value), disabled: !canManage })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Placeholder" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: attribute.placeholder, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'placeholder', event.target.value), disabled: !canManage })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Help Text" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: attribute.helpText, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'helpText', event.target.value), disabled: !canManage })] })] }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300", children: [_jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: attribute.required, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'required', event.target.checked), disabled: !canManage }), "Required"] }), _jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: attribute.multivalued, onChange: (event) => handleSchemaAttributeChange(attribute.id, 'multivalued', event.target.checked), disabled: !canManage }), "Multivalued"] }), _jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: attribute.viewScopes.includes('SELF'), onChange: (event) => handleSchemaAttributeChange(attribute.id, 'viewScopes', event.target.checked ? ['SELF', 'ADMIN'] : ['ADMIN']), disabled: !canManage }), "Self View"] }), _jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: attribute.editScopes.includes('SELF'), onChange: (event) => handleSchemaAttributeChange(attribute.id, 'editScopes', event.target.checked ? ['SELF', 'ADMIN'] : ['ADMIN']), disabled: !canManage }), "Self Edit"] }), canManage && (_jsx("button", { type: "button", className: "text-rose-600", onClick: () => setSchemaForm((current) => ({
                                                    ...current,
                                                    attributes: current.attributes.filter((candidate) => candidate.id !== attribute.id),
                                                })), children: "Remove" }))] })] }, attribute.id))) }), canManage && (_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("button", { type: "button", className: "inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700", onClick: () => setSchemaForm((current) => ({
                                        ...current,
                                        attributes: [...current.attributes, emptySchemaAttribute()],
                                    })), children: [_jsx(Plus, { className: "h-4 w-4" }), "Add Attribute"] }), _jsx("button", { type: "submit", className: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900", disabled: savingSchema, children: savingSchema ? 'Saving…' : 'Save Schema' })] }))] }) }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-2", children: [_jsxs(Section, { title: "Organizations", description: "Manage B2B organization containers, domain hints, and linked identity-provider posture for the selected realm.", children: [_jsxs("form", { className: "space-y-4", onSubmit: handleSaveOrganization, children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Name" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: organizationForm.name, onChange: (event) => setOrganizationForm((current) => ({ ...current, name: event.target.value })), disabled: !canManage })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Kind" }), _jsx("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: organizationForm.kind, onChange: (event) => setOrganizationForm((current) => ({ ...current, kind: event.target.value })), disabled: !canManage, children: ['COMPANY', 'PARTNER', 'PUBLIC_SECTOR', 'TEAM', 'EDUCATION'].map((option) => (_jsx("option", { value: option, children: option }, option))) })] }), _jsxs("label", { className: "space-y-1 text-sm md:col-span-2", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Summary" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: organizationForm.summary, onChange: (event) => setOrganizationForm((current) => ({ ...current, summary: event.target.value })), disabled: !canManage })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Status" }), _jsxs("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: organizationForm.status, onChange: (event) => setOrganizationForm((current) => ({ ...current, status: event.target.value })), disabled: !canManage, children: [_jsx("option", { value: "ACTIVE", children: "Active" }), _jsx("option", { value: "ARCHIVED", children: "Archived" })] })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Domain Hint" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: organizationForm.domainHint, onChange: (event) => setOrganizationForm((current) => ({ ...current, domainHint: event.target.value })), disabled: !canManage })] }), _jsxs("label", { className: "space-y-1 text-sm md:col-span-2", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Linked IdP Aliases" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: organizationForm.linkedAliases, onChange: (event) => setOrganizationForm((current) => ({ ...current, linkedAliases: event.target.value })), disabled: !canManage })] })] }), identityProviders.length > 0 && (_jsxs("div", { className: "text-xs text-slate-500 dark:text-slate-400", children: ["Available aliases: ", identityProviders.map((provider) => provider.alias).join(', ')] })), canManage && (_jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", className: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900", disabled: savingOrganization, children: savingOrganization ? 'Saving…' : organizationForm.id ? 'Update Organization' : 'Create Organization' }), organizationForm.id && (_jsx("button", { type: "button", className: "rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700", onClick: () => setOrganizationForm(emptyOrganizationForm()), children: "Reset" }))] }))] }), _jsx("div", { className: "mt-5 space-y-3", children: scopedOrganizations.map((organization) => (_jsxs("button", { type: "button", className: "w-full rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600", onClick: () => {
                                        onSelectedOrganizationChange?.(organization.id);
                                        setOrganizationForm(buildOrganizationForm(organization));
                                    }, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-semibold text-slate-900 dark:text-white", children: organization.name }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: organization.summary })] }), _jsx("div", { className: "text-xs uppercase tracking-[0.18em] text-slate-500", children: organization.kind })] }), _jsx("div", { className: "mt-3 text-xs text-slate-500 dark:text-slate-400", children: organization.linked_identity_provider_aliases.length > 0
                                                ? `Linked IdPs: ${organization.linked_identity_provider_aliases.join(', ')}`
                                                : 'No linked IdP aliases' })] }, organization.id))) })] }), _jsxs(Section, { title: "Memberships and Invitations", description: "Assign users into organizations and issue realm-scoped invitations for B2B onboarding.", children: [_jsxs("form", { className: "space-y-4", onSubmit: handleSaveMembership, children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Organization" }), _jsxs("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: membershipForm.organizationId, onChange: (event) => setMembershipForm((current) => ({ ...current, organizationId: event.target.value })), disabled: !canManage, children: [_jsx("option", { value: "", children: "Select organization" }), scopedOrganizations.map((organization) => (_jsx("option", { value: organization.id, children: organization.name }, organization.id)))] })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "User" }), _jsxs("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: membershipForm.userId, onChange: (event) => setMembershipForm((current) => ({ ...current, userId: event.target.value })), disabled: !canManage || Boolean(membershipForm.id), children: [_jsx("option", { value: "", children: "Select user" }), users.map((user) => (_jsxs("option", { value: user.id, children: [user.username, " (", user.email, ")"] }, user.id)))] })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Role" }), _jsx("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: membershipForm.role, onChange: (event) => setMembershipForm((current) => ({ ...current, role: event.target.value })), disabled: !canManage, children: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].map((option) => (_jsx("option", { value: option, children: option }, option))) })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Status" }), _jsx("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: membershipForm.status, onChange: (event) => setMembershipForm((current) => ({ ...current, status: event.target.value })), disabled: !canManage, children: ['ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED'].map((option) => (_jsx("option", { value: option, children: option }, option))) })] })] }), canManage && (_jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", className: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900", disabled: savingMembership, children: savingMembership ? 'Saving…' : membershipForm.id ? 'Update Membership' : 'Create Membership' }), membershipForm.id && (_jsx("button", { type: "button", className: "rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700", onClick: () => setMembershipForm(emptyMembershipForm(selectedRealmId, scopedOrganizations, users)), children: "Reset" }))] }))] }), _jsxs("form", { className: "mt-6 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800", onSubmit: handleSaveInvitation, children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Organization" }), _jsxs("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: invitationForm.organizationId, onChange: (event) => setInvitationForm((current) => ({ ...current, organizationId: event.target.value })), disabled: !canManage, children: [_jsx("option", { value: "", children: "Select organization" }), scopedOrganizations.map((organization) => (_jsx("option", { value: organization.id, children: organization.name }, organization.id)))] })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Email" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: invitationForm.email, onChange: (event) => setInvitationForm((current) => ({ ...current, email: event.target.value })), disabled: !canManage })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Role" }), _jsx("select", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: invitationForm.role, onChange: (event) => setInvitationForm((current) => ({ ...current, role: event.target.value })), disabled: !canManage, children: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].map((option) => (_jsx("option", { value: option, children: option }, option))) })] }), _jsxs("label", { className: "space-y-1 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Linked IdP Aliases" }), _jsx("input", { className: "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", value: invitationForm.linkedAliases, onChange: (event) => setInvitationForm((current) => ({ ...current, linkedAliases: event.target.value })), disabled: !canManage })] })] }), canManage && (_jsx("button", { type: "submit", className: "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700", disabled: savingInvitation, children: savingInvitation ? 'Issuing…' : 'Issue Invitation' }))] }), _jsxs("div", { className: "mt-6 grid gap-4 xl:grid-cols-2", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Membership Ledger" }), scopedMemberships.map((membership) => (_jsxs("button", { type: "button", className: "w-full rounded-2xl border border-slate-200 p-3 text-left hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600", onClick: () => {
                                                    onSelectedOrganizationChange?.(membership.organization_id);
                                                    setMembershipForm({
                                                        id: membership.id,
                                                        organizationId: membership.organization_id,
                                                        userId: membership.user_id,
                                                        role: membership.role,
                                                        status: membership.status,
                                                    });
                                                }, children: [_jsxs("div", { className: "font-medium text-slate-900 dark:text-white", children: [membership.username, " \u2192 ", membership.organization_name] }), _jsxs("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: [membership.role, " \u00B7 ", membership.status] })] }, membership.id)))] }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Invitations" }), scopedInvitations.map((invitation) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 p-3 dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: invitation.email }), _jsxs("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: [invitation.organization_name, " \u00B7 ", invitation.role, " \u00B7 ", invitation.status] }), _jsx("div", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: invitation.linked_identity_provider_aliases.length > 0
                                                            ? `IdPs: ${invitation.linked_identity_provider_aliases.filter((alias) => identityProviderAliasSet.has(alias)).join(', ')}`
                                                            : 'No IdP aliases' }), canManage && invitation.status === 'PENDING' && (_jsx("button", { type: "button", className: "mt-3 text-sm font-medium text-rose-600", onClick: () => handleRevokeInvitation(invitation.id), children: "Revoke invitation" }))] }, invitation.id)))] })] })] })] }), loading && _jsx("div", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Refreshing organization and schema runtime\u2026" })] }));
}
