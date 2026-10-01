# Cairn

A self-hostable knowledge garden with a community attached. One owner writes and
curates; members discuss. Ideas can start as a spoken thought, get structured
into a draft, and mature over many revisions — with every step of that history
kept visible.

> Cairn is in early development. Nothing here is ready to deploy yet.

## Documentation

- [Architecture](docs/architecture.md) — product model, system design, data model
- [Design system](docs/design.md) — visual direction, tokens, motion, writing
- [Deployment](docs/deployment.md) — self-hosting, environments, CI/CD

## Development

Requirements: Node 22.12 or newer (24 recommended), pnpm 10, Docker.

```sh
pnpm install
cp .env.example .env
pnpm db:up          # Postgres 18 with pgvector and PGroonga on localhost:54329
pnpm dev            # web on http://localhost:3000, api on http://localhost:4000
```

The api applies migrations on start. Check that everything is wired up:

```sh
curl http://localhost:3000/healthz
```

### Layout

```text
apps/web            Nuxt 4 — public site and studio
apps/api            Hono — REST, MCP, feeds; also runs the worker
packages/db         Drizzle schema and migrations
packages/contracts  Zod schemas shared by web and api
packages/ui         Design tokens
docker/             Postgres image and compose files
```

### Scripts

| Command            | Does                                     |
| ------------------ | ---------------------------------------- |
| `pnpm dev`         | Run web and api in watch mode            |
| `pnpm build`       | Build all apps                           |
| `pnpm typecheck`   | Type-check every package                 |
| `pnpm lint`        | ESLint                                   |
| `pnpm test`        | Unit tests                               |
| `pnpm format`      | Prettier                                 |
| `pnpm db:up`       | Start the development database           |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate`  | Apply migrations                         |

## License

[AGPL-3.0](LICENSE)
