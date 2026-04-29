# IDP Platform Documentation Website

Modern, responsive documentation website for IDP Platform built with React, TypeScript, and Tailwind CSS.

## Overview

This documentation site provides comprehensive coverage of IDP Platform features, including:

- **Installation and Setup** - Local and AWS deployment guides
- **Quick Start Tutorial** - Step-by-step integration guide
- **Architecture Overview** - System design and components
- **Authentication Flows** - OAuth 2.1, OIDC, and SAML implementation
- **Federation Guide** - External identity provider integration
- **Multi-Tenant Configuration** - Enterprise and SaaS deployment patterns
- **API Reference** - Complete REST API documentation
- **Deployment Guide** - Production deployment and operations
- **Troubleshooting** - Common issues and solutions

## Development

### Prerequisites

- Node.js 18+ and npm 8+
- Modern web browser

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

The development server runs on `http://localhost:5173` by default.

## Project Structure

```
docs-site/
├── src/
│   ├── components/
│   │   └── Layout.tsx          # Main layout with navigation
│   ├── pages/
│   │   ├── HomePage.tsx        # Landing page
│   │   ├── InstallationPage.tsx
│   │   ├── QuickStartPage.tsx
│   │   ├── ArchitecturePage.tsx
│   │   ├── AuthenticationPage.tsx
│   │   ├── FederationPage.tsx
│   │   ├── MultiTenantPage.tsx
│   │   ├── ApiReferencePage.tsx
│   │   ├── DeploymentPage.tsx
│   │   └── TroubleshootingPage.tsx
│   ├── styles/
│   │   └── index.css           # Tailwind CSS imports
│   ├── App.tsx                 # Main application component
│   └── main.tsx               # Application entry point
├── public/
│   └── shield.svg             # IDP Platform logo
├── index.html                 # HTML template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Features

### Modern Stack
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons

### Documentation Features
- Responsive design for mobile and desktop
- Interactive code examples
- Syntax highlighting
- Collapsible sections
- Search-friendly structure
- Professional layout with sidebar navigation

### Content Organization
- Logical navigation flow
- Progressive difficulty
- Cross-references between sections
- Complete API reference
- Practical examples and use cases

## Deployment

### Static Hosting

The site builds to static HTML/CSS/JavaScript suitable for deployment on:

- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any static hosting service

### Build Output

```bash
npm run build
```

Generates optimized static files in the `dist/` directory.

### GitHub Pages Deployment

```bash
# Build the site
npm run build

# Deploy to gh-pages branch
npm run deploy
```

## Contributing

### Adding New Pages

1. Create new page component in `src/pages/`
2. Add route to `src/App.tsx`
3. Update navigation in `src/components/Layout.tsx`
4. Follow existing documentation patterns

### Style Guidelines

- Use Tailwind CSS classes for styling
- Follow responsive design patterns
- Maintain consistent component structure
- Use Lucide React icons for consistency

### Content Guidelines

- Write clear, concise documentation
- Include practical examples
- Provide both beginner and advanced content
- Cross-reference related sections
- Keep code examples up to date

## License

This documentation is part of the IDP Platform project. See the main project LICENSE file for details.# Documentation trigger
