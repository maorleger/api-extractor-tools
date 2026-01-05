# API Extractor Viewer

A web-based tool for visualizing and exploring [API Extractor](https://api-extractor.com/) JSON output files. Similar to AST explorers, this tool helps you understand the structure of your TypeScript API documentation.

![API Extractor Viewer](https://img.shields.io/badge/TypeScript-Next.js-blue)
![Built with GitHub Copilot](https://img.shields.io/badge/Built%20with-GitHub%20Copilot-8957e5)

> **🤖 AI-Powered Development**  
> This entire project was coded using [GitHub Copilot](https://github.com/features/copilot) in VS Code. From initial scaffolding to the comprehensive JS Model view, every line of code was generated through conversational AI pair programming.

## Features

- **📋 Paste & Parse** - Paste your `.api.json` content directly into the browser
- **🌲 Interactive Tree View** - Navigate the API hierarchy with collapsible nodes
- **🔍 Node Details** - View comprehensive information about each API item
- **🧩 JS Model View** - Inspect the actual JavaScript object properties (including `undefined` vs empty arrays)
- **🏷️ Mixin Detection** - See which API Extractor mixins apply to each node
- **📝 Raw JSON** - Access the original JSON data for any node
- **🔗 Breadcrumb Navigation** - Easily navigate up the hierarchy

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/maorleger/api-extractor-tools.git
cd api-extractor-tools

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Usage

1. **Generate an API report** using [API Extractor](https://api-extractor.com/):

   ```bash
   api-extractor run --local
   ```

2. **Copy the contents** of your generated `.api.json` file (e.g., `temp/your-package.api.json`)

3. **Paste into the viewer** and click "Parse" (or press `Ctrl+Enter`)

4. **Explore the tree** - Click on nodes to view their details

## Understanding the Views

### Tree View

The left panel shows the API hierarchy:

- 📦 **Package** - The root NPM package
- 🚪 **EntryPoint** - Package entry points
- 🔷 **Class** - TypeScript classes
- 🔶 **Interface** - TypeScript interfaces
- ⚡ **Function** - Exported functions
- 🔧 **Method/MethodSignature** - Class/interface methods
- 📝 **Property/PropertySignature** - Properties
- 📌 **Variable** - Exported variables
- 🏷️ **TypeAlias** - Type aliases
- 📋 **Enum** - Enumerations
- 🔨 **Constructor** - Class constructors
- 📁 **Namespace** - TypeScript namespaces

Release tags are shown as badges:

- 🟢 `@public` - Public API
- 🟡 `@beta` - Beta API
- 🟠 `@alpha` - Alpha API
- 🔴 `@internal` - Internal API

### Node Details

The right panel shows detailed information:

- **Basic Information** - Canonical reference and documentation
- **Declaration** - The full TypeScript declaration
- **Modifiers** - `optional`, `readonly`, `static`, `abstract`, `protected`
- **Type Parameters** - Generic type parameters with constraints
- **Parameters** - Function/method parameters
- **Return Type** - Function return type
- **Type** - Property/variable types
- **Inheritance** - `extends` and `implements` relationships
- **Members** - Child items summary

### JS Model View

The **JS Model** section shows the raw JavaScript representation of the API item:

```
Mixins Applied:
[ApiNameMixin] [ApiParameterListMixin] [ApiTypeParameterListMixin]

All Properties:
name: "myFunction"
typeParameters: [] (empty)     ← Explicitly shows empty array
parameters: [2 items]
  [0]: { name: "arg1", type: "string", isOptional: false }
  [1]: { name: "arg2", type: "number", isOptional: true }
returnTypeExcerpt: { text: "Promise<void>", isEmpty: false }
isOptional: undefined          ← Explicitly shows undefined
isStatic: undefined
```

This is particularly useful for:

- Understanding which mixins apply to different API item kinds
- Distinguishing between `undefined` and empty arrays
- Debugging API Extractor output
- Learning the `@microsoft/api-extractor-model` object structure

## Technical Details

### Architecture

- **Frontend**: React 18 with Next.js 14 App Router
- **Styling**: Tailwind CSS
- **API Parsing**: `@microsoft/api-extractor-model` (server-side)

### How It Works

1. The JSON is posted to `/api/parse`
2. Server writes JSON to a temp file (required by api-extractor-model)
3. `ApiModel.loadPackage()` parses the file
4. The API tree is walked recursively, extracting:
   - All mixin properties via `SomeMixin.isBaseClassOf(item)`
   - Class-specific properties (inheritance, etc.)
   - A comprehensive JS model with actual values
5. Serialized tree is returned to the client
6. React renders the interactive tree and details views

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── parse/
│   │       └── route.ts      # API route for parsing JSON
│   ├── globals.css           # Tailwind styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── components/
│   ├── JsonInput.tsx         # JSON textarea input
│   ├── TreeView.tsx          # Collapsible tree component
│   └── NodeDetails.tsx       # Details panel with JS Model view
├── context/
│   └── ViewerContext.tsx     # React context for state management
└── types/
    └── api-extractor.ts      # TypeScript type definitions
```

## Dependencies

- [next](https://nextjs.org/) - React framework
- [react](https://react.dev/) - UI library
- [@microsoft/api-extractor-model](https://www.npmjs.com/package/@microsoft/api-extractor-model) - API Extractor model library
- [tailwindcss](https://tailwindcss.com/) - CSS framework

## Sample Data

A sample `.api.json` file is included at `samples/core-client-node.api.json` for testing.

## Related Projects

- [API Extractor](https://api-extractor.com/) - The tool that generates `.api.json` files
- [API Documenter](https://api-extractor.com/pages/setup/generating_docs/) - Generates documentation from `.api.json`
- [TSDoc](https://tsdoc.org/) - Documentation comment standard used by API Extractor

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
