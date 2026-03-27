# mdcrypt Companion — Architecture Document

## 1. Product Overview

**mdcrypt Companion** is a single-tenant, invite-only team chat application where an AI agent is a first-class participant. Members can hold private conversations with the agent (backed by their personal notes via MCP) or create shared sessions with any subset of the team to collaborate, ask questions, and have the agent save outputs to documents.

---

## 2. Roles & Permissions

| Role | Capabilities |
|---|---|
| **Admin** | Invites and removes team members; configures LLM provider via environment variables |
| **Member** | Creates private sessions; creates shared sessions; invites team subset to their shared sessions |
| **Session Owner** | The creator of a shared session; only they can invite additional members; their MCP API key is used by the agent for document operations |

---

## 3. Session Modes

### Private Sessions
- One member + the agent
- Unlimited per member
- Agent uses the member's own MCP API key
- Full access to the member's personal notes and documents via MCP tools
- Visible only to the member

### Shared Sessions
- Created by any member; participants selected from the full team roster
- Any participant can send messages; the agent responds to all
- Agent uses the **session owner's** MCP API key for any document operations (e.g. saving the conversation)
- Only the session owner can invite additional participants after creation
- If the session owner has no MCP key configured, document-saving features are silently disabled for that session
- Multiple shared sessions can exist simultaneously

---

## 4. Onboarding Flow

1. Admin invites a member by email (stored in DB)
2. Member logs in via Google OAuth
3. On first login, member is prompted to enter their mdcrypt API key and crypt ID (skippable)
4. Both are saved encrypted to the database; automatically used by the backend from that point on
5. Without an API key + crypt ID: full chat access, MCP features silently disabled
6. Member can add or update their MCP key at any time in Settings

---

## 5. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS |
| Backend | Next.js API Routes (serverless, Vercel) |
| Auth | NextAuth.js + Google OAuth |
| Database | Vercel Postgres |
| Real-time | Server-Sent Events (SSE) for AI streaming; Vercel KV (Redis pub/sub) for human messages in shared sessions |
| PWA | next-pwa; iOS home screen installable via manifest.json + service worker |
| LLM | Provider-agnostic abstraction layer (Anthropic, OpenAI, Google Gemini) |
| MCP Server | Custom REST/HTTP server, separately hosted (e.g. Railway, Fly.io, VPS) |

---

## 6. Hosting & Deployment

| Service | Host |
|---|---|
| Next.js app | Vercel |
| Vercel Postgres | Vercel (managed) |
| Vercel KV | Vercel (managed Redis) |
| Custom MCP Server | Separate host (Railway, Fly.io, or VPS) |

---

## 7. Environment Configuration (Admin-Managed)

```env
# LLM Provider (admin switches by changing these values)
ACTIVE_PROVIDER=anthropic          # anthropic | openai | google
ACTIVE_MODEL=claude-opus-4         # model string for the active provider

# Provider API Keys
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_API_KEY=...

# Auth
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Database
DATABASE_URL=...

# Real-time
KV_URL=...
```

Switching LLM provider requires only changing `ACTIVE_PROVIDER` and `ACTIVE_MODEL` — no code changes.

---

## 8. LLM Abstraction Layer (`/lib/llm.ts`)

A unified interface wrapping all three providers. All routes call this layer; it resolves the active provider at runtime from environment variables.

```
LLMProvider (interface)
  ├── stream(messages, tools?) → AsyncIterable<string>
  └── implementations:
        ├── AnthropicProvider   (claude-* models)
        ├── OpenAIProvider      (gpt-* models)
        └── GoogleProvider      (gemini-* models)
```

---

## 9. Database Schema (Vercel Postgres)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| google_id | text unique | |
| email | text unique | |
| name | text | |
| role | enum | `admin` \| `member` |
| mcp_api_key | text | Encrypted at rest; nullable; updatable by the user at any time |
| mcp_crypt_id | text | mdcrypt crypt ID; nullable; paired with mcp_api_key |
| invite_status | enum | `pending` \| `active` |
| created_at | timestamp | |

### `sessions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK → users | |
| title | text | |
| mode | enum | `private` \| `shared` |
| created_at | timestamp | |
| updated_at | timestamp | |

### `session_participants`
| Column | Type | Notes |
|---|---|---|
| session_id | uuid FK → sessions | |
| user_id | uuid FK → users | |
| joined_at | timestamp | |

### `messages`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK → sessions | |
| sender_id | uuid FK → users | Null for assistant messages |
| role | enum | `user` \| `assistant` |
| content | text | |
| created_at | timestamp | |

---

## 10. API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/chat` | Send a message; stream agent response via SSE |
| GET | `/api/sessions` | List all sessions the user owns or participates in |
| POST | `/api/sessions` | Create a new session (private or shared) |
| PATCH | `/api/sessions/[id]` | Rename a session |
| POST | `/api/sessions/[id]/invite` | Session owner invites a team member (shared only) |
| GET | `/api/admin/members` | Admin: list all team members |
| POST | `/api/admin/invite` | Admin: invite a new member by email |
| DELETE | `/api/admin/members/[id]` | Admin: remove a team member |

---

## 11. Chat API Logic (`POST /api/chat`)

```
1. Authenticate user (NextAuth session)
2. Load session record; verify user is owner or participant
3. Load full message history for the session from Postgres
4. Resolve mdcrypt credentials:
     Private session  → sender's API key + crypt ID
     Shared session   → session owner's API key + crypt ID
5. If credentials present → configure mdcrypt MCP tools for the agent
6. Call active LLM via abstraction layer with history + MCP tools
7. Stream response tokens via SSE to the client
8. On stream completion:
     a. Persist user message to Postgres
     b. Persist assistant message to Postgres
     c. Publish new-message event to Vercel KV (shared sessions only)
```

---

## 12. Real-Time Architecture

**AI response streaming:** SSE from `/api/chat` to the requesting client. The agent's streamed tokens are forwarded token-by-token.

**Human messages in shared sessions:** When a participant sends a message, all other participants receive it via Vercel KV pub/sub (one channel per session ID). Each client maintains a long-lived SSE connection to a `/api/sessions/[id]/events` route that listens on the KV channel and pushes new messages as they arrive.

---

## 13. MCP Server — mdcrypt (`https://mdcrypt.dev/mcp`)

**Transport:** REST/HTTP, MCP-compliant (already live)  
**Auth:** Per-user API key passed with every request; updatable by the user at any time in Settings  
**Crypt ID:** Each request must include the user's crypt ID — stored alongside the API key in Vercel Postgres  
**Future:** When mdcrypt supports crypt-scoped API keys, the schema will migrate from a single `(mcp_api_key, mcp_crypt_id)` pair on the `users` table to a separate `user_crypts` table (`user_id`, `crypt_id`, `api_key`, `label`) supporting multiple keys per user. The chat API layer will remain unchanged.  
**Concurrency:** All write operations that modify note content require the current version number — the agent must call `read_note` before any write to obtain it

### Tools (20 across 4 categories)

**Notes**
| Tool | Description |
|---|---|
| `list_notes` | Search/filter notes by folder, tag, or query |
| `read_note` | Full content + frontmatter by UUID |
| `create_note` | Create with optional template, tags, folder, diagram support |
| `replace_section` | Surgical section replacement by heading |
| `append_to_note` | Add content to the end of a note |
| `update_metadata` | Change title, tags, or status without touching body |
| `update_task` | Check/uncheck GFM task list items |
| `delete_note` | Soft delete (recoverable) |
| `restore_note` | Undo a soft delete |
| `move_note` | Move note to a different folder |
| `get_backlinks` | Find all notes linking to a given note via `[[wiki links]]` |

**Folders**
| Tool | Description |
|---|---|
| `list_folders` | List all folders in the crypt |
| `create_folder` | Create a new folder |
| `delete_folder` | Delete folder; notes move to root, not deleted |

**Crypts**
| Tool | Description |
|---|---|
| `list_crypts` | List available crypts for the authenticated user |

**Templates**
| Tool | Description |
|---|---|
| `list_templates` | List all templates |
| `create_template` | Create a new template |
| `read_template` | Fetch a template by ID |
| `update_template` | Update an existing template |
| `delete_template` | Delete a template |

### Agent Behavior Notes
- **Read-before-write:** The agent must call `read_note` before `replace_section`, `append_to_note`, `update_metadata`, or `update_task` to obtain the current version number
- **Shared sessions:** The agent operates against the session owner's crypt — all document saves go to their vault
- **Templates:** Can be used to save shared session conversations in a consistent format (e.g. a "meeting notes" template)

---

## 14. PWA (iOS)

- `manifest.json` with `display: standalone`, correct icon sizes, and `apple-mobile-web-app-capable` meta tags
- Service worker via `next-pwa` for offline shell caching
- Installable from Safari via "Add to Home Screen"
- Responsive layout optimized for mobile viewport

---

## 15. UI Design Spec

### General

| Concern | Decision |
|---|---|
| Color scheme | System auto light/dark (CSS `prefers-color-scheme`) |
| Visual style | Chat-app feel (WhatsApp / iMessage) |
| Typography & spacing | Mobile-first, thumb-friendly touch targets (min 44px) |
| PWA | Installable on iOS via Safari "Add to Home Screen"; standalone display mode; safe area insets respected |

---

### Navigation — Slide-in Drawer

Triggered by a hamburger/swipe gesture from the left edge. Overlays the chat view without pushing content.

```
┌─────────────────────┐
│ [Avatar] John Smith │  ← logged-in user
│ ─────────────────── │
│ PRIVATE             │  ← section header
│   • Session A       │
│   • Session B       │
│ ─────────────────── │
│ SHARED              │  ← section header
│   • Team Standup    │
│   • Q4 Planning     │
│ ─────────────────── │
│ ⚙ Settings          │
│ 🚪 Sign out         │
└─────────────────────┘
```

- Sessions sorted by most recent activity within each group
- Active session highlighted
- Tapping a session loads it, replaces the current view, and closes the drawer
- The drawer is the only way to switch between sessions — no swipe navigation between sessions
- No unread indicators — clean, distraction-free list
- Long-press on a session name to rename it (inline edit)
- Tap outside drawer or swipe left to dismiss

---

### Floating Action Button (FAB)

- Positioned bottom-right of the chat view
- Tapping opens a **modal sheet** (slides up from bottom)
- Modal contains:
  - Toggle: **Private** / **Shared**
  - If Shared: multi-select list of team members to invite
  - Confirm button to create session
- Sessions are auto-titled "New conversation" and renameable via long-press in the drawer

---

### Chat View

**Message bubbles:**
- User messages → right-aligned, accent color bubble
- AI messages → left-aligned, neutral bubble, rendered markdown
- Other participants (shared sessions) → left-aligned, distinct neutral bubble

**Per message in shared sessions:**
- Initials avatar circle to the left of every non-user bubble (color-coded per participant)
- Timestamp shown below each bubble (HH:MM format)
- In private sessions: no avatar, no name label — cleaner layout

**AI response rendering:**
- Tokens stream in real time as they arrive
- Full markdown rendering: bold, italic, headings, code blocks (syntax highlighted), lists, tables
- Each AI message has a **"Copy as Markdown"** button (appears on tap/hover)

**MCP tool call visibility:**
- Displayed as a subtle inline status pill between messages
- Example: `🔧 Saved note to mdcrypt · Standup Notes`
- Tappable to expand and show tool name + parameters used

**Input bar:**
- Sticky to bottom, respects iOS keyboard safe area
- Multiline text input, auto-grows up to 5 lines
- Send button activates when input is non-empty
- Disabled with subtle indicator while AI is responding

---

### Settings Screen

- Accessible from the drawer
- Sections:
  - **Profile** — name, email (read-only from Google)
  - **mdcrypt** — API key (masked, tap to reveal), crypt ID, Save button
  - **About** — app version

---

### Admin Panel

- Accessible from the drawer for admin role only
- Sections:
  - **Team members** — list with name, email, status (active / pending)
  - **Invite member** — email input + Send Invite button
  - **Remove member** — swipe-to-delete with confirmation

---

### Empty & Loading States

| State | Treatment |
|---|---|
| No sessions yet | Centered illustration + "Start a conversation" prompt |
| Session loading | Skeleton bubbles (shimmer) |
| AI thinking / streaming | Tokens appear progressively; no

```
Sidebar
  ├── Private Sessions (list)
  └── Shared Sessions (list)
  └── [+ New Session] button

Session View
  ├── Message thread (streamed, real-time)
  ├── Sender name + avatar per message (shared sessions)
  └── Message input

New Session Modal
  ├── Name the session
  ├── Mode: Private / Shared
  └── If Shared: multi-select team members to invite

Settings
  └── mdcrypt API key + crypt ID (view / update)

Admin Panel
  ├── Team member list (name, email, status)
  ├── Invite new member (by email)
  └── Remove member
```

---

## 16. Data Flow Diagram

```
Member (iPhone PWA)
  │
  ├─ POST /api/chat
  │     │
  │     ├─ Load session history (Vercel Postgres)
  │     │
  │     ├─ Resolve MCP key
  │     │     ├─ Private  → sender's key
  │     │     └─ Shared   → session owner's key
  │     │
  │     ├─ LLM Abstraction Layer
  │     │     └─ Active provider (Anthropic / OpenAI / Gemini)
  │     │           └─ MCP tools (if key + crypt ID present)
  │     │                 └─ mdcrypt (https://mdcrypt.dev/mcp)
  │     │                       └─ User's crypt (notes, folders, templates)
  │     │
  │     ├─ Stream response via SSE → client
  │     ├─ Persist messages → Vercel Postgres
  │     └─ Publish event → Vercel KV (shared sessions)
  │
  └─ GET /api/sessions/[id]/events (SSE)
        └─ Subscribe to Vercel KV channel
              └─ Push new human messages to all participants
```

---

## 17. Build Order

1. **NextAuth + Google OAuth + invite system + roles** — foundation for everything
2. **Postgres schema** — users, sessions, participants, messages
3. **LLM abstraction layer** — Anthropic, OpenAI, Gemini behind one interface
4. **Private chat** — streaming, MCP integration, message persistence
5. **Shared sessions** — participant management, session owner MCP routing
6. **Real-time** — SSE for AI streaming, Vercel KV pub/sub for human messages
7. **PWA frontend** — sidebar, session views, new session modal, settings, admin panel
8. **mdcrypt integration** — wire API key + crypt ID per user; test all 20 tools; implement read-before-write pattern for version concurrency
