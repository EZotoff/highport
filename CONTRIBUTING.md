# Contributing to Highport

Thank you for your interest in contributing to Highport! We appreciate your time and effort.

Highport is a real-time collaborative TTRPG campaign management platform. It helps Game Masters and players collaborate on campaign notes, faction relationships, and character data with seamless sync between multiple users.

Please read this guide before submitting issues or pull requests. It will save time for everyone involved.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [PR Process](#pr-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Good First Issues](#good-first-issues)
- [Where to Ask Questions](#where-to-ask-questions)
- [Project Structure](#project-structure)

---

## Development Setup

### Prerequisites

- Node.js 20+ (check with `node --version`)
- pnpm 9+ (check with `pnpm --version`)
- Docker (for PostgreSQL)
- Python 3.11+ (for RAG service)

### Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/ezotoff/highport.git
   cd highport
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start local PostgreSQL:

   ```bash
   docker compose up -d
   ```

4. Run database migrations:

   ```bash
   pnpm --filter server db:migrate
   ```

5. Start development servers:
   ```bash
   pnpm dev
   ```

The services will be available at:

| Service       | Port | Description               |
| ------------- | ---- | ------------------------- |
| Web (Next.js) | 3010 | Frontend UI               |
| Hocuspocus    | 3011 | WebSocket sync server     |
| Fastify API   | 3012 | REST API                  |
| RAG Service   | 8000 | Python FastAPI (optional) |

### Running the RAG Service (Optional)

The AI-powered "Ask Computer" feature requires the RAG service:

```bash
cd apps/rag-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install poetry
poetry install
poetry run uvicorn main:app --reload
```

---

## Branch Naming

Use the following prefixes for your branches:

| Prefix     | Purpose                               | Example                      |
| ---------- | ------------------------------------- | ---------------------------- |
| `feature/` | New features or capabilities          | `feature/campaign-templates` |
| `fix/`     | Bug fixes                             | `fix/sync-latency`           |
| `docs/`    | Documentation updates                 | `docs/api-examples`          |
| `chore/`   | Maintenance tasks, dependency updates | `chore/update-drizzle`       |

Keep branch names concise but descriptive. Use kebab-case (hyphens, not underscores).

---

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean and readable history. All commit messages must follow this format:

```
<type>[(optional scope)]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type        | Purpose                                     |
| ----------- | ------------------------------------------- |
| `feat:`     | New feature                                 |
| `fix:`      | Bug fix                                     |
| `docs:`     | Documentation only                          |
| `chore:`    | Maintenance, refactoring, tooling           |
| `ci:`       | CI/CD changes                               |
| `test:`     | Adding or fixing tests                      |
| `refactor:` | Code refactoring without functional changes |

### Examples

```
feat(auth): add password reset flow

fix(graph): prevent node overlap on drag

docs(api): document campaign endpoints

chore(deps): update next-auth to v5 beta

test(sync): add multi-user conflict resolution tests
```

### Tips

- Use the imperative mood: "add feature" not "added feature" or "adds feature"
- Keep the first line under 72 characters
- Reference issues in the body or footer when applicable: `Fixes #123`

---

## PR Process

1. **Fork** the repository (if external contributor)

2. **Create a branch** from `main` using the naming conventions above

3. **Make your changes** following the code style guidelines

4. **Test your changes** locally:

   ```bash
   pnpm typecheck
   pnpm test
   pnpm build
   ```

5. **Commit** with a conventional commit message

6. **Push** your branch:

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** on GitHub

8. **Fill out the PR template** completely

9. **Ensure CI checks pass** (they run automatically)

10. **Address review feedback** promptly

11. **Merge** only after approval and passing CI

### PR Title Format

Your PR title should follow the same conventional commit format:

```
feat(auth): implement OAuth with Discord
```

### What to Include

- Clear description of what changed and why
- Screenshots for UI changes
- Link to related issues: `Fixes #123`
- Testing instructions if needed
- Breaking change notes if applicable

---

## Code Style

We use **Prettier** for code formatting. Configuration is in `.prettierrc` at the repository root.

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### No Manual Formatting Needed

You do not need to manually format your code. We use **Husky** pre-commit hooks that automatically run Prettier on staged files via **lint-staged** when you commit.

Simply write your code and commit normally. The formatting will be applied automatically.

### Manual Formatting (if needed)

If you want to format the entire codebase:

```bash
pnpm format
```

To check if files are formatted (used in CI):

```bash
pnpm format:check
```

---

## Testing

All pull requests must pass our testing requirements before merging.

### Required Checks

Before submitting a PR, ensure these pass locally:

```bash
pnpm typecheck   # TypeScript type checking
pnpm test        # Unit and integration tests
pnpm build       # Production build
```

### Test Structure

| Type             | Location            | Framework  | Notes                |
| ---------------- | ------------------- | ---------- | -------------------- |
| Unit/Integration | `apps/*/__tests__/` | Vitest     | Run with `pnpm test` |
| E2E              | `apps/web/e2e/`     | Playwright | Run with `pnpm e2e`  |

### Running Tests

```bash
# All tests
pnpm test

# Specific app tests
pnpm --filter web test
pnpm --filter server test

# Watch mode for web tests
pnpm --filter web test:watch
```

### E2E Tests

E2E tests require Playwright browsers to be installed:

```bash
npx playwright install chromium
```

Run E2E tests:

```bash
pnpm e2e
```

With UI mode for debugging:

```bash
pnpm --filter web e2e:ui
```

### Server Tests

Server tests require PostgreSQL to be running via Docker:

```bash
docker compose up -d  # Start PostgreSQL first
pnpm --filter server test
```

### What We Test

- Graph node CRUD operations
- Table editing and sync
- Real-time sync between multiple users
- Authentication flows
- API endpoint correctness
- Component rendering and interaction

---

## Good First Issues

New to the project? Look for issues labeled `good first issue` on our GitHub Issues page.

These issues are:

- Well-defined with clear acceptance criteria
- Small in scope
- Do not require deep architectural knowledge
- Great for learning the codebase

To find them:

1. Go to [GitHub Issues](../../issues)
2. Click on the **Labels** dropdown
3. Select `good first issue`

Do not hesitate to ask questions on the issue if anything is unclear. We are happy to help newcomers get started.

---

## Where to Ask Questions

### GitHub Issues

Use GitHub Issues for:

- Bug reports
- Feature requests
- Technical questions about the codebase

Before creating a new issue, please search existing issues to avoid duplicates.

### GitHub Discussions

For general questions, brainstorming, or community chat, use GitHub Discussions (when enabled).

### Good Issue Reports

When reporting bugs, please include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (browser, Node version, OS)
- Console error messages

---

## Project Structure

Highport is a monorepo using pnpm workspaces and Turborepo.

```
highport/
├── apps/
│   ├── web/              # Next.js 14 frontend
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utility functions, Yjs helpers
│   │
│   ├── server/           # Fastify + Hocuspocus backend
│   │   ├── src/api/      # REST API routes
│   │   ├── src/db/       # Drizzle ORM schema and migrations
│   │   └── src/ws/       # WebSocket server (Hocuspocus)
│   │
│   └── rag-service/      # Python FastAPI RAG service
│       ├── providers/    # LLM and VectorDB providers
│       └── core/         # RAG pipeline logic
│
├── packages/
│   ├── shared/           # Shared TypeScript types and utilities
│   │   └── src/types/    # Core type definitions (GraphNode, GraphEdge, etc.)
│   │
│   └── foundry-module/   # Foundry VTT bridge module
│       └── src/          # Module scripts for Foundry VTT integration
│
├── .husky/               # Git hooks
├── .prettierrc           # Prettier configuration
└── package.json          # Root package with workspace definitions
```

### Key Technologies

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, React Flow
- **Backend**: Fastify, Hocuspocus (Yjs WebSocket server), Drizzle ORM
- **Database**: PostgreSQL
- **Sync**: Yjs CRDTs for real-time collaboration
- **Testing**: Vitest, Playwright
- **RAG**: Python, FastAPI, ChromaDB, Ollama

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## License

By contributing to Highport, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

Thank you for contributing to Highport! Your efforts help make campaign management better for TTRPG players everywhere.
