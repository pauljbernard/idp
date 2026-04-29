import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import InlineStyles from './components/InlineStyles'
import DocsPage from './components/DocsPage'
import { docs, docsByRoute } from './docs'

function DocsRouter() {
  const location = useLocation()
  const currentDoc = docsByRoute.get(location.pathname) ?? docsByRoute.get('/') ?? docs[0]

  if (!currentDoc) {
    return null
  }

  return (
    <>
      <InlineStyles />
      <Layout docs={docs} currentDoc={currentDoc}>
        <Routes>
          {docs.map((doc) => (
            <Route
              key={doc.routePath}
              path={doc.routePath === '/' ? '/' : `${doc.routePath}`}
              element={<DocsPage doc={doc} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </>
  )
}

function App() {
  return <DocsRouter />
}

export default App
