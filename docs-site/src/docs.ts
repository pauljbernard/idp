const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

const markdownModules = import.meta.glob('../../docs/**/*.md', {
  as: 'raw',
  eager: true,
}) as Record<string, string>

export type DocRecord = {
  sourcePath: string
  relativePath: string
  routePath: string
  title: string
  section: string
  html: string
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '')
}

function getRelativePath(modulePath: string): string {
  const marker = '/docs/'
  const index = modulePath.lastIndexOf(marker)
  return index >= 0 ? modulePath.slice(index + marker.length) : modulePath
}

function titleFromPath(relativePath: string): string {
  const basename = relativePath.split('/').pop() || relativePath
  const withoutExt = basename.replace(/\.md$/i, '')
  if (withoutExt.toLowerCase() === 'readme' || withoutExt.toLowerCase() === 'index') {
    const parent = relativePath.split('/').slice(-2, -1)[0] || 'Documentation'
    return humanize(parent)
  }
  return humanize(withoutExt)
}

function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function normalizeRoutePath(relativePath: string): string {
  if (relativePath === 'README.md') {
    return '/'
  }
  if (relativePath.endsWith('/index.md')) {
    return `/${relativePath.slice(0, -'/index.md'.length)}`
  }
  return `/${relativePath.replace(/\.md$/i, '')}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

function applyInlineMarkdown(input: string, currentRelativePath: string): string {
  let output = escapeHtml(input)

  output = output.replace(/`([^`]+)`/g, '<code>$1</code>')
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const resolved = resolveHref(currentRelativePath, href)
    return `<a href="${escapeAttribute(resolved)}">${label}</a>`
  })

  return output
}

function resolvePathSegments(basePath: string, targetPath: string): string {
  const baseSegments = basePath.split('/').filter(Boolean)
  const targetSegments = targetPath.split('/').filter(Boolean)
  const combined = targetPath.startsWith('/')
    ? targetSegments
    : [...baseSegments.slice(0, -1), ...targetSegments]
  const normalized: string[] = []
  for (const segment of combined) {
    if (segment === '.' || segment === '') {
      continue
    }
    if (segment === '..') {
      normalized.pop()
      continue
    }
    normalized.push(segment)
  }
  return normalized.join('/')
}

function resolveHref(currentRelativePath: string, href: string): string {
  const trimmed = href.trim()
  if (
    trimmed.startsWith('http://')
    || trimmed.startsWith('https://')
    || trimmed.startsWith('mailto:')
  ) {
    return trimmed
  }

  if (trimmed.startsWith('#')) {
    return trimmed
  }

  const [pathPart, hashPart] = trimmed.split('#')
  const resolvedRelative = resolvePathSegments(currentRelativePath, trimLeadingSlash(pathPart || currentRelativePath))

  if (resolvedRelative.toLowerCase().endsWith('.md')) {
    const routePath = normalizeRoutePath(resolvedRelative)
    return `${baseUrl}${routePath}${hashPart ? `#${hashPart}` : ''}`
  }

  return `${baseUrl}/blob/main/docs/${resolvedRelative}${hashPart ? `#${hashPart}` : ''}`
}

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---\n')) {
    return markdown
  }
  const endIndex = markdown.indexOf('\n---\n', 4)
  if (endIndex < 0) {
    return markdown
  }
  return markdown.slice(endIndex + 5)
}

function extractTitle(markdown: string, fallbackTitle: string): string {
  const lines = stripFrontmatter(markdown).split('\n')
  for (const line of lines) {
    const match = line.match(/^#\s+(.+?)\s*$/)
    if (match) {
      return match[1].trim()
    }
  }
  return fallbackTitle
}

function renderTable(lines: string[], currentRelativePath: string): string {
  const rows = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()))

  if (rows.length < 2) {
    return `<p>${applyInlineMarkdown(lines.join(' '), currentRelativePath)}</p>`
  }

  const headers = rows[0]
  const bodyRows = rows.slice(2)

  const headHtml = headers.map((cell) => `<th>${applyInlineMarkdown(cell, currentRelativePath)}</th>`).join('')
  const bodyHtml = bodyRows.map((row) => (
    `<tr>${row.map((cell) => `<td>${applyInlineMarkdown(cell, currentRelativePath)}</td>`).join('')}</tr>`
  )).join('')

  return `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`
}

function renderMarkdown(markdown: string, currentRelativePath: string): string {
  const content = stripFrontmatter(markdown).replace(/\r\n/g, '\n')
  const lines = content.split('\n')
  const html: string[] = []
  let index = 0

  while (index < lines.length) {
    const rawLine = lines[index]
    const line = rawLine.trim()

    if (!line) {
      index += 1
      continue
    }

    if (rawLine.startsWith('```')) {
      const language = rawLine.slice(3).trim()
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      index += 1
      html.push(
        `<pre><code${language ? ` class="language-${escapeAttribute(language)}"` : ''}>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      )
      continue
    }

    if (/^\|.+\|$/.test(line) && index + 1 < lines.length && /^\|?[\s:-|]+\|?$/.test(lines[index + 1].trim())) {
      const tableLines = [rawLine, lines[index + 1]]
      index += 2
      while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
        tableLines.push(lines[index])
        index += 1
      }
      html.push(renderTable(tableLines, currentRelativePath))
      continue
    }

    const headingMatch = rawLine.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      const anchor = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
      html.push(`<h${level} id="${escapeAttribute(anchor)}">${applyInlineMarkdown(text, currentRelativePath)}</h${level}>`)
      index += 1
      continue
    }

    if (rawLine.startsWith('>')) {
      const quoteLines: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      html.push(`<blockquote>${quoteLines.map((entry) => applyInlineMarkdown(entry, currentRelativePath)).join('<br />')}</blockquote>`)
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''))
        index += 1
      }
      html.push(`<ul>${items.map((item) => `<li>${applyInlineMarkdown(item, currentRelativePath)}</li>`).join('')}</ul>`)
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''))
        index += 1
      }
      html.push(`<ol>${items.map((item) => `<li>${applyInlineMarkdown(item, currentRelativePath)}</li>`).join('')}</ol>`)
      continue
    }

    const paragraphLines: string[] = []
    while (
      index < lines.length
      && lines[index].trim()
      && !lines[index].startsWith('```')
      && !/^(#{1,6})\s+/.test(lines[index])
      && !lines[index].trim().startsWith('>')
      && !/^[-*]\s+/.test(lines[index].trim())
      && !/^\d+\.\s+/.test(lines[index].trim())
      && !(/^\|.+\|$/.test(lines[index].trim()) && index + 1 < lines.length && /^\|?[\s:-|]+\|?$/.test(lines[index + 1].trim()))
    ) {
      paragraphLines.push(lines[index].trim())
      index += 1
    }
    html.push(`<p>${applyInlineMarkdown(paragraphLines.join(' '), currentRelativePath)}</p>`)
  }

  return html.join('\n')
}

function sectionForPath(relativePath: string): string {
  const [topLevel] = relativePath.split('/')
  switch (topLevel) {
    case 'foundation':
      return 'Foundation'
    case 'specs':
      return 'Specifications'
    case 'implementation':
      return 'Implementation'
    case 'reference':
      return 'Reference'
    case 'analysis':
      return 'Analysis'
    default:
      return 'Start'
  }
}

function sortDocs(left: DocRecord, right: DocRecord): number {
  const sectionOrder = ['Start', 'Foundation', 'Specifications', 'Implementation', 'Reference', 'Analysis']
  const leftOrder = sectionOrder.indexOf(left.section)
  const rightOrder = sectionOrder.indexOf(right.section)
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder
  }
  if (left.routePath === '/') {
    return -1
  }
  if (right.routePath === '/') {
    return 1
  }
  if (left.relativePath.endsWith('/index.md') && !right.relativePath.endsWith('/index.md')) {
    return -1
  }
  if (!left.relativePath.endsWith('/index.md') && right.relativePath.endsWith('/index.md')) {
    return 1
  }
  return left.relativePath.localeCompare(right.relativePath)
}

export const docs: DocRecord[] = Object.entries(markdownModules)
  .map(([sourcePath, markdown]) => {
    const relativePath = getRelativePath(sourcePath)
    const fallbackTitle = titleFromPath(relativePath)
    return {
      sourcePath,
      relativePath,
      routePath: normalizeRoutePath(relativePath),
      title: extractTitle(markdown, fallbackTitle),
      section: sectionForPath(relativePath),
      html: renderMarkdown(markdown, relativePath),
    }
  })
  .sort(sortDocs)

export const docsByRoute = new Map(docs.map((doc) => [doc.routePath, doc]))
