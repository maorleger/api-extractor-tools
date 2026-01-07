# API Extractor Viewer - Copilot Instructions

## Project Overview

**API Extractor Viewer** is a Next.js 14 web application for visualizing and exploring API Extractor JSON output files. Built with React 18, TypeScript, and Tailwind CSS, it provides an interactive tree view of TypeScript API documentation similar to AST explorers.

**Repository Type**: Single-page web application  
**Size**: ~1000 lines of TypeScript/TSX code across 9 source files  
**Languages**: TypeScript (strict mode enabled), React, CSS  
**Framework**: Next.js 14 (App Router)  
**Runtime**: Node.js 18+ (tested with Node.js v20.19.6)

## Build & Development Commands

### Prerequisites

- Node.js 18 or higher (v20.19.6 tested)
- npm 10+ (v10.8.2 tested)

### Command Execution Order

**ALWAYS run commands in this sequence:**

1. **Install dependencies** (required before any other command):

   ```bash
   npm install
   ```

   - Duration: ~15 seconds
   - Creates `node_modules/` (~527MB)
   - Must be run after cloning or when `node_modules/` is missing
   - Note: Warnings about deprecated packages (eslint@8, rimraf@3, etc.) are expected and can be ignored

2. **Lint the code**:

   ```bash
   npm run lint
   ```

   - Duration: ~5 seconds
   - Runs ESLint with Next.js config
   - First run shows Next.js telemetry notice (can be ignored)
   - Must pass with no errors before committing

3. **Check code formatting**:

   ```bash
   npm run format:check
   ```

   - Duration: ~3 seconds
   - Verifies Prettier formatting compliance
   - Must pass before committing

4. **Auto-fix formatting** (if format:check fails):

   ```bash
   npm run format
   ```

   - Duration: ~3 seconds
   - Automatically formats all files with Prettier
   - Run this if `format:check` reports issues

5. **Build for production**:

   ```bash
   npm run build
   ```

   - Duration: ~15-20 seconds
   - Creates `.next/` directory (~29MB)
   - Automatically runs linting and type checking as part of build
   - Required before `npm start`

6. **Start production server** (only after build):

   ```bash
   npm start
   ```

   - Duration: Starts in ~300ms
   - **CRITICAL**: Will fail if `npm run build` hasn't been run first with error: "Could not find a production build in the '.next' directory"
   - Serves on http://localhost:3000

7. **Development server** (alternative to build + start):

   ```bash
   npm run dev
   ```

   - Duration: Starts in ~1-2 seconds
   - Hot-reloading enabled
   - Serves on http://localhost:3000
   - Does NOT require `npm run build`

### Complete Validation Workflow

**Always run this sequence before committing:**

```bash
npm install && npm run lint && npm run format:check && npm run build
```

If formatting issues are detected, fix them:

```bash
npm run format && npm run lint && npm run build
```

## Project Architecture & Layout

### Root Directory Files

- `package.json` - Dependencies and npm scripts
- `tsconfig.json` - TypeScript config (strict mode enabled, Next.js App Router paths)
- `next.config.js` - Next.js config with security headers and api-extractor-model external packages
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `.eslintrc.json` - ESLint extending Next.js configs
- `.prettierrc` - Prettier config (semicolons, double quotes, 2-space indent, 100 char width)
- `.prettierignore` - Excludes node_modules, .next, samples from formatting
- `.gitignore` - Excludes node_modules, .next, build artifacts
- `vercel.json` - Vercel deployment config (1024MB memory, 30s timeout for /api/parse)
- `samples/core-client-node.api.json` - Example API Extractor JSON file for testing

### Source Structure (`src/`)

```
src/
├── app/                        # Next.js App Router
│   ├── api/parse/route.ts      # Server API endpoint for parsing .api.json files
│   ├── globals.css             # Tailwind CSS imports and global styles
│   ├── layout.tsx              # Root layout with ViewerProvider
│   └── page.tsx                # Main page with 3-panel layout
├── components/                 # React components
│   ├── JsonInput.tsx           # Textarea for pasting .api.json content
│   ├── TreeView.tsx            # Collapsible tree navigation
│   └── NodeDetails.tsx         # Details panel with JS Model view
├── context/
│   └── ViewerContext.tsx       # React Context for global state
└── types/
    └── api-extractor.ts        # TypeScript type definitions
```

### Key Dependencies

- `next@^14.2.0` - React framework with App Router
- `react@^18.3.0` - UI library
- `@microsoft/api-extractor-model@^7.32.2` - Parses .api.json files (server-side only)
- `tailwindcss@^3.4.0` - Utility-first CSS framework
- `typescript@^5.0.0` - Type checking (strict mode)
- `prettier@^3.7.4` - Code formatting with Tailwind plugin
- `eslint@^8.57.1` - Linting with Next.js config

### Important Configuration Details

1. **TypeScript strict mode**: The project uses `"strict": true`, so all code must be type-safe
2. **Server-side packages**: `@microsoft/api-extractor-model` and its dependencies are configured as external packages in `next.config.js` because they use Node.js APIs
3. **API route runtime**: `src/app/api/parse/route.ts` explicitly uses `runtime = "nodejs"` for filesystem operations
4. **Prettier with Tailwind**: Uses `prettier-plugin-tailwindcss` to sort Tailwind classes

## Common Issues & Workarounds

### Issue: "Could not find a production build" when running `npm start`

**Cause**: `npm start` requires a built application  
**Solution**: Always run `npm run build` before `npm start`

### Issue: Prettier format:check fails on .eslintrc.json

**Cause**: File wasn't formatted with Prettier  
**Solution**: Run `npm run format` to auto-fix

### Issue: Dependencies vulnerabilities warning

**Cause**: Some npm dependencies have security advisories  
**Note**: 3 high severity vulnerabilities are expected. These are in development dependencies (eslint@8). Address only if blocking or if user requests it.

### Issue: Next.js telemetry notice on first lint

**Cause**: First-time Next.js setup  
**Note**: This is informational only and can be ignored

## No Test Suite

**Important**: This project does NOT have any automated tests. Do not attempt to run `npm test` or look for test files (_.test.ts, _.spec.ts). There is no test script in package.json.

## Deployment

The application is deployed on Vercel. The `vercel.json` configures the `/api/parse` endpoint with 1024MB memory and 30-second timeout to handle large .api.json files.

## Code Style Conventions

1. **Use double quotes** for strings (configured in .prettierrc)
2. **Use semicolons** (configured in .prettierrc)
3. **2-space indentation** (configured in .prettierrc)
4. **100 character line width** (configured in .prettierrc)
5. **Strict TypeScript**: No implicit any, strict null checks
6. **Client vs Server components**: Components using hooks must have `"use client"` directive
7. **Path aliases**: Use `@/` for imports (e.g., `@/components`, `@/types`)

## Security

The application implements security headers in `next.config.js`:

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- X-XSS-Protection: 1; mode=block
- Permissions-Policy: Restricts camera, microphone, geolocation

The `/api/parse` endpoint has a 10MB payload size limit (`MAX_PAYLOAD_SIZE`) for security.

## Making Changes

When making code changes:

1. **Always** install dependencies first: `npm install`
2. Make your changes to files in `src/`
3. **Format your code**: `npm run format`
4. **Lint your code**: `npm run lint` (fix any errors)
5. **Build to verify**: `npm run build` (ensures TypeScript types are correct)
6. **Test manually** if UI changes: `npm run dev` and open http://localhost:3000

## Trust These Instructions

These instructions have been validated by running all commands and testing the complete workflow. If you encounter issues not documented here, investigate the specific error rather than assuming the instructions are incorrect. Only perform additional searches if the information here is incomplete or demonstrably incorrect.
