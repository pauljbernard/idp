import React from 'react'

export default function InlineStyles() {
  return (
    <style>{`
      /* Comprehensive inline styles for GitHub Pages compatibility */
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

      * {
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', system-ui, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
        color: #374151;
        line-height: 1.6;
      }

      #root {
        min-height: 100vh;
      }

      /* Layout */
      .min-h-screen { min-height: 100vh; }
      .bg-gray-50 { background-color: #f9fafb; }
      .fixed { position: fixed; }
      .inset-y-0 { top: 0; bottom: 0; }
      .left-0 { left: 0; }
      .z-30 { z-index: 30; }
      .w-72 { width: 18rem; }
      .bg-white { background-color: white; }
      .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
      .transform { transform: translateX(0); }
      .transition-transform { transition: transform 0.3s; }
      .lg\\:translate-x-0 { transform: translateX(0); }
      .lg\\:static { position: static; }

      /* Flexbox */
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .h-full { height: 100%; }
      .items-center { align-items: center; }
      .justify-between { justify-between: space-between; }
      .space-x-3 > * + * { margin-left: 0.75rem; }
      .space-y-1 > * + * { margin-top: 0.25rem; }

      /* Padding/Margins */
      .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
      .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
      .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .p-4 { padding: 1rem; }
      .p-6 { padding: 1.5rem; }
      .mb-3 { margin-bottom: 0.75rem; }
      .mb-2 { margin-bottom: 0.5rem; }
      .mb-4 { margin-bottom: 1rem; }
      .mb-6 { margin-bottom: 1.5rem; }
      .mb-8 { margin-bottom: 2rem; }
      .mr-3 { margin-right: 0.75rem; }
      .mr-2 { margin-right: 0.5rem; }
      .mt-8 { margin-top: 2rem; }
      .mt-4 { margin-top: 1rem; }
      .ml-2 { margin-left: 0.5rem; }

      /* Text */
      .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
      .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
      .text-2xl { font-size: 1.5rem; line-height: 2rem; }
      .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
      .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
      .text-xs { font-size: 0.75rem; line-height: 1rem; }
      .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }
      .font-medium { font-weight: 500; }
      .text-gray-900 { color: #111827; }
      .text-gray-800 { color: #1f2937; }
      .text-gray-700 { color: #374151; }
      .text-gray-600 { color: #4b5563; }
      .text-gray-500 { color: #6b7280; }
      .text-center { text-align: center; }

      /* Colors */
      .text-primary-600 { color: #2563eb; }
      .text-primary-700 { color: #1d4ed8; }
      .text-primary-800 { color: #1e40af; }
      .bg-primary-600 { background-color: #2563eb; }
      .bg-primary-50 { background-color: #eff6ff; }
      .border-primary-500 { border-color: #3b82f6; }
      .text-white { color: white; }
      .text-blue-600 { color: #2563eb; }
      .text-blue-800 { color: #1e40af; }
      .text-blue-900 { color: #1e3a8a; }
      .bg-blue-50 { background-color: #eff6ff; }
      .border-blue-200 { border-color: #bfdbfe; }

      /* Borders */
      .border { border-width: 1px; }
      .border-b { border-bottom-width: 1px; }
      .border-gray-200 { border-color: #e5e7eb; }
      .border-gray-300 { border-color: #d1d5db; }
      .rounded-lg { border-radius: 0.5rem; }
      .rounded-xl { border-radius: 0.75rem; }
      .rounded-md { border-radius: 0.375rem; }

      /* Component styles */
      .feature-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: box-shadow 0.3s;
      }

      .feature-card:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .nav-link {
        display: block;
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        text-decoration: none;
        transition: all 0.2s;
      }

      .nav-link:hover {
        color: #2563eb;
        background-color: #f9fafb;
      }

      .nav-link-active {
        background-color: #eff6ff;
        color: #1d4ed8;
        border-right: 2px solid #3b82f6;
      }

      .prose {
        max-width: none;
        color: #374151;
        line-height: 1.75;
      }

      .prose h1 {
        font-size: 1.875rem;
        font-weight: bold;
        color: #111827;
        margin-bottom: 1.5rem;
        margin-top: 2rem;
      }

      .prose h1:first-child {
        margin-top: 0;
      }

      .prose h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 1rem;
        margin-top: 2rem;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.5rem;
      }

      .prose h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.75rem;
        margin-top: 1.5rem;
      }

      .prose p {
        margin-bottom: 1rem;
        line-height: 1.75;
      }

      .prose ul {
        list-style-type: disc;
        list-style-position: inside;
        margin-bottom: 1rem;
      }

      .prose ul li {
        margin-left: 0.5rem;
      }

      .prose a {
        color: #2563eb;
        text-decoration: underline;
      }

      .prose a:hover {
        color: #1e40af;
      }

      .prose code {
        background-color: #f3f4f6;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        font-family: 'JetBrains Mono', Monaco, Consolas, monospace;
        color: #2563eb;
      }

      .prose pre {
        background-color: #111827;
        color: #f9fafb;
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin-bottom: 1rem;
      }

      .prose pre code {
        background-color: transparent;
        padding: 0;
        color: #f9fafb;
      }

      /* Utilities */
      .w-full { width: 100%; }
      .w-5 { width: 1.25rem; }
      .w-6 { width: 1.5rem; }
      .w-8 { width: 2rem; }
      .w-16 { width: 4rem; }
      .h-5 { height: 1.25rem; }
      .h-6 { height: 1.5rem; }
      .h-8 { height: 2rem; }
      .h-16 { height: 4rem; }
      .max-w-3xl { max-width: 48rem; }
      .max-w-4xl { max-width: 56rem; }
      .mx-auto { margin-left: auto; margin-right: auto; }
      .block { display: block; }
      .inline-flex { display: inline-flex; }
      .grid { display: grid; }
      .hidden { display: none; }
      .overflow-x-auto { overflow-x: auto; }
      .transition-colors { transition: color 0.2s, background-color 0.2s; }
      .transition-shadow { transition: box-shadow 0.2s; }
      .no-underline { text-decoration: none; }
      .cursor-pointer { cursor: pointer; }
      .justify-center { justify-content: center; }
      .flex-shrink-0 { flex-shrink: 0; }
      .flex-wrap { flex-wrap: wrap; }
      .gap-4 { gap: 1rem; }
      .gap-6 { gap: 1.5rem; }
      .gap-8 { gap: 2rem; }

      /* Responsive grid */
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
      .lg\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
      .lg\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

      /* Mobile responsive */
      .lg\\:hidden { display: none; }
      .lg\\:block { display: block; }
      .lg\\:pl-72 { padding-left: 18rem; }

      @media (max-width: 1023px) {
        .lg\\:hidden { display: block; }
        .lg\\:block { display: none; }
        .lg\\:pl-72 { padding-left: 0; }
        .md\\:grid-cols-2 { grid-template-columns: 1fr; }
        .lg\\:grid-cols-3 { grid-template-columns: 1fr; }
        .lg\\:grid-cols-4 { grid-template-columns: 1fr; }
        .feature-card { margin-bottom: 1rem; }
      }

      @media (min-width: 768px) {
        .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
      }

      @media (min-width: 1024px) {
        .lg\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
        .lg\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
      }

      /* Layout fixes */
      .sidebar {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        width: 18rem;
        background: white;
        border-right: 1px solid #e5e7eb;
        overflow-y: auto;
        z-index: 30;
      }

      .main-content {
        margin-left: 18rem;
        min-height: 100vh;
      }

      @media (max-width: 1023px) {
        .sidebar {
          transform: translateX(-100%);
        }
        .main-content {
          margin-left: 0;
        }
      }
    `}</style>
  )
}