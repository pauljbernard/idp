import React from 'react'
import type { DocRecord } from '../docs'

interface DocsPageProps {
  doc: DocRecord
}

export default function DocsPage({ doc }: DocsPageProps) {
  return (
    <article className="prose">
      <div className="mb-4 text-sm text-gray-500">{doc.relativePath}</div>
      <div dangerouslySetInnerHTML={{ __html: doc.html }} />
    </article>
  )
}
