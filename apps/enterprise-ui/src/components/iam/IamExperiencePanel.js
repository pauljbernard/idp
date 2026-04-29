import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Globe2, Mail, Palette, Send, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function parseList(value) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
function stringifyJson(value) {
    return JSON.stringify(value, null, 2);
}
function emptyThemeForm() {
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
    };
}
function emptyLocalizationForm() {
    return {
        defaultLocale: 'en-US',
        supportedLocales: 'en-US, es-US',
        mode: 'REALM_DEFAULT',
        translationsJson: '{}',
    };
}
function emptyTemplateForm() {
    return {
        id: null,
        key: 'TEST_NOTIFICATION',
        name: '',
        subjectTemplate: '',
        bodyTemplate: '',
        ctaLabel: '',
    };
}
function emptyAttributeForm() {
    return {
        originalKey: null,
        key: '',
        value: '',
    };
}
function buildThemeForm(experience) {
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
    };
}
function buildLocalizationForm(experience) {
    return {
        defaultLocale: experience.localization.default_locale,
        supportedLocales: experience.localization.supported_locales.join(', '),
        mode: experience.localization.mode,
        translationsJson: stringifyJson(experience.localization.translations),
    };
}
function buildTemplateForm(template) {
    return {
        id: template.id,
        key: template.key,
        name: template.name,
        subjectTemplate: template.subject_template,
        bodyTemplate: template.body_template,
        ctaLabel: template.cta_label ?? '',
    };
}
export function IamExperiencePanel({ selectedRealmId, canManage, }) {
    const [experience, setExperience] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [realmAttributes, setRealmAttributes] = useState([]);
    const [themeForm, setThemeForm] = useState(emptyThemeForm);
    const [localizationForm, setLocalizationForm] = useState(emptyLocalizationForm);
    const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
    const [attributeForm, setAttributeForm] = useState(emptyAttributeForm);
    const [templatePreview, setTemplatePreview] = useState(null);
    const [testRecipient, setTestRecipient] = useState('ops@iam.local');
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingTheme, setIsSavingTheme] = useState(false);
    const [isSavingLocalization, setIsSavingLocalization] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isSavingAttribute, setIsSavingAttribute] = useState(false);
    const [deletingAttributeKey, setDeletingAttributeKey] = useState(null);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const loadExperience = async () => {
        if (!selectedRealmId) {
            setExperience(null);
            setTemplates([]);
            setDeliveries([]);
            setRealmAttributes([]);
            return;
        }
        setIsLoading(true);
        try {
            const [experienceResponse, templateResponse, deliveryResponse, attributeResponse] = await Promise.all([
                idpApi.getIamRealmExperience(selectedRealmId),
                idpApi.listIamNotificationTemplates(selectedRealmId),
                idpApi.listIamNotificationDeliveries(selectedRealmId),
                idpApi.listIamRealmAttributes(selectedRealmId),
            ]);
            setExperience(experienceResponse);
            setTemplates(templateResponse.notification_templates);
            setDeliveries(deliveryResponse.notification_deliveries);
            setThemeForm(buildThemeForm(experienceResponse));
            setLocalizationForm(buildLocalizationForm(experienceResponse));
            setTemplateForm(templateResponse.notification_templates[0] ? buildTemplateForm(templateResponse.notification_templates[0]) : emptyTemplateForm());
            setRealmAttributes(attributeResponse.attributes);
            setAttributeForm(emptyAttributeForm());
            setTemplatePreview(null);
        }
        catch (error) {
            console.error('Failed to load IAM realm experience', error);
            toast.error('Failed to load IAM realm experience');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void loadExperience();
    }, [selectedRealmId]);
    const activeLocalePreview = useMemo(() => {
        if (!experience) {
            return {};
        }
        return experience.localization.translations[localizationForm.defaultLocale] ?? {};
    }, [experience, localizationForm.defaultLocale]);
    const handleThemeSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            return;
        }
        setIsSavingTheme(true);
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
            });
            toast.success('IAM realm theme updated');
            await loadExperience();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to update realm theme');
        }
        finally {
            setIsSavingTheme(false);
        }
    };
    const handleLocalizationSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            return;
        }
        setIsSavingLocalization(true);
        try {
            const translations = JSON.parse(localizationForm.translationsJson);
            await idpApi.updateIamRealmLocalization(selectedRealmId, {
                default_locale: localizationForm.defaultLocale,
                supported_locales: parseList(localizationForm.supportedLocales),
                mode: localizationForm.mode,
                translations,
            });
            toast.success('IAM realm localization updated');
            await loadExperience();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to update realm localization');
        }
        finally {
            setIsSavingLocalization(false);
        }
    };
    const handleTemplateSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId || !templateForm.id) {
            return;
        }
        setIsSavingTemplate(true);
        try {
            await idpApi.updateIamNotificationTemplate(selectedRealmId, templateForm.id, {
                name: templateForm.name,
                subject_template: templateForm.subjectTemplate,
                body_template: templateForm.bodyTemplate,
                cta_label: templateForm.ctaLabel || null,
            });
            toast.success('IAM notification template updated');
            await loadExperience();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to update notification template');
        }
        finally {
            setIsSavingTemplate(false);
        }
    };
    const handlePreviewTemplate = async () => {
        if (!selectedRealmId || !templateForm.id) {
            return;
        }
        try {
            const preview = await idpApi.previewIamNotificationTemplate(selectedRealmId, templateForm.id, {
                code: '482913',
            });
            setTemplatePreview({
                subject: preview.subject,
                body: preview.body,
            });
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to preview notification template');
        }
    };
    const handleSendTest = async () => {
        if (!selectedRealmId || !testRecipient.trim()) {
            toast.error('Enter a test recipient email');
            return;
        }
        setIsSendingTest(true);
        try {
            await idpApi.sendIamTestNotification(selectedRealmId, {
                template_key: templateForm.key,
                recipient_email: testRecipient.trim(),
                variables: {
                    code: '482913',
                },
            });
            toast.success('IAM notification test delivered');
            await loadExperience();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to send test notification');
        }
        finally {
            setIsSendingTest(false);
        }
    };
    const handleAttributeSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            return;
        }
        setIsSavingAttribute(true);
        try {
            if (attributeForm.originalKey) {
                await idpApi.updateIamRealmAttribute(selectedRealmId, attributeForm.originalKey, {
                    key: attributeForm.key,
                    value: attributeForm.value,
                });
                toast.success('Realm attribute updated');
            }
            else {
                await idpApi.createIamRealmAttribute(selectedRealmId, {
                    key: attributeForm.key,
                    value: attributeForm.value,
                });
                toast.success('Realm attribute created');
            }
            await loadExperience();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to save realm attribute');
        }
        finally {
            setIsSavingAttribute(false);
        }
    };
    const handleDeleteAttribute = async (key) => {
        if (!selectedRealmId) {
            return;
        }
        setDeletingAttributeKey(key);
        try {
            await idpApi.deleteIamRealmAttribute(selectedRealmId, key);
            toast.success('Realm attribute deleted');
            await loadExperience();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to delete realm attribute');
        }
        finally {
            setDeletingAttributeKey(null);
        }
    };
    if (!selectedRealmId) {
        return null;
    }
    return (_jsxs("section", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "mb-6 flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.28em] text-slate-400", children: "Phase 5" }), _jsx("h2", { className: "mt-2 text-2xl font-semibold text-slate-950 dark:text-white", children: "Realm Experience" }), _jsx("p", { className: "mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300", children: "Theme, localization, branded notifications, and operator-facing realm presentation now live in the standalone IAM subsystem." })] }), _jsxs("div", { className: "min-w-[280px] rounded-2xl border px-5 py-4 shadow-sm", style: {
                            borderColor: themeForm.surfaceTint,
                            background: `linear-gradient(135deg, ${themeForm.surfaceTint} 0%, ${themeForm.primaryColor}12 100%)`,
                        }, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-white", style: { backgroundColor: themeForm.accentColor }, children: themeForm.logoLabel || 'IAM' }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: themeForm.brandName || experience?.realm.name }), _jsx("p", { className: "text-xs text-slate-600 dark:text-slate-300", children: themeForm.loginTitle || 'Realm login experience' })] })] }), _jsx("p", { className: "mt-3 text-xs text-slate-600 dark:text-slate-300", children: themeForm.footerNote || 'Standalone IAM validation runtime' })] })] }), isLoading ? (_jsx("div", { className: "rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "Loading realm experience\u2026" })) : (_jsxs("div", { className: "grid gap-6", children: [_jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.1fr_0.9fr]", children: [_jsx(Panel, { title: "Theme and Branding", icon: _jsx(Palette, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: _jsxs("form", { className: "grid gap-4", onSubmit: handleThemeSubmit, children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledInput, { label: "Brand name", value: themeForm.brandName, onChange: (value) => setThemeForm((current) => ({ ...current, brandName: value })) }), _jsx(LabeledInput, { label: "Logo label", value: themeForm.logoLabel, onChange: (value) => setThemeForm((current) => ({ ...current, logoLabel: value })) }), _jsx(LabeledSelect, { label: "Preset", value: themeForm.preset, onChange: (value) => setThemeForm((current) => ({ ...current, preset: value })), options: ['PLATFORM_DEFAULT', 'OCEAN', 'FOREST', 'SUNSET', 'SLATE'] }), _jsx(LabeledInput, { label: "Support email", value: themeForm.supportEmail, onChange: (value) => setThemeForm((current) => ({ ...current, supportEmail: value })) }), _jsx(LabeledInput, { label: "Support URL", value: themeForm.supportUrl, onChange: (value) => setThemeForm((current) => ({ ...current, supportUrl: value })) }), _jsx(LabeledInput, { label: "Docs URL", value: themeForm.docsUrl, onChange: (value) => setThemeForm((current) => ({ ...current, docsUrl: value })) }), _jsx(LabeledInput, { label: "Primary color", value: themeForm.primaryColor, onChange: (value) => setThemeForm((current) => ({ ...current, primaryColor: value })) }), _jsx(LabeledInput, { label: "Accent color", value: themeForm.accentColor, onChange: (value) => setThemeForm((current) => ({ ...current, accentColor: value })) }), _jsx(LabeledInput, { label: "Surface tint", value: themeForm.surfaceTint, onChange: (value) => setThemeForm((current) => ({ ...current, surfaceTint: value })) }), _jsx(LabeledInput, { label: "Footer note", value: themeForm.footerNote, onChange: (value) => setThemeForm((current) => ({ ...current, footerNote: value })) })] }), _jsx(LabeledInput, { label: "Login title", value: themeForm.loginTitle, onChange: (value) => setThemeForm((current) => ({ ...current, loginTitle: value })) }), _jsx(LabeledTextarea, { label: "Login subtitle", value: themeForm.loginSubtitle, onChange: (value) => setThemeForm((current) => ({ ...current, loginSubtitle: value })), rows: 2 }), _jsx(LabeledInput, { label: "Account title", value: themeForm.accountTitle, onChange: (value) => setThemeForm((current) => ({ ...current, accountTitle: value })) }), _jsx(LabeledTextarea, { label: "Account subtitle", value: themeForm.accountSubtitle, onChange: (value) => setThemeForm((current) => ({ ...current, accountSubtitle: value })), rows: 2 }), _jsx(LabeledInput, { label: "Admin title", value: themeForm.adminTitle, onChange: (value) => setThemeForm((current) => ({ ...current, adminTitle: value })) }), _jsx(LabeledTextarea, { label: "Admin subtitle", value: themeForm.adminSubtitle, onChange: (value) => setThemeForm((current) => ({ ...current, adminSubtitle: value })), rows: 2 }), _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "submit", disabled: !canManage || isSavingTheme, className: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200", children: isSavingTheme ? 'Saving…' : 'Save Theme' }) })] }) }), _jsx(Panel, { title: "Localization", icon: _jsx(Globe2, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: _jsxs("form", { className: "grid gap-4", onSubmit: handleLocalizationSubmit, children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledInput, { label: "Default locale", value: localizationForm.defaultLocale, onChange: (value) => setLocalizationForm((current) => ({ ...current, defaultLocale: value })) }), _jsx(LabeledSelect, { label: "Mode", value: localizationForm.mode, onChange: (value) => setLocalizationForm((current) => ({ ...current, mode: value })), options: ['REALM_DEFAULT', 'CUSTOM'] })] }), _jsx(LabeledInput, { label: "Supported locales", value: localizationForm.supportedLocales, onChange: (value) => setLocalizationForm((current) => ({ ...current, supportedLocales: value })) }), _jsx(LabeledTextarea, { label: "Translations JSON", value: localizationForm.translationsJson, onChange: (value) => setLocalizationForm((current) => ({ ...current, translationsJson: value })), rows: 14 }), _jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300", children: [_jsx("p", { className: "font-semibold text-slate-900 dark:text-white", children: "Active locale preview" }), _jsxs("p", { className: "mt-2", children: ["login_headline: ", String(activeLocalePreview.login_headline ?? '')] }), _jsxs("p", { children: ["account_headline: ", String(activeLocalePreview.account_headline ?? '')] }), _jsxs("p", { children: ["admin_headline: ", String(activeLocalePreview.admin_headline ?? '')] })] }), _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "submit", disabled: !canManage || isSavingLocalization, className: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200", children: isSavingLocalization ? 'Saving…' : 'Save Localization' }) })] }) })] }), _jsx(Panel, { title: "Realm Attributes", icon: _jsx(Sparkles, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: _jsxs("div", { className: "grid gap-4", children: [_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300", children: ["Realm attributes provide extensible key/value configuration at the realm level. Public login currently consumes ", _jsx("code", { className: "rounded bg-slate-200 px-1 py-0.5 dark:bg-slate-800", children: "login.signup_url" }), " from this store."] }), _jsxs("div", { className: "grid gap-4 xl:grid-cols-[1.1fr_0.9fr]", children: [_jsx("div", { className: "overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { className: "bg-slate-50 dark:bg-slate-950/50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left font-medium text-slate-500", children: "Key" }), _jsx("th", { className: "px-3 py-2 text-left font-medium text-slate-500", children: "Value" }), _jsx("th", { className: "px-3 py-2 text-left font-medium text-slate-500", children: "Updated" }), _jsx("th", { className: "px-3 py-2 text-left font-medium text-slate-500", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-900", children: realmAttributes.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-3 py-6 text-center text-slate-500", children: "No realm attributes configured." }) })) : realmAttributes.map((attribute) => (_jsxs("tr", { children: [_jsx("td", { className: "px-3 py-2 font-medium text-slate-900 dark:text-white", children: attribute.key }), _jsx("td", { className: "px-3 py-2 text-slate-600 dark:text-slate-300", children: _jsx("span", { className: "break-all", children: attribute.value }) }), _jsx("td", { className: "px-3 py-2 text-slate-500", children: new Date(attribute.updated_at).toLocaleString() }), _jsx("td", { className: "px-3 py-2", children: _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: () => setAttributeForm({
                                                                                    originalKey: attribute.key,
                                                                                    key: attribute.key,
                                                                                    value: attribute.value,
                                                                                }), className: "rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }), _jsx("button", { type: "button", onClick: () => void handleDeleteAttribute(attribute.key), disabled: deletingAttributeKey === attribute.key || !canManage, className: "rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40", children: deletingAttributeKey === attribute.key ? 'Deleting…' : 'Delete' })] }) })] }, attribute.id))) })] }) }), _jsxs("form", { className: "grid gap-4", onSubmit: handleAttributeSubmit, children: [_jsx(LabeledInput, { label: "Key", value: attributeForm.key, onChange: (value) => setAttributeForm((current) => ({ ...current, key: value })) }), _jsx(LabeledTextarea, { label: "Value", value: attributeForm.value, onChange: (value) => setAttributeForm((current) => ({ ...current, value })), rows: 8 }), _jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300", children: ["Suggested key for login signup handoff: ", _jsx("code", { className: "rounded bg-slate-200 px-1 py-0.5 dark:bg-slate-800", children: "login.signup_url" })] }), _jsxs("div", { className: "flex flex-wrap justify-end gap-3", children: [_jsx("button", { type: "button", onClick: () => setAttributeForm(emptyAttributeForm()), className: "rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Reset" }), _jsx("button", { type: "submit", disabled: !canManage || isSavingAttribute, className: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200", children: isSavingAttribute ? 'Saving…' : attributeForm.originalKey ? 'Update Attribute' : 'Create Attribute' })] })] })] })] }) }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.05fr_0.95fr]", children: [_jsx(Panel, { title: "Notification Templates", icon: _jsx(Mail, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: _jsxs("div", { className: "grid gap-4", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-[0.92fr_1.08fr]", children: [_jsx("div", { className: "rounded-2xl border border-slate-200 dark:border-slate-800", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { className: "bg-slate-50 dark:bg-slate-950/50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left font-medium text-slate-500", children: "Template" }), _jsx("th", { className: "px-3 py-2 text-left font-medium text-slate-500", children: "Key" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-900", children: templates.map((template) => (_jsxs("tr", { className: `cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-950/50 ${templateForm.id === template.id ? 'bg-slate-50 dark:bg-slate-950/60' : ''}`, onClick: () => {
                                                                        setTemplateForm(buildTemplateForm(template));
                                                                        setTemplatePreview(null);
                                                                    }, children: [_jsx("td", { className: "px-3 py-2 font-medium text-slate-900 dark:text-white", children: template.name }), _jsx("td", { className: "px-3 py-2 text-slate-500", children: template.key })] }, template.id))) })] }) }), _jsxs("form", { className: "grid gap-4", onSubmit: handleTemplateSubmit, children: [_jsx(LabeledInput, { label: "Template name", value: templateForm.name, onChange: (value) => setTemplateForm((current) => ({ ...current, name: value })) }), _jsx(LabeledInput, { label: "CTA label", value: templateForm.ctaLabel, onChange: (value) => setTemplateForm((current) => ({ ...current, ctaLabel: value })) }), _jsx(LabeledTextarea, { label: "Subject template", value: templateForm.subjectTemplate, onChange: (value) => setTemplateForm((current) => ({ ...current, subjectTemplate: value })), rows: 3 }), _jsx(LabeledTextarea, { label: "Body template", value: templateForm.bodyTemplate, onChange: (value) => setTemplateForm((current) => ({ ...current, bodyTemplate: value })), rows: 8 }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { type: "button", onClick: handlePreviewTemplate, className: "rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Preview" }), _jsx("button", { type: "submit", disabled: !canManage || isSavingTemplate, className: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200", children: isSavingTemplate ? 'Saving…' : 'Save Template' })] })] })] }), templatePreview ? (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40", children: [_jsx("p", { className: "font-semibold text-slate-900 dark:text-white", children: "Preview subject" }), _jsx("p", { className: "mt-1 text-slate-600 dark:text-slate-300", children: templatePreview.subject }), _jsx("p", { className: "mt-4 font-semibold text-slate-900 dark:text-white", children: "Preview body" }), _jsx("pre", { className: "mt-2 whitespace-pre-wrap font-sans text-slate-600 dark:text-slate-300", children: templatePreview.body })] })) : null] }) }), _jsx(Panel, { title: "Notification Delivery", icon: _jsx(Send, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: _jsxs("div", { className: "grid gap-4", children: [_jsx("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40", children: _jsxs("div", { className: "grid gap-3 md:grid-cols-[1fr_auto]", children: [_jsx(LabeledInput, { label: "Test recipient", value: testRecipient, onChange: setTestRecipient }), _jsx("button", { type: "button", onClick: handleSendTest, disabled: !canManage || isSendingTest, className: "mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200", children: isSendingTest ? 'Sending…' : 'Send Test' })] }) }), _jsx("div", { className: "overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { className: "bg-slate-50 dark:bg-slate-950/50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left font-medium text-slate-500", children: "Sent" }), _jsx("th", { className: "px-3 py-2 text-left font-medium text-slate-500", children: "Template" }), _jsx("th", { className: "px-3 py-2 text-left font-medium text-slate-500", children: "Recipient" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-900", children: deliveries.slice(0, 8).map((delivery) => (_jsxs("tr", { children: [_jsx("td", { className: "px-3 py-2 text-slate-500", children: new Date(delivery.sent_at).toLocaleString() }), _jsx("td", { className: "px-3 py-2 font-medium text-slate-900 dark:text-white", children: delivery.template_key }), _jsx("td", { className: "px-3 py-2 text-slate-600 dark:text-slate-300", children: delivery.recipient_email })] }, delivery.id))) })] }) })] }) })] })] }))] }));
}
function Panel({ title, icon, children, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 p-5 dark:border-slate-800", children: [_jsxs("div", { className: "mb-4 flex items-center gap-3", children: [_jsx("div", { className: "rounded-xl bg-slate-100 p-2 dark:bg-slate-800", children: icon }), _jsx("h3", { className: "text-lg font-semibold text-slate-950 dark:text-white", children: title })] }), children] }));
}
function LabeledInput({ label, value, onChange, }) {
    return (_jsxs("label", { className: "grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200", children: [_jsx("span", { children: label }), _jsx("input", { value: value, onChange: (event) => onChange(event.target.value), className: "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" })] }));
}
function LabeledTextarea({ label, value, onChange, rows, }) {
    return (_jsxs("label", { className: "grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200", children: [_jsx("span", { children: label }), _jsx("textarea", { rows: rows, value: value, onChange: (event) => onChange(event.target.value), className: "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" })] }));
}
function LabeledSelect({ label, value, onChange, options, }) {
    return (_jsxs("label", { className: "grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200", children: [_jsx("span", { children: label }), _jsx("select", { value: value, onChange: (event) => onChange(event.target.value), className: "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white", children: options.map((option) => (_jsx("option", { value: option, children: option }, option))) })] }));
}
