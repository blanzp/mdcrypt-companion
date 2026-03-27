# mdcrypt Companion

A single-tenant, invite-only team chat application where an AI agent is a first-class participant. Members can hold private conversations with the agent or create shared sessions with teammates to collaborate, ask questions, and have the agent save outputs to [mdcrypt](https://mdcrypt.dev) documents via MCP.

## Features

- **Private sessions** -- 1:1 conversations with the AI agent, backed by your personal notes via MCP
- **Shared sessions** -- Multi-user chat rooms where the AI agent can be summoned with `@keeper`
- **MCP integration** -- 20 tools across notes, folders, crypts, and templates for reading and writing mdcrypt documents
- **Provider-agnostic LLM** -- Switch between Anthropic, OpenAI, and Google Gemini by changing an environment variable
- **Real-time messaging** -- SSE for AI response streaming, Vercel KV for shared session message distribution
- **PWA** -- Installable on iOS via Safari "Add to Home Screen" with standalone display mode

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes |
| Auth | NextAuth.js v4 + Google OAuth |
| Database | Vercel Postgres (Drizzle ORM) |
| Real-time | SSE + Vercel KV (Redis) |
| LLM | Vercel AI SDK v6 (Anthropic, OpenAI, Google) |
| State | Zustand (client), SWR (server) |
| PWA | @ducanh2912/next-pwa |

## Getting Started

### Prerequisites

- Node.js 20+
- A Vercel account with Postgres and KV provisioned
- Google OAuth credentials
- At least one LLM provider API key (Anthropic, OpenAI, or Google)

### Setup

1. Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd mdcrypt-companion
npm install
```

2. Copy the example environment file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required environment variables:

| Variable | Description |
|---|---|
| `ACTIVE_PROVIDER` | `anthropic`, `openai`, or `google` |
| `ACTIVE_MODEL` | Model string for the active provider (e.g. `claude-opus-4`) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_API_KEY` | API key for at least the active provider |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `DATABASE_URL` | Vercel Postgres connection string |
| `KV_URL` / `KV_REST_API_URL` / `KV_REST_API_TOKEN` / `KV_REST_API_READ_ONLY_TOKEN` | Vercel KV credentials |
| `MCP_ENCRYPTION_KEY` | 256-bit hex key for encrypting MCP API keys at rest |

3. Push the database schema:

```bash
npx drizzle-kit push
```

4. Seed the admin user:

```bash
npx tsx scripts/seed-admin.ts admin@example.com "Admin Name"
```

5. Start the development server:

```bash
npm run dev
```

## Roles

| Role | Capabilities |
|---|---|
| **Admin** | Invites/removes team members, configures LLM provider |
| **Member** | Creates private and shared sessions, invites participants to their shared sessions |
| **Session Owner** | Creator of a shared session; their MCP API key is used for document operations |

## @keeper (Shared Sessions)

In shared sessions, the AI agent only responds when summoned with `@keeper`. Typing `@` shows a typeahead autocomplete. When summoned, the agent receives the last N messages as context (default 10, configurable in Settings).

In private sessions, the agent responds to every message with full conversation history.

## MCP Tools

When a user has configured their mdcrypt API key and crypt ID in Settings, the agent gains access to 20 tools:

**Notes** -- `list_notes`, `read_note`, `create_note`, `replace_section`, `append_to_note`, `update_metadata`, `update_task`, `delete_note`, `restore_note`, `move_note`, `get_backlinks`

**Folders** -- `list_folders`, `create_folder`, `delete_folder`

**Crypts** -- `list_crypts`

**Templates** -- `list_templates`, `create_template`, `read_template`, `update_template`, `delete_template`

## Project Structure

```
src/
  app/
    api/
      chat/           # AI chat endpoint (SSE streaming)
      sessions/       # Session CRUD, invites, messages, events
      admin/          # Member management (admin only)
      settings/       # MCP key management
    login/            # Login page
    settings/         # Settings page
    admin/            # Admin panel
  components/
    chat/             # ChatView, MessageBubble, MessageInput, MarkdownRenderer, ToolCallPill
    layout/           # Drawer, FAB, AppShell
    sessions/         # NewSessionModal
    settings/         # McpKeyForm
    ui/               # Button, Input, Modal, Skeleton
  hooks/              # useChat, useSessions, useSessionEvents, useMembers
  stores/             # Zustand app store
  lib/
    llm.ts            # Provider-agnostic LLM abstraction
    mcp.ts            # MCP tool definitions
    auth.ts           # NextAuth configuration
    db/               # Drizzle schema and client
    crypto.ts         # AES-256-GCM encryption for MCP keys
    kv.ts             # Vercel KV helpers
```

## License

Private.
