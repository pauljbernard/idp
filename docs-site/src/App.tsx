import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import InlineStyles from './components/InlineStyles'
import HomePage from './pages/HomePage'
import InstallationPage from './pages/InstallationPage'
import QuickStartPage from './pages/QuickStartPage'
import ArchitecturePage from './pages/ArchitecturePage'
import AuthenticationPage from './pages/AuthenticationPage'
import FederationPage from './pages/FederationPage'
import MultiTenantPage from './pages/MultiTenantPage'
import ApiReferencePage from './pages/ApiReferencePage'
import DeploymentPage from './pages/DeploymentPage'
import TroubleshootingPage from './pages/TroubleshootingPage'

function App() {
  return (
    <>
      <InlineStyles />
      <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/installation" element={<InstallationPage />} />
        <Route path="/quick-start" element={<QuickStartPage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/authentication" element={<AuthenticationPage />} />
        <Route path="/federation" element={<FederationPage />} />
        <Route path="/multi-tenant" element={<MultiTenantPage />} />
        <Route path="/api-reference" element={<ApiReferencePage />} />
        <Route path="/deployment" element={<DeploymentPage />} />
        <Route path="/troubleshooting" element={<TroubleshootingPage />} />
      </Routes>
      </Layout>
    </>
  )
}

export default App