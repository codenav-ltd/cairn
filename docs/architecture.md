# Cairn — Architecture

> Status: draft · Last updated: 2026-10-01

Cairn is an open-source, self-hostable knowledge garden with a community attached.
One owner writes and curates knowledge; members discuss it. Ideas can start as a
spoken thought, get structured by AI into a draft, and mature over many revisions
into evergreen articles — and every step of that history stays visible.

The name comes from the stone piles that mark mountain trails: built one stone at a
time, added to by those who pass, and left as guidance for whoever comes next.

---

## 1. Product model

### 1.1 Instance model

Every deployment is one **site** with one **owner**. The owner writes knowledge;
visitors can register and take part in discussion. Federation between sites
(ActivityPub) is a later phase and must not be blocked by v1 design choices.

| Role        | Can                                                                 |
|-------------|---------------------------------------------------------------------|
| `owner`     | Everything, including site settings and AI providers               |
| `editor`    | Write and publish articles and notes (optional co-authors)          |
| `moderator` | Hide content, handle reports, manage members                        |
| `member`    | Comment, start threads, react, bookmark                             |
| `visitor`   | Read whatever is visible to the public (not a stored role)          |

### 1.2 Content types

All three are rows in one `documents` table, distinguished by `type`.

- **Article** — long-form, curated, revisioned. The core of the knowledge base.
- **Note** — short, atomic, often private. The place for half-formed ideas.
- **Thread** — a discussion. Either standalone or attached to a document.

A comment or a thread reply that turns out to be valuable can be **promoted** into a
note or article, keeping a link to its origin. This is the bridge between forum
and knowledge base.

### 1.3 Visibility

Set per document:

| Value      | Who can see it                                 | Listed / indexed / fed to AI surfaces |
|------------|------------------------------------------------|---------------------------------------|
| `private`  | Owner (and editors, if shared)                 | Never                                 |
| `unlisted` | Anyone with the link                           | No                                    |
| `members`  | Signed-in members                              | Only for signed-in members            |
| `public`   | Everyone                                       | Yes                                   |

### 1.4 Maturity

Every article and note carries a maturity stage, so unfinished thinking has an
honest home:

`seed` → `growing` → `evergreen`

### 1.5 AI principles

1. **AI never publishes.** Voice captures, AI restructuring, translations and MCP
   writes all land as drafts or unreviewed revisions. A human publishes.
2. **Provenance is recorded.** Every revision stores its source (`manual`,
   `capture`, `ai`, `translation`, `import`) and whether a human reviewed it.
3. **Providers are swappable.** Cloud and local models are both first-class.
   Private content must be processable without leaving the owner's machine.

### 1.6 Internationalisation

English is the default locale; Simplified Chinese ships alongside it. See §11.

### 1.7 Non-goals for v1

- Real-time collaborative editing
- Federation
- Plugin system
- Native mobile apps (the PWA covers capture on mobile)
- Multi-tenant hosting of many sites in one deployment

---

## 2. System overview

```mermaid
flowchart TB
  subgraph clients [Clients]
    R[Reader browser]
    O[Owner studio]
    AI[AI tools via MCP]
  end
  subgraph app [Cairn]
    W[web · Nuxt 4<br/>rendering + page cache]
    A[api · Hono<br/>REST · SSE · MCP · feeds]
    K[worker<br/>transcribe · structure · embed · translate]
  end
  P[(PostgreSQL 18<br/>pgvector · PGroonga · pg-boss)]
  S[(Object storage<br/>local disk or S3)]
  M[AI providers<br/>OpenAI-compatible · Ollama · Whisper]

  R --> W --> A
  O --> A
  AI --> A
  A --> P
  P --> K
  K --> S
  K --> M
  K -. NOTIFY .-> A
```

### 2.1 Processes

- **web** — Nuxt 4. Renders public pages with SSR and caches them; serves the
  owner studio (`/studio/**`) as a client-only SPA. Holds no business logic: it
  talks to the api like any other client.
- **api** — Hono on Node. The single source of truth for reads and writes. Also
  serves MCP, feeds, `llms.txt` and Markdown views.
- **worker** — same codebase as api, started with a different role. Consumes
  jobs from pg-boss.

`api` and `worker` are one build, selected by `CAIRN_ROLES=api,worker`. A small
deployment runs both roles in one process; a larger one splits them.

### 2.2 Why a modular monolith

Microservices would multiply deployment burden for self-hosters with no benefit
at this scale. Module boundaries inside one service give us the same
separation, and modules can be extracted later if ever needed.

---

## 3. Technology choices

| Concern            | Choice                                   | Why                                                                                     |
|--------------------|------------------------------------------|-----------------------------------------------------------------------------------------|
| Language           | TypeScript everywhere                    | One type system from DB schema to UI                                                    |
| Runtime            | Node ≥ 22 (24 LTS recommended)           | Owner's preference; mature ecosystem                                                    |
| Monorepo           | pnpm workspaces + Turborepo              | Fast installs, cached builds                                                            |
| Frontend           | Nuxt 4 (Vue 3)                           | Per-route hybrid rendering; owner knows Vue                                             |
| UI primitives      | Reka UI + Tailwind CSS v4                | Headless, accessible; our own visual system on top                                      |
| Client data        | Pinia Colada                             | Query cache with optimistic mutations                                                   |
| Motion             | CSS transitions, View Transitions API, Motion for Vue | See `design.md`                                                             |
| Editor             | Milkdown (ProseMirror)                   | Markdown-native                                                                         |
| API framework      | Hono + `@hono/zod-openapi`               | Web-standard, fast, generates OpenAPI; typed RPC client for the frontend                |
| Validation         | Zod                                      | Shared contracts between api and web                                                    |
| ORM / migrations   | Drizzle                                  | Close to SQL, supports pgvector, lightweight                                            |
| Database           | PostgreSQL 18                            | JSONB, RLS, native `uuidv7()`, and the extensions below                                 |
| Vector search      | pgvector                                 | No extra service                                                                        |
| Full-text search   | PGroonga                                 | Works for English and CJK without per-language tokenizer setup                          |
| Job queue          | pg-boss                                  | Queue in Postgres; retries, schedules, no Redis required                                |
| Auth               | Better Auth                              | Passkeys, OAuth, email; Drizzle adapter                                                 |
| AI                 | Vercel AI SDK                            | One interface for chat, structured output, embeddings and transcription across providers |
| MCP                | `@modelcontextprotocol/sdk`              | Streamable HTTP transport                                                               |
| Markdown           | unified / remark / rehype + Shiki        | Extensible pipeline; same renderer on server for HTML and feeds                         |
| i18n               | `@nuxtjs/i18n`                           | Routing, `hreflang`, lazy message loading                                               |
| Fonts              | `@nuxt/fonts` + `cn-font-split` for CJK  | Self-hosted, metric-matched fallbacks, sliced CJK                                       |
| Reverse proxy      | Caddy                                    | Automatic HTTPS                                                                         |
| Testing            | Vitest, Playwright                       | Unit/integration and end-to-end                                                         |
| Lint / format      | ESLint (flat config) + Prettier          |                                                                                         |

Optional components, off by default:

- **Valkey / Redis** — shared page cache, rate limiting and pub/sub when running
  multiple web or api replicas.
- **Meilisearch** — if PGroonga relevance turns out to be insufficient.

### 3.1 Why PostgreSQL over MariaDB

One database covers relational data, full-text search, vector search and the job
queue. Every component we don't add is one less reason for a self-hoster to give
up. MariaDB's vector support and JSON handling are behind, and it has no
equivalent to pg-boss or row-level security.

---

## 4. Repository layout

```text
apps/
  web/                    Nuxt 4: public site + /studio
  api/                    Hono server; also the worker entrypoint
    src/
      main.ts             reads CAIRN_ROLES, boots api and/or worker
      modules/
        identity/         users, roles, sessions, access tokens
        content/          documents, revisions, links, tags, maturity
        discussion/       comments, annotations, reactions, promotion
        capture/          voice capture pipeline
        translation/      translation policy and jobs
        search/           full-text + semantic hybrid search
        ai/               provider registry, prompt loading
        feed/             RSS/Atom/JSON Feed, sitemap, llms.txt, .md views
        mcp/              MCP server
        moderation/       reports, hiding, spam checks
        media/            uploads and storage drivers
        settings/         site settings
packages/
  db/                     Drizzle schema, migrations, seed
  contracts/              Zod schemas and shared types
  policy/                 visibility and permission rules
  markdown/               remark/rehype plugins and renderer
  ui/                     design tokens and base components
prompts/                  versioned prompt files (owner can override in settings)
docker/                   Postgres image, Caddyfile, compose files
docs/
```

### 4.1 Module conventions

Each api module has the same shape:

```text
modules/content/
  routes.ts      HTTP: parse input with contracts, check permission, call service
  service.ts     business rules; no HTTP, no SQL
  repo.ts        all SQL for this module
  jobs.ts        pg-boss handlers, if any
  events.ts      domain events emitted by this module
  index.ts       module registration
```

Rules:

- Modules talk to each other through services and events, never through each
  other's repos.
- Every read of `documents` goes through `packages/policy` (see §6).
- Routes are declared with `zod-openapi`, so the OpenAPI document and the typed
  client (`hc<AppType>`) are always in sync with the code.

---

## 5. Data model

Better Auth owns `user`, `session`, `account`, `verification` and `passkey`;
`user` is extended with `role`, `locale` and `display_name`.

Primary keys are UUIDv7 (`uuidv7()`), so they are time-ordered and index-friendly.
Timestamps are `timestamptz`.

### 5.1 Core tables

**documents**

| Column                 | Notes                                                  |
|------------------------|--------------------------------------------------------|
| `id`                   |                                                        |
| `type`                 | `article` · `note` · `thread`                          |
| `slug`                 | unique per `locale`                                    |
| `locale`               | `en`, `zh-CN`, …                                       |
| `translation_group_id` | shared by all language versions of the same document   |
| `title`, `summary`     |                                                        |
| `body_md`              | canonical content                                      |
| `body_html`            | rendered cache, regenerated on change                  |
| `visibility`           | `private` · `unlisted` · `members` · `public`          |
| `status`               | `draft` · `published` · `archived`                     |
| `maturity`             | `seed` · `growing` · `evergreen` (null for threads)    |
| `parent_id`            | thread attached to a document                          |
| `promoted_from`        | comment or thread this was promoted from               |
| `translation_policy`   | per-document override, null = site default             |
| `author_id`            |                                                        |
| `current_revision_id`  |                                                        |
| `published_at`, `created_at`, `updated_at`, `deleted_at` |                      |

**revisions** — full snapshots, not diffs; diffs are computed on read.
`id, document_id, number, title, body_md, source, author_id, job_id, reviewed_at, created_at`
with `source ∈ manual · capture · ai · translation · import`.

**links** — parsed from `[[wikilinks]]` on every save.
`from_document_id, to_document_id (nullable), to_target (unresolved text), kind`.
Unresolved links become resolved when a matching document is created.

**tags** / **document_tags**

**comments**
`id, document_id, parent_id, author_id, body_md, anchor (jsonb, nullable), status, created_at, edited_at`.
`anchor` is a W3C Web Annotation text-quote selector:
`{ exact, prefix, suffix, revision_id }`.

**reactions** — `(user_id, target_type, target_id, kind)` primary key.

**captures**
`id, owner_id, media_id, language, transcript, segments (jsonb), status, error, result (jsonb), draft_document_id, created_at`
with `status ∈ uploaded · transcribing · structuring · ready · failed`.

**media** — `id, owner_id, storage_key, mime, bytes, sha256, width, height, duration_ms, created_at`.

**chunks** — `id, document_id, revision_id, ord, content, embedding vector(N), model`.
One embedding model is active per site; changing it schedules a full re-embed.

**ai_providers** — `id, kind, base_url, api_key (encrypted), models (jsonb), defaults (jsonb)`.
`defaults` maps roles (`transcribe`, `structure`, `embed`, `translate`, `answer`) to models.

**access_tokens** — `id, user_id, name, token_hash, scopes text[], last_used_at, expires_at`.

**site_settings** — key/value `jsonb`.

**notifications**, **reports**, **audit_log**.

### 5.2 Indexes worth stating up front

- PGroonga index on `documents (title, body_md)`.
- HNSW index on `chunks.embedding`.
- `documents (status, visibility, published_at desc)` for feeds and listings.
- `links (to_document_id)` for backlinks.

---

## 6. Visibility and permissions

Leaking a private note is the worst failure this system can have, and there are
many exits: pages, listings, search, semantic search, RSS, `llms.txt`, `.md`
views, MCP, backlinks, OG images, sitemap, notifications.

Therefore:

1. `packages/policy` exports `visibleTo(viewer)` (a Drizzle `where` fragment) and
   `can(viewer, action, resource)`. **No query reads `documents` without it.**
2. Embedding chunks inherit visibility at query time by joining to `documents`;
   they are never searched on their own.
3. Postgres row-level security is enabled on `documents`, `revisions`, `chunks`
   and `comments` as a second line of defence. The api sets the viewer context
   per transaction.
4. A dedicated test suite creates one document per visibility level and asserts,
   for **every exit listed above**, that each viewer type sees exactly what it
   should.

---

## 7. Content pipeline

- **Canonical format:** Markdown (CommonMark + GFM) with Cairn extensions:
  `[[wikilinks]]`, `[[target|label]]`, `![[embeds]]` and callouts.
  This keeps content portable, diffable, Obsidian-compatible and AI-readable.
- **On save:** parse → extract links and headings → render HTML with Shiki →
  store revision → update `body_html` → emit `content.changed`.
- **On change:** re-chunk and re-embed (job), purge affected page caches (§10),
  re-anchor annotations.
- **Annotation re-anchoring:** find `exact` with `prefix`/`suffix` in the new
  text; fall back to fuzzy matching; if nothing matches, mark the annotation as
  orphaned and show it under "From an earlier version".
- **Import / export:** Markdown zip and Obsidian vault, both directions.

---

## 8. Search

- **Keyword:** PGroonga over title and body.
- **Semantic:** pgvector over `chunks`.
- **Hybrid:** run both, merge with Reciprocal Rank Fusion, filter through policy.
- **Ask:** "Ask this site" retrieves top chunks and answers with citations to
  the source documents. Only uses content visible to the asker.

---

## 9. Voice capture pipeline

```mermaid
flowchart LR
  rec[Record in browser<br/>MediaRecorder · opus] --> up[Upload]
  up --> t[transcribe job]
  t --> s[structure job]
  s --> d[Draft created]
  d --> rev[Owner reviews and publishes]
```

1. **Record** — `MediaRecorder` (opus/webm). Upload returns immediately with a
   capture id; progress is pushed over SSE.
2. **Transcribe** — Whisper via cloud API, a local faster-whisper/whisper.cpp
   server, or in-browser via WebGPU for maximum privacy. Language is detected.
3. **Structure** — an LLM receives:
   - the prompt from `prompts/structure.md`,
   - three owner-selected style samples,
   - related documents found by semantic search.

   It returns JSON validated by Zod:
   `{ intent: new_article | new_note | append, target_id?, locale, title, tags, body_md, suggested_links[] }`.
4. **Draft** — a draft document (or an unreviewed revision of the target) is
   created with `source = capture`. The original audio and transcript stay
   attached as provenance.

Nothing in this pipeline publishes.

---

## 10. Rendering and caching

```ts
// apps/web/nuxt.config.ts (sketch)
routeRules: {
  '/':           { swr: 60 },
  '/p/**':       { swr: 3600 },
  '/zh/**':      { swr: 3600 },
  '/studio/**':  { ssr: false },
}
```

- **Public HTML is identical for every viewer.** Personal state (signed-in user,
  "I reacted", draft indicators) is fetched client-side after hydration. This is
  what makes pages cacheable.
- Pages that depend on the viewer (`members`, `unlisted`) are rendered with
  `Cache-Control: private, no-store`.
- **Purge:** on `content.changed` the api calls `POST /_cairn/purge` on web
  (shared secret) with the affected routes: the document, its translations,
  pages that link to it, home, tag pages and feeds.
- Cache storage uses Nitro storage: filesystem by default, Valkey when
  configured.

---

## 11. Internationalisation

**Interface**

- `@nuxtjs/i18n`, strategy `prefix_except_default`: English at `/`, Chinese at
  `/zh/`.
- `hreflang` alternates on every page; `Intl` for dates and numbers.
- Message files live in `apps/web/i18n/locales/{en,zh-CN}.json`; keys follow the
  glossary in `design.md`.

**Content**

- Each language version is its own document sharing a `translation_group_id`.
- The language switcher goes to the matching translation when one exists;
  otherwise it shows the original with a notice.
- **Translation policy** is a site setting with a per-document override:

  | Policy       | Behaviour                                                  |
  |--------------|------------------------------------------------------------|
  | `on_publish` | Publishing schedules a translation draft for each locale   |
  | `manual`     | Translation runs only when the author clicks "Translate"   |
  | `off`        | No translation                                             |

- **Reader machine translation** is a separate opt-in setting, off by default.
  When on, readers can request a translation of a document with no reviewed
  translation. The result is cached, marked as unreviewed in the UI, and never
  indexed.

**Feeds and AI surfaces** are emitted per locale.

---

## 12. AI-facing surfaces

| Surface             | Path                     | Notes                                                    |
|---------------------|--------------------------|----------------------------------------------------------|
| MCP server          | `/mcp`                   | Streamable HTTP; token auth                              |
| `llms.txt`          | `/llms.txt`, `/zh/llms.txt` | Index of public content                              |
| `llms-full.txt`     | `/llms-full.txt`         | Concatenated public Markdown                             |
| Markdown view       | any page + `.md`         | Raw Markdown of a visible document                       |
| Feeds               | `/feed.xml`, `/feed.json`| RSS/Atom and JSON Feed                                   |
| OpenAPI             | `/api/openapi.json`      | Generated from routes                                    |

**MCP tools (v1)**

| Tool             | Scope          |
|------------------|----------------|
| `search`         | `read`         |
| `get_document`   | `read`         |
| `list_recent`    | `read`         |
| `get_backlinks`  | `read`         |
| `create_draft`   | `write:drafts` |
| `append_to_note` | `write:drafts` |

Tokens are scoped; there is no `publish` tool in v1. OAuth 2.1 for remote MCP
clients comes later.

---

## 13. AI provider layer

- Providers are rows in `ai_providers`, configured in the studio. API keys are
  encrypted at rest with a key derived from `CAIRN_SECRET`.
- Built-in kinds: OpenAI-compatible (covers OpenAI, DeepSeek, vLLM, LM Studio and
  many others), Anthropic, Ollama, and a Whisper-compatible transcription endpoint.
- Each AI role (`transcribe`, `structure`, `embed`, `translate`, `answer`) is
  mapped to a provider and model independently. For example, a site can
  transcribe locally while structuring in the cloud.
- **Prompts** live in `prompts/*.md` with front-matter (`version`, `role`,
  `inputs`). The owner can override any prompt in settings; overrides are
  versioned.
- Every AI job records provider, model, prompt version, token usage and
  duration.

---

## 14. Real-time

- SSE from the api for capture progress, AI streaming output and notifications.
- Workers publish with `NOTIFY cairn_events, '<json>'`; the api `LISTEN`s and fans
  out to connected SSE clients.
- WebSockets are not used until collaborative editing exists.

---

## 15. Security

- **Sessions:** Better Auth cookie sessions (`HttpOnly`, `Secure`, `SameSite=Lax`).
  Passkeys are recommended for the owner.
- **Tokens:** personal access tokens for API and MCP, stored hashed, scoped, and
  optionally expiring.
- **CSRF:** origin checks on state-changing requests from cookie sessions.
- **Rate limiting:** per IP and per user on auth, comments, uploads and AI
  endpoints; in-memory by default, Valkey when configured.
- **Uploads:** size and MIME allow-lists; images are re-encoded; audio is
  transcoded by the worker before storage.
- **Rendering:** sanitized HTML output from the Markdown pipeline
  (`rehype-sanitize` with an explicit schema).
- **Moderation:** reports, hide/restore, new-member comment hold, and a
  pluggable spam check.
- **Audit log:** role changes, visibility changes, provider changes, token
  creation and deletion.

---

## 16. Deployment

See [`deployment.md`](deployment.md) for self-hosting, codenav's production and
staging environments, CI/CD and deploy notifications.

`docker compose up` brings up `web`, `api`, `worker` and `postgres`, plus `caddy`
with the `caddy` profile. Only `web` is published; it forwards api paths over
the compose network.

Minimal configuration:

```env
CAIRN_PUBLIC_URL=https://example.com
CAIRN_SECRET=change-me
CAIRN_ENV=production          # or staging
DATABASE_URL=postgres://cairn:cairn@postgres:5432/cairn
STORAGE_DRIVER=local          # or s3
CAIRN_AUTO_MIGRATE=true       # codenav's own deploys set false and migrate as a separate step
```

`CAIRN_PUBLIC_URL` is the only source of absolute URLs. Behaviour that differs
between environments is keyed on `CAIRN_ENV`, never on host names.

---

## 17. Performance budgets

| Metric                                | Budget        |
|---------------------------------------|---------------|
| LCP, article page, cached             | < 1.5 s on 4G |
| INP                                   | < 100 ms      |
| CLS                                   | < 0.05        |
| JS shipped on an article page (gzip)  | < 90 KB       |
| API p95, cached-path reads            | < 50 ms       |
| Time to first visible feedback on any action | < 100 ms |

Budgets are checked in CI with Lighthouse on a seeded instance.

---

## 18. Testing

- **Unit (Vitest):** policy rules, Markdown plugins, anchor re-matching, prompt
  output parsing.
- **Integration:** against a real Postgres with extensions, started by compose.
- **Visibility leak suite:** see §6.
- **End-to-end (Playwright):** write → publish → read → search → capture.
- **AI:** provider calls are stubbed in tests; a separate opt-in suite runs
  against real providers.

---

## 19. Roadmap

**Phase 1 — a complete loop, done well**

- Auth and roles; site settings
- Articles, notes, threads; revisions; visibility; maturity
- Markdown editor with wikilinks, backlinks and tags
- Comments and standalone threads
- Keyword search
- Voice capture to draft
- i18n interface; translation policy; translation drafts
- RSS, `llms.txt`, `.md` views, OpenAPI
- MCP server (read + drafts)
- Markdown and Obsidian import/export
- Docker Compose deployment

**Phase 2**

- Semantic and hybrid search; "Ask this site"
- Revision trail scrubbing with diffs
- Paragraph annotations
- Knowledge graph view
- Notifications; moderation tools; promotion of comments to notes
- Reader machine translation

**Phase 3**

- ActivityPub federation
- Collaborative editing (Yjs)
- Plugins
- Offline-capable capture PWA

---

## 20. Open questions

- Which embedding model to ship as the default for local-only deployments.
- Whether `members`-only documents should be visible to AI tools using a
  member's token.
- Whether in-browser Whisper is good enough on mid-range hardware to be the
  default for private captures.
- Hosting compliance for deployments that enable public registration in
  jurisdictions that require content review.
