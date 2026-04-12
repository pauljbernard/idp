import { LocalCmsAccessStore } from './cmsAccessRuntime';

// Neutral alias for the shared governance access-control service so control-plane
// code does not depend on the CMS-specific runtime name directly.
export const LocalGovernanceAccessStore = LocalCmsAccessStore;
