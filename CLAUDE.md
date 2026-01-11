# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components through a chat interface, displays them in real-time using a virtual file system (no disk writes), and allows users to iterate on components through conversation.

## Development Commands

### Initial Setup
```bash
npm run setup
```
Installs dependencies, generates Prisma client, and runs database migrations.

### Development Server
```bash
npm run dev
```
Starts Next.js dev server with Turbopack on http://localhost:3000

### Testing
```bash
npm test          # Run all tests with Vitest
```

### Database Management
```bash
npx prisma generate              # Generate Prisma client after schema changes
npx prisma migrate dev           # Create and apply migrations
npm run db:reset                 # Reset database (force)
npx prisma studio                # Open Prisma Studio GUI
```

### Build and Production
```bash
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
```

## Architecture

### Virtual File System (VFS)

The core innovation is the `VirtualFileSystem` class (`src/lib/file-system.ts`) that maintains an in-memory file tree. Files are never written to disk - everything exists in memory and is serialized to the database for persistence.

- Files stored as `Map<string, FileNode>` with path normalization
- Supports standard file operations: create, read, update, delete, rename
- Serializes to/from JSON for database storage
- Used by both AI tools and preview system

### AI Tool Integration

The application exposes two AI tools to Claude via the Vercel AI SDK:

1. **`str_replace_editor`** (`src/lib/tools/str-replace.ts`): Text editor with commands:
   - `view`: Display file contents with line numbers
   - `create`: Create new files with automatic parent directory creation
   - `str_replace`: Replace text in files (finds and replaces all occurrences)
   - `insert`: Insert text at specific line numbers

2. **`file_manager`** (`src/lib/tools/file-manager.ts`): File operations:
   - `rename`: Move/rename files and directories (creates parent dirs automatically)
   - `delete`: Delete files and directories recursively

Both tools operate on the VirtualFileSystem instance, allowing Claude to manipulate the file tree through natural language.

### Live Preview System

The preview uses JSX transformation and ES modules for hot reloading:

1. **Transform Pipeline** (`src/lib/transform/jsx-transformer.ts`):
   - Transforms JSX/TSX to JavaScript using Babel
   - Extracts imports (both third-party and local)
   - Separates CSS imports for style injection
   - Creates import maps with blob URLs for each transformed file
   - Handles missing imports gracefully (creates placeholders or fetches from esm.sh)

2. **Import Resolution**:
   - Third-party packages: loaded from `esm.sh` CDN
   - Local files: transformed to blob URLs
   - `@/` alias: maps to project root
   - Extension-less imports: automatically resolved

3. **Preview HTML Generation** (`createPreviewHTML`):
   - Injects Tailwind CDN for styling
   - Uses ES modules importmap for dependency resolution
   - Includes error boundary for runtime errors
   - Displays syntax errors prominently when transforms fail

### Chat and Streaming

The chat API (`src/app/api/chat/route.ts`) uses the Vercel AI SDK's `streamText`:

- System prompt injected with ephemeral caching (Anthropic feature)
- VFS deserialized from request and passed to tools
- Streaming response with tool use (agentic loop)
- On finish: saves messages and VFS state to database for authenticated users
- Mock provider available when no API key configured (returns static counter/form/card components)

### Database and Persistence

Prisma with SQLite (`prisma/schema.prisma`):

- **User**: Authentication (email/password with bcrypt)
- **Project**: Stores serialized messages and VFS data as JSON strings
- Projects can be anonymous (userId is optional)
- Cascade delete: deleting user deletes their projects

Generated Prisma client outputs to `src/generated/prisma` to avoid conflicts.

### Authentication

JWT-based auth (`src/lib/auth.ts`):

- Sessions stored in httpOnly cookies using `jose` library
- Middleware (`src/middleware.ts`) handles protected routes
- Anonymous usage supported (project without userId)
- Anonymous work tracking prevents abuse (`src/lib/anon-work-tracker.ts`)

### State Management

React Context providers manage global state:

- **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`): VFS state, selected file, entry point
- **ChatContext** (`src/lib/contexts/chat-context.tsx`): Messages, streaming state, send message handler

Both contexts integrate with Next.js Server Actions for persistence.

## Important Implementation Details

### Path Handling

All file paths in the VFS:
- Must start with `/` (root)
- Are normalized (duplicate slashes removed, trailing slashes removed except root)
- Use forward slashes only
- Parent directories are created automatically when needed

### AI Code Generation Flow

1. User sends message via ChatContext
2. API route receives message + current VFS state
3. Claude generates tool calls to manipulate VFS
4. Tools execute against VFS instance
5. VFS changes trigger preview regeneration
6. Preview iframe reloads with new import map
7. Final state saved to database (if authenticated)

### Preview Update Cycle

When files change:
1. All JS/TS files transformed via Babel
2. Import map created with blob URLs
3. CSS extracted and injected as `<style>` tags
4. New HTML document generated
5. Iframe `srcdoc` updated, triggering reload

### Testing

Vitest with React Testing Library:
- Tests use JSDOM environment
- Component tests in `__tests__` directories
- File system and context tests cover core logic
- Run tests during development to verify changes

## Configuration Notes

- TypeScript paths use `@/` alias for `./src/`
- Tailwind v4 with PostCSS
- Next.js 15 with App Router
- React 19 with automatic JSX runtime
- Vercel AI SDK for streaming and tool use
- Model: Claude Haiku 4.5 (configurable in `src/lib/provider.ts`)
- El esquema de la base de datos esta definido en el archivo @prisma/schema.prisma . Dirigete a el cada vez que necesites entender la estructura de los datos almacenados en la base de datos