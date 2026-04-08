# Third-Party Acknowledgements

This file is a best-effort acknowledgement of notable third-party dependencies used by this project. It is not legal advice and should not be treated as an authoritative software bill of materials or a substitute for verifying licenses from the resolved dependency tree and each upstream project.

## Commonly MIT-Licensed Dependencies

The following dependencies are commonly distributed under MIT-style terms. Verify exact versions against upstream sources before relying on this list for compliance.

### React Ecosystem

- **react** - A JavaScript library for building user interfaces (^18.2.0)
- **react-dom** - React package for working with the DOM (^18.2.0)
- **next** - The React Framework for the Web (^14.0.0)
- **@tanstack/react-table** - Headless UI for building powerful tables & datagrids (^8.21.3)
- **@types/react** - TypeScript definitions for React (^18.2.0)
- **@types/react-dom** - TypeScript definitions for React DOM (^18.2.0)
- **@vitejs/plugin-react** - Vite plugin for React projects (^4.2.0)
- **@testing-library/react** - Simple and complete React DOM testing utilities (^16.3.2)
- **@testing-library/user-event** - Simulate user events for testing (^14.6.1)

### CRDT/Sync

- **yjs** - Shared data types for building collaborative software (^13.6.0)
- **y-protocols** - Yjs network protocols (^1.0.7)
- **y-indexeddb** - Yjs persistence provider for IndexedDB (^9.0.12)
- **@hocuspocus/provider** - Hocuspocus client-side provider (^2.15.3)
- **@hocuspocus/server** - Hocuspocus server implementation (^2.0.0)
- **@hocuspocus/extension-database** - Database extension for Hocuspocus (^2.0.0)

### UI Components

- **@radix-ui/react-dialog** - An accessible dialog component for React (^1.1.15)
- **@radix-ui/react-label** - An accessible label component for React (^2.1.8)
- **@radix-ui/react-select** - An accessible select component for React (^2.2.6)
- **@radix-ui/react-slot** - A slot component for React (^1.2.4)
- **@radix-ui/react-tabs** - An accessible tabs component for React (^1.1.13)
- **@radix-ui/react-tooltip** - An accessible tooltip component for React (^1.2.8)
- **@xyflow/react** - React Flow library for building node-based editors (^12.10.0)
- **lucide-react** - Beautiful & consistent icon toolkit for React (^0.563.0)
- **class-variance-authority** - Class variance authority for Tailwind CSS (^0.7.1)
- **clsx** - A tiny utility for constructing className strings conditionally (^2.1.1)
- **tailwind-merge** - Utility function to efficiently merge Tailwind CSS classes (^3.4.0)
- **tailwindcss-animate** - Tailwind CSS plugin for adding animation utilities (^1.0.7)

### Database & Server

- **drizzle-orm** - TypeScript ORM for SQL databases (^0.38.0)
- **drizzle-kit** - CLI tool for Drizzle ORM (^0.28.0)
- **fastify** - Fast and low overhead web framework for Node.js (^4.26.0)
- **@fastify/cors** - Fastify CORS plugin (^9.0.0)
- **@fastify/websocket** - WebSocket support for Fastify (^8.3.0)
- **postgres** - Fast, full-featured PostgreSQL client for Node.js (^3.4.0)
- **bcryptjs** - Optimized bcrypt in JavaScript with zero dependencies (^3.0.3)
- **@types/bcryptjs** - TypeScript definitions for bcryptjs (^3.0.0)

### Development Tools

- **typescript** - TypeScript is a language for application-scale JavaScript (^5.3.0)
- **eslint** - Pluggable JavaScript linter (^8.56.0)
- **prettier** - Code formatter (^3.8.1)
- **vitest** - A Vite-native unit test framework (^1.0.0)
- **husky** - Git hooks made easy (^9.1.7)
- **lint-staged** - Run linters on git staged files (^16.2.7)
- **turbo** - High-performance build system for JavaScript and TypeScript (^2.0.0)
- **tsx** - TypeScript Execute - Node.js enhanced with esbuild to run TypeScript (^4.7.0)
- **@types/node** - TypeScript definitions for Node.js (^20.0.0)
- **@types/ws** - TypeScript definitions for ws (^8.18.1)
- **autoprefixer** - Parse CSS and add vendor prefixes to CSS rules (^10.4.24)
- **postcss** - Tool for transforming styles with JS plugins (^8.5.6)
- **jsdom** - A JavaScript implementation of the DOM and HTML standards (^23.0.0)

### Python Dependencies

- **fastapi** - FastAPI framework, high performance, easy to learn, fast to code (^0.109.0)
- **uvicorn** - The lightning-fast ASGI server (^0.27.0)
- **python-dotenv** - Read key-value pairs from a .env file and set them as environment variables (^1.0.0)
- **tiktoken** - Fast BPE tokeniser for use with OpenAI's models (^0.5.0)
- **pytest** - Framework for writing tests (^8.0.0)
- **pytest-asyncio** - Pytest support for asyncio (^0.23.0)
- **httpx** - A next generation HTTP client for Python (^0.26.0)

### Utilities

- **jszip** - Create, read and edit .zip files with JavaScript (^3.10.1)
- **ws** - Simple to use, blazing fast and thoroughly tested WebSocket client and server (^8.19.0)

## Commonly Apache-2.0-Licensed Dependencies

The following dependencies are commonly distributed under Apache-2.0 terms. Verify exact versions against upstream sources before relying on this list for compliance.

- **@aws-sdk/client-s3** - AWS SDK for JavaScript S3 Client (^3.985.0)
- **@aws-sdk/s3-request-presigner** - AWS SDK for JavaScript S3 Request Presigner (^3.985.0)
- **next-auth** - Authentication for Next.js (5.0.0-beta.30)
- **google-generativeai** - Google Generative AI Python SDK (^0.3.0)

## Commonly BSD-Licensed Dependencies

### BSD 3-Clause License

- **tailwindcss** - A utility-first CSS framework for rapidly building custom designs (^4.1.18)
- **@tailwindcss/postcss** - PostCSS plugin for Tailwind CSS (^4.1.18)

### BSD 2-Clause License

- **eslint-config-next** - ESLint configuration for Next.js (^14.0.0)

## Commonly ISC-Licensed Dependencies

The following dependencies are commonly distributed under ISC terms. Verify exact versions against upstream sources before relying on this list for compliance.

- **openai** - The official Python library for the OpenAI API (^1.10.0)

## Services and Commercial Offerings

The following packages interface with hosted/commercial products and should be reviewed separately against the vendor's current terms:

- **pinecone-client** - Pinecone vector database client (^3.0.0) - Proprietary license, requires Pinecone account

## Notes

1. **Verification Required**: This acknowledgement list is intentionally conservative and incomplete. For release/compliance use, verify exact licenses from the resolved lockfile, installed package metadata, and each upstream repository.

2. **Version Ranges**: Version numbers shown are the minimum versions specified in package.json files. Actual installed versions may be newer.

3. **Workspace Packages**: The following packages are internal workspace packages and are licensed under MIT:
   - **@highport/shared** - Shared TypeScript types and utilities
   - **@highport/mgt2e** - Sci-fi TTRPG game data and types

4. **Development Dependencies**: All development dependencies are included in this list as they are part of the development and build process.

5. **Python Dependencies**: Python dependencies are managed via Poetry and are included in the appropriate license categories.

## Acknowledgments

We extend our sincere gratitude to all the open-source maintainers and contributors whose work makes this project possible. Your dedication to building and maintaining high-quality software is deeply appreciated.

If you believe any acknowledgement is incorrect or missing, please open an issue or pull request.
