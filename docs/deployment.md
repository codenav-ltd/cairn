# Cairn — Deployment

> Status: draft · Last updated: 2026-10-01

This document covers two things:

1. How **anyone** self-hosts Cairn (§1).
2. How **codenav** runs its own production and staging instances (§2 onwards).

Both use the same images and the same `compose.yml`. Every codenav deploy is
therefore also a test of the self-hosting path.

---

## 1. Self-hosting

```sh
curl -O https://raw.githubusercontent.com/codenav-ltd/cairn/main/docker/compose.yml
curl -O https://raw.githubusercontent.com/codenav-ltd/cairn/main/docker/.env.example
cp .env.example .env    # set CAIRN_PUBLIC_URL, CAIRN_SECRET and POSTGRES_PASSWORD
docker compose --profile caddy up -d
```

- Images: `ghcr.io/codenav-ltd/cairn-web`, `cairn-api`, `cairn-postgres`, built for
  `linux/amd64` and `linux/arm64`.
- `CAIRN_AUTO_MIGRATE=true` (the default) applies migrations on api start,
  serialised by a Postgres advisory lock.
- The `caddy` profile adds a reverse proxy with automatic HTTPS. Without it, put
  any reverse proxy in front of `web`.

### 1.1 One entry point

Only `web` is exposed. It forwards `/api/**`, `/mcp`, `/healthz`, feeds,
`llms*.txt` and `*.md` views to `api` over the compose network. A reverse proxy
therefore needs exactly one upstream, whether that's Caddy, nginx or a tunnel.

### 1.2 Services

| Service    | Image            | Notes                                           |
| ---------- | ---------------- | ----------------------------------------------- |
| `web`      | `cairn-web`      | Nuxt SSR on port 3000; the only published port  |
| `api`      | `cairn-api`      | `CAIRN_ROLES=api`                               |
| `worker`   | `cairn-api`      | `CAIRN_ROLES=worker`                            |
| `postgres` | `cairn-postgres` | Postgres 18 + pgvector + PGroonga; named volume |
| `caddy`    | `caddy:2`        | Profile `caddy` only                            |

Media is stored in a named volume unless `STORAGE_DRIVER=s3`.

`CAIRN_PUBLIC_URL` is the only URL an operator sets. `compose.yml` passes it to
`web` as `NUXT_PUBLIC_I18N_BASE_URL` too, because Nuxt's runtime config can only
be overridden through `NUXT_`-prefixed variables.

### 1.3 Configuration

Every variable is listed, with its default, in
[`docker/.env.example`](../docker/.env.example). Beyond the three required ones:

| Variable                            | Purpose                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `CAIRN_CLIENT_IP_HEADER`            | Header the reverse proxy puts the visitor's address in (see below)     |
| `CAIRN_MAIL_DRIVER`                 | `none`, `log`, `smtp` or `aliyun-dm`; owners can override it in Studio |
| `CAIRN_MAIL_FROM`, `_FROM_NAME`     | Sender; `_REPLY_TO` is optional                                        |
| `CAIRN_SMTP_URL`                    | `smtps://user:password@host:465`, or `smtp://` for STARTTLS on 587     |
| `CAIRN_ALIYUN_DM_*`                 | `REGION`, `ACCESS_KEY_ID`, `ACCESS_KEY_SECRET` for DirectMail          |
| `CAIRN_MAIL_ALLOWED_RECIPIENTS`     | Comma-separated addresses or `@domains`; everyone else is skipped      |
| `CAIRN_GITHUB_CLIENT_ID`, `_SECRET` | GitHub sign-in; callback `<CAIRN_PUBLIC_URL>/api/auth/callback/github` |

Rate limits and the audit log key on the visitor's address, which only the
reverse proxy knows. `web` reads it from `CAIRN_CLIENT_IP_HEADER` and passes it
to `api`, replacing anything the client sent. Name a header the proxy
**overwrites**: `x-forwarded-for` with the Caddy profile, `x-real-ip` behind
nginx with `proxy_set_header X-Real-IP $remote_addr`, `cf-connecting-ip` behind
Cloudflare. A header the proxy appends to can be forged. Left empty, every
visitor appears as the proxy's own address and shares one rate limit.

The first account is the owner, created from an invitation that only the CLI
can issue:

```sh
docker compose exec api node dist/main.mjs invite --role owner --email you@example.com
```

It prints a link that works once, for 24 hours. `reset-password --email …`
prints a password reset link the same way, for when mail isn't set up.

---

## 2. codenav environments

|                    | Production                          | Staging                             |
| ------------------ | ----------------------------------- | ----------------------------------- |
| Branch             | `main`                              | `dev`                               |
| Host               | `cairn.codenav.dev`                 | `cairn-staging.codenav.dev`         |
| Compose project    | `cairn`                             | `cairn-staging`                     |
| Instance directory | `~/docker/cairn`                    | `~/docker/cairn-staging`            |
| Published port     | `127.0.0.1:3890`                    | `127.0.0.1:3891`                    |
| Database           | own `postgres` container and volume | own `postgres` container and volume |
| `CAIRN_ENV`        | `production`                        | `staging`                           |
| Postgres image tag | `18`                                | `18-dev`                            |

Both run on the shared codenav server (Ubuntu 24.04, **arm64**) behind the
existing nginx + certbot + Cloudflare setup. Host names have three labels on
purpose: Cloudflare's universal certificate covers `*.codenav.dev` only.

### 2.1 Isolation

Staging shares the machine with production and nothing else:

- Separate compose projects, so containers, networks and volumes are separate.
- Each environment has its own Postgres container. There is no shared database
  server for a grant mistake to expose.
- Ports are bound to `127.0.0.1`. Docker-published ports bypass the host
  firewall, so nothing is published on `0.0.0.0`.
- Separate `CAIRN_SECRET`, AI provider keys and storage volumes.
- **Production data is never copied into staging.** Production holds private
  notes, so staging runs on seeded fixtures only.

### 2.2 What `CAIRN_ENV=staging` changes

Behaviour that differs is keyed on one variable, never on host names:

| Concern       | Staging behaviour                                                                  |
| ------------- | ---------------------------------------------------------------------------------- |
| Indexing      | `X-Robots-Tag: noindex, nofollow` on every response; `robots.txt` disallows all    |
| AI surfaces   | `llms.txt` and `llms-full.txt` return 404                                          |
| Outbound mail | Delivered only to `CAIRN_MAIL_ALLOWED_RECIPIENTS`, and to no one while it is empty |
| AI spend      | Hard monthly cap from `CAIRN_AI_BUDGET_USD`                                        |
| Federation    | Disabled (when it exists)                                                          |
| UI            | A persistent "Staging" marker in the header                                        |

All absolute URLs (auth callbacks, email links, feeds, OG tags) are built from
`CAIRN_PUBLIC_URL`. The frontend calls the api same-origin. No host name is
hardcoded anywhere, so a build can never authenticate against, or link into,
the wrong environment.

### 2.3 Instance directory

Created by hand once per environment. A deploy refreshes images and schema; it
never touches anything else in this directory.

```text
~/docker/cairn-staging/
  compose.yml   copied from the repo on every deploy
  .env          by hand, except the CAIRN_TAG line, which deploy rewrites
  .release      written by deploy: current and previous image tag
```

Everything that differs between instances is in `.env`, so no override file is
needed. Staging's, for example:

```env
COMPOSE_PROJECT_NAME=cairn-staging
CAIRN_PUBLIC_URL=https://cairn-staging.codenav.dev
CAIRN_ENV=staging
CAIRN_SECRET=<openssl rand -hex 32>
POSTGRES_PASSWORD=<openssl rand -hex 32>
CAIRN_HTTP_BIND=127.0.0.1:3891
CAIRN_POSTGRES_TAG=18-dev
CAIRN_AUTO_MIGRATE=false
CAIRN_CLIENT_IP_HEADER=cf-connecting-ip
CAIRN_MAIL_DRIVER=aliyun-dm
CAIRN_MAIL_FROM=sso@codenav.dev
CAIRN_ALIYUN_DM_ACCESS_KEY_ID=<shared with boxly>
CAIRN_ALIYUN_DM_ACCESS_KEY_SECRET=<shared with boxly>
CAIRN_MAIL_ALLOWED_RECIPIENTS=<the team's own addresses>
CAIRN_GITHUB_CLIENT_ID=<the staging OAuth app>
CAIRN_GITHUB_CLIENT_SECRET=<the staging OAuth app>
CAIRN_TAG=sha-<managed by deploy>
```

Production has no `CAIRN_MAIL_ALLOWED_RECIPIENTS` and its own GitHub OAuth app;
an OAuth app has exactly one callback URL.

`CAIRN_TAG` lives in `.env` so that a hand-run `docker compose up` during
recovery keeps the deployed version instead of falling back to `latest`.

### 2.4 nginx vhost

Created by hand, like the other codenav vhosts:

```nginx
server {
  listen 80;
  listen 443 ssl;
  server_name cairn-staging.codenav.dev;
  ssl_certificate     /etc/letsencrypt/live/cairn-staging.codenav.dev/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/cairn-staging.codenav.dev/privkey.pem;

  client_max_body_size 64m;              # voice captures

  location / {
    proxy_pass http://127.0.0.1:3891;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;                 # SSE
    proxy_read_timeout 1h;               # SSE
  }
}
```

---

## 3. CI/CD

### 3.1 Workflows

| File                  | Trigger                                   | Runs on                       | Does                                           |
| --------------------- | ----------------------------------------- | ----------------------------- | ---------------------------------------------- |
| `ci.yml`              | pull requests, pushes                     | GitHub-hosted                 | Lint, typecheck, unit and integration tests    |
| `images.yml`          | `workflow_call`, tags `v*`                | GitHub-hosted (amd64 + arm64) | Build and push api and web images to GHCR      |
| `postgres-image.yml`  | `docker/postgres/**` on `main`/`dev`      | GitHub-hosted (QEMU)          | Build and push `cairn-postgres`                |
| `deploy.yml`          | push to `main`, dispatch, `workflow_call` | GitHub-hosted                 | Images → migrate → up → health check → notify  |
| `deploy-staging.yml`  | push to `dev`, dispatch                   | —                             | Calls `deploy.yml` with `environment: staging` |
| `notify-telegram.yml` | `workflow_call`                           | GitHub-hosted                 | Sends the deploy result to Telegram            |

Staging runs the same steps as production. `deploy-staging.yml` only holds the
trigger and the one value that differs. A staging deploy is only a rehearsal
if it runs the script production will run.

`environment` is a required input of `deploy.yml` with no default, so a caller
that forgets it cannot deploy `dev` to production. Inside the job it is mapped
through a whitelist before it selects a directory or a database.

### 3.2 Why GitHub-hosted runners

The repository is public. A self-hosted runner that accepts jobs from a public
repository can be made to run code from a fork's pull request, on a persistent
machine. Cairn's workflows therefore use only GitHub-hosted runners:

- arm64 images build natively on `ubuntu-24.04-arm`, which is free for public
  repositories. No QEMU emulation.
- Deploy jobs only need SSH, so they run on any GitHub-hosted runner.
- Deploy workflows trigger on `push` and `workflow_dispatch` only, never on
  `pull_request`. Deploy secrets live in GitHub environments (`production`,
  `staging`) that only those workflows reference.

### 3.3 Images and tags

Every build pushes `sha-<full sha>`. Branch builds also move `main` or `dev`.
Release tags `vX.Y.Z` additionally push `X.Y.Z`, `X.Y` and `latest`, and those
are the tags self-hosters use.

Images carry the commit in `CAIRN_VERSION`, and `/healthz` reports it.

`cairn-postgres` is different: it holds the data, so it should only restart
when it really changed. It is built only when `docker/postgres/` changes and is
published under stable tags — `18` from `main`, `18-dev` from `dev`, plus an
immutable `18-sha-<sha>` for each build. A deploy pulls it like any other
image, but Postgres is only recreated when its tag has moved. Staging uses
`18-dev`, so an image change reaches staging first.

### 3.4 Deploy steps

```mermaid
flowchart LR
  i[images] --> u[upload compose.yml]
  u --> p[pull new tag]
  p --> m[migrate]
  m --> up[up -d --wait]
  up --> h[health check]
  h --> n[notify]
```

1. **images** — build and push `sha-<sha>`. Skipped when redeploying an
   existing tag (§3.6).
2. **upload** — copy `docker/compose.yml` into the instance directory.
3. **pull** — `CAIRN_TAG=sha-<sha> docker compose pull`. Running containers are
   untouched.
4. **migrate** — `docker compose run --rm api node dist/main.mjs migrate` with
   the new image.
   Production sets `CAIRN_AUTO_MIGRATE=false`, so this step is the only place
   migrations run. **If it fails, the deploy stops here and the old containers
   keep serving.**
5. **up** — write the new `CAIRN_TAG` into `.env`, then
   `docker compose up -d --wait` recreates the containers and waits for their
   health checks. Expect a few seconds of interruption; zero-downtime
   switching is future work.
6. **health check** — `GET https://<host>/healthz` from the runner, retried for
   up to 60 seconds, must report `<sha>` for both web and api. This proves the new code
   is serving through nginx and Cloudflare, not just that a container started.
7. **record** — write the new tag to `.release`, keeping the previous one.
8. **notify** — see §4.

### 3.5 Concurrency

- `deploy.yml` uses group `deploy-cairn-<environment>` with
  `cancel-in-progress: false`. Runs queue instead of being cancelled, because a
  cancelled run could stop between migrate and up.
- Production and staging have different groups, so they never wait on each
  other.
- `deploy-staging.yml` declares no concurrency. A caller holding the group its
  callee waits on would deadlock.

### 3.6 Rollback

`deploy.yml` accepts an optional `tag` input on `workflow_dispatch`. Dispatching
it with the previous tag from `.release` redeploys that image through the same
steps. Migrations must therefore stay backward compatible for one release:
add columns first, remove them in a later release.

---

## 4. Telegram notification

`notify-telegram.yml` is a reusable workflow called by `deploy.yml`:

- It runs after the health check, with `if: always() && !cancelled()`, so a
  failed migration or health check is reported too.
- A green message means **the new version answered `/healthz` through the
  public host**.
- Delivery errors are swallowed; a notification can never turn a finished
  deploy red.
- If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is missing, the job exits 0.

Inputs: `ok` (boolean), `environment` (`staging` | `production`), `version`,
`failed_step` (empty on success), `running` (the tag serving before the deploy)
and `url`.

Message:

```text
✅ Cairn staging 已部署
codenav-ltd/cairn @ dev · a1b2c3d by xiaodong
<commit subject>
https://cairn-staging.codenav.dev
https://github.com/codenav-ltd/cairn/actions/runs/123
```

```text
❌ Cairn production 部署失败：migrate
codenav-ltd/cairn @ main · a1b2c3d by xiaodong
线上仍在运行 9f8e7d6
https://github.com/codenav-ltd/cairn/actions/runs/123
```

The failure message names the step that failed and says what is serving now,
so the message alone answers "is the site down?":

| Failed step                                                        | Second-to-last line                          |
| ------------------------------------------------------------------ | -------------------------------------------- |
| `images`, `resolve`, `ssh`, `running`, `upload`, `pull`, `migrate` | 线上仍在运行 `<previous>`                    |
| `up`, `health`                                                     | 容器已开始切换，线上状态未确认，请检查服务器 |
| `record`                                                           | 新版本已在线上服务，但 .release 未能更新     |

---

## 5. Secrets

| Secret                                            | Scope                                |
| ------------------------------------------------- | ------------------------------------ |
| `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`, `SSH_PORT` | environments `production`, `staging` |
| `SSH_KNOWN_HOSTS`                                 | environments `production`, `staging` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`          | repository                           |

`SSH_KNOWN_HOSTS` pins the server's host key (`ssh-keyscan` output, verified
once by hand). Runners are fresh machines, so trusting whatever key they see
first would make every deploy open to interception.

Image pushes use the workflow's `GITHUB_TOKEN`. The three GHCR packages are set
to public once, after their first push, so the server and self-hosters pull
without credentials.

Application secrets (`CAIRN_SECRET`, database password, AI keys) live only in
each instance's `.env` on the server.

**The repository must never contain credentials, including in `.cursor/`.**
Agent rules that need server access belong in personal or local rules, not in
this public repository.

---

## 6. Backups

- Production: `docker/backup.sh`, copied into the instance directory, runs from
  the `cairn-backup.timer` systemd timer daily at 19:30 UTC (03:30 in UTC+8);
  the host has no cron, and its other scheduled jobs are systemd timers too. It
  writes a `pg_dump` custom-format dump to `~/backups/cairn/` and keeps 14 days;
  `journalctl -u cairn-backup` shows each run. The media volume joins the
  backup once uploads exist. Off-site copies are future work.
- Staging: no backups. It can be reset from fixtures at any time.

---

## 7. One-time server setup

These steps change the shared server. Each one is done by hand, with explicit
approval, before the first deploy:

1. Install the Docker Compose v2 plugin. The host has Docker 29 from Ubuntu's
   `docker.io` package, but no `docker compose`.
2. Create `~/docker/cairn` and `~/docker/cairn-staging` with their `.env`.
3. Add the DNS records in Cloudflare.
4. Add the two nginx vhosts and run certbot for both host names.
5. Create the `production` and `staging` GitHub environments with the SSH
   secrets, and add the Telegram secrets to the repository.
6. Run `postgres-image.yml` once on `main` and once on `dev`, then make the
   `cairn-api`, `cairn-web` and `cairn-postgres` packages public.
7. Install the backup timer for production:

   ```ini
   # /etc/systemd/system/cairn-backup.service
   [Unit]
   Description=Back up the Cairn production database
   Requires=docker.service
   After=docker.service

   [Service]
   Type=oneshot
   User=ubuntu
   ExecStart=/home/ubuntu/docker/cairn/backup.sh

   # /etc/systemd/system/cairn-backup.timer
   [Unit]
   Description=Nightly Cairn production backup

   [Timer]
   OnCalendar=*-*-* 19:30:00 UTC
   Persistent=true

   [Install]
   WantedBy=timers.target
   ```

   then `sudo systemctl enable --now cairn-backup.timer`.
