# Cairn — Identity, invitations, mail and site settings

Covers the `identity`, `mail` and `settings` api modules, their data, their
pages, and how a new instance gets its owner. Builds on
[architecture.md](./architecture.md) §1.1 (roles), §5 (data model) and §15
(security).

---

## 1. Roles

One role per user, stored on `user.role`. `visitor` is the absence of a session.

| Action                                      | owner | editor | moderator | member |
| ------------------------------------------- | :---: | :----: | :-------: | :----: |
| Site settings, mail settings, AI providers  |   ✓   |        |           |        |
| Change anyone's role                        |   ✓   |        |           |        |
| Invite editors and moderators               |   ✓   |        |           |        |
| Invite members, approve and suspend members |   ✓   |        |     ✓     |        |
| Write and publish articles and notes        |   ✓   |   ✓    |           |        |
| Hide content, handle reports                |   ✓   |        |     ✓     |        |
| Comment, start threads, react, bookmark     |   ✓   |   ✓    |     ✓     |   ✓    |

- Exactly one owner. A partial unique index (`role = 'owner'`) enforces it;
  handing over ownership is a single transaction that demotes the old owner to
  `editor`.
- A moderator can act only on `member` accounts, never on staff.
- Every role and status change is written to `audit_log`.

`packages/policy` exports `can(viewer, action, target?)` over this table, next to
`visibleTo(viewer)`. Routes call `can`; nothing checks `user.role` directly.

### 1.1 Account status

`user.status` is `active`, `pending` or `suspended`. A pending or suspended user
can sign in, sees why they cannot do more, and is treated as a visitor by
`can` and `visibleTo`. Suspending revokes all of the user's sessions and access
tokens.

---

## 2. Sign-in methods

Built on Better Auth (`better-auth` with `@better-auth/passkey` and the Drizzle
adapter), mounted at `/api/auth/*` in the api. The web app already proxies
`/api/`, so cookies are first-party on the site's own origin.

| Method          | Available when                     | Notes                                                         |
| --------------- | ---------------------------------- | ------------------------------------------------------------- |
| Email, password | always (owner can disable)         | 10–128 characters; no composition rules                       |
| Magic link      | mail is configured                 | 15-minute single-use link                                     |
| Passkey         | always, once added to an account   | Added from the account page; the owner is prompted to add one |
| GitHub          | `CAIRN_GITHUB_CLIENT_ID`/`_SECRET` | Callback `<CAIRN_PUBLIC_URL>/api/auth/callback/github`        |

- **Email verification.** An address is verified if the invite was sent to it,
  if it arrived through a magic link, or if GitHub reports it verified.
  Otherwise the user must confirm it by mail before their status becomes
  `active`. Without mail configured, only invites bound to an email address or
  GitHub sign-up can create accounts.
- **Account linking** is explicit: a signed-in user links GitHub or adds a
  passkey from the account page. Signing in with GitHub never attaches itself to
  an existing account by matching email.
- **Passkey relying party** is the host of `CAIRN_PUBLIC_URL`, so staging and
  production passkeys are separate.
- **Password reset** goes by mail; without mail the owner resets from the CLI
  (§4.2).

---

## 3. Registration policy

Site setting `registration.mode`:

| Mode       | Who can create an account               | New account status |
| ---------- | --------------------------------------- | ------------------ |
| `invite`   | Holders of a valid invitation (default) | `active`           |
| `approval` | Anyone; an owner or moderator approves  | `pending`          |
| `open`     | Anyone                                  | `active`           |

Every sign-in method creates users through one Better Auth
`databaseHooks.user.create.before` hook, and that hook is the only place the
policy is enforced. Under `invite`, it requires the invitation carried in the
signed `cairn_invite` cookie (set when the invite page is opened), checks that
the email matches if the invitation is bound to one, and claims it with
`update … where accepted_at is null returning`, so a token cannot be used twice
even under concurrent requests. The invitation's role is applied to the new
user. An invitation always works regardless of mode, which is how staff are
added to an `open` site.

---

## 4. Invitations

**invitations** — `id, token_hash, role, email (nullable), invited_by (nullable), expires_at, accepted_at, accepted_by, revoked_at, created_at`.

- Token: 32 random bytes, base64url; only its SHA-256 is stored. The link is
  `<CAIRN_PUBLIC_URL>/invite/<token>`.
- Expiry: 7 days; 24 hours for an owner invitation.
- Created from the members page (§7) by whoever `can` invite that role, and
  sent by mail when an email is given. Pending invitations can be revoked.
- `GET /api/invites/:token` returns what the invite page needs (role, masked
  email, expiry, site name) and nothing else.

### 4.1 First owner

There is no "first sign-up becomes owner" step: a fresh public instance would
belong to whoever found it first. Instead:

```sh
docker compose exec api node dist/main.mjs invite --role owner --email you@example.com
```

prints the link, and mails it if mail is configured. Owner invitations can be
created only while the site has no owner, and only from the CLI.

### 4.2 Other CLI commands

```text
invite --role <role> [--email <address>]   create an invitation, print the link
reset-password --email <address>           print a one-time password reset link
```

Both write to `audit_log` with `actor = cli`.

---

## 5. Sessions and request security

- Better Auth cookie sessions, `__Secure-` prefixed outside development,
  `HttpOnly`, `SameSite=Lax`. 30-day lifetime, refreshed daily.
- **Fresh session** — signed in within the last 10 minutes — is required to
  change roles, mail settings, the registration mode, or to remove a passkey.
  Otherwise the UI asks the user to confirm with a passkey or password.
- **Origin check:** Better Auth's `trustedOrigins` is `CAIRN_PUBLIC_URL`; Cairn's
  own state-changing routes apply the same check.
- **Rate limits** use Better Auth's limiter with database storage, so they hold
  across processes: sign-in and magic-link requests per IP and per email,
  invite acceptance per IP.
- **Client IP** comes from the socket unless `CAIRN_CLIENT_IP_HEADER` names a
  header set by a trusted proxy. The codenav instances use `cf-connecting-ip`.
- `CAIRN_SECRET` is the Better Auth secret. Secrets stored in the database (§6.2)
  are encrypted with AES-256-GCM under a key derived from it with HKDF, so
  rotating `CAIRN_SECRET` signs everyone out and requires re-entering them.
- **SSR:** the web server resolves the session per request by forwarding the
  `Cookie` header to `/api/auth/get-session`. Responses rendered for a signed-in
  user are `Cache-Control: private, no-store`.

---

## 6. Mail

A `mail` module with one interface and swappable drivers:

```ts
interface MailDriver {
  send(message: { to: string; subject: string; html: string; text: string }): Promise<void>
}
```

| Driver      | Configuration                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `none`      | Default. Mail-dependent features are hidden                                                               |
| `log`       | Writes the message, including links, to the api log. Development and smoke tests                          |
| `smtp`      | `CAIRN_SMTP_URL` (`smtps://user:pass@host:465`)                                                           |
| `aliyun-dm` | Aliyun DirectMail `SingleSendMail`: access key id and secret, region (`cn-hangzhou`, `ap-southeast-1`, …) |

Common settings: `CAIRN_MAIL_DRIVER`, `CAIRN_MAIL_FROM` (address), `CAIRN_MAIL_FROM_NAME`
(defaults to the site name), `CAIRN_MAIL_REPLY_TO`. Aliyun:
`CAIRN_ALIYUN_DM_ACCESS_KEY_ID`, `CAIRN_ALIYUN_DM_ACCESS_KEY_SECRET`,
`CAIRN_ALIYUN_DM_REGION`. The sender address must already be verified in the
DirectMail console. New drivers implement `MailDriver` and register a Zod schema
for their configuration; the settings form is generated from that schema.

### 6.1 Delivery

- Messages are enqueued as pg-boss `mail.send` jobs and sent by the worker,
  retried 5 times with exponential backoff. The request that caused the mail
  never waits for the provider.
- `CAIRN_MAIL_ALLOWED_RECIPIENTS` (addresses or `@domain`, comma-separated)
  drops everything else and logs that it did. It is read from the environment
  only and applies whatever the configured driver, so staging cannot mail real
  users even if someone changes its mail settings in the UI.
- Templates — invitation, magic link, email verification, password reset, test
  message — exist in every interface locale and render in the recipient's
  locale, or the site default for invitations. Each has an HTML and a plain-text
  part.

### 6.2 Configuration source

The owner can configure mail from settings. A saved configuration replaces the
environment one entirely (no field-by-field merge); secrets are stored
encrypted and never returned by the api — the form shows only whether each is
set. "Send test message" mails the signed-in owner. "Use environment
configuration" deletes the saved one. The settings page always shows which
source is active.

---

## 7. Site settings

Stored in `site_settings` (key → `jsonb`), each key validated by a Zod schema in
`packages/contracts`.

| Key                 | Default             | Who   |
| ------------------- | ------------------- | ----- |
| `site.title`        | `Cairn`             | owner |
| `site.description`  | empty               | owner |
| `site.locale`       | `en`                | owner |
| `registration.mode` | `invite`            | owner |
| `auth.password`     | `true`              | owner |
| `auth.magicLink`    | `true`              | owner |
| `mail`              | unset → environment | owner |

`GET /api/settings/public` returns what anonymous pages need (title,
description, locale, which sign-in methods are available, whether registration
is open). Settings are read per request; there is no cache to invalidate yet.

---

## 8. API

Better Auth serves `/api/auth/*`. Cairn adds:

| Route                              | Who                      |
| ---------------------------------- | ------------------------ |
| `GET /api/me`                      | signed in                |
| `PATCH /api/me`                    | signed in (name, locale) |
| `GET /api/settings/public`         | anyone                   |
| `GET`, `PATCH /api/settings`       | owner                    |
| `PUT`, `DELETE /api/settings/mail` | owner, fresh session     |
| `POST /api/settings/mail/test`     | owner                    |
| `GET /api/members`                 | owner, moderator         |
| `PATCH /api/members/:id`           | per §1 (role, status)    |
| `GET`, `POST /api/invites`         | per §1                   |
| `DELETE /api/invites/:id`          | per §1                   |
| `GET /api/invites/:token`          | anyone                   |

All declared with `zod-openapi`, so they appear in `/api/openapi.json`.

---

## 9. Pages

| Path               | Contents                                                               |
| ------------------ | ---------------------------------------------------------------------- |
| `/sign-in`         | Available methods only; passkey offered first when the browser has one |
| `/sign-up`         | Only when `registration.mode` is not `invite`                          |
| `/invite/[token]`  | Who invited you and as what; choose password, magic link or GitHub     |
| `/verify`          | Landing for email verification and magic links                         |
| `/account`         | Name, locale, password, passkeys, linked GitHub, active sessions       |
| `/studio/settings` | General, Registration and sign-in, Mail                                |
| `/studio/members`  | Members (role, status, approve) and invitations                        |

These are the first real pages, so they bring the base components from
[design.md](./design.md): button, input, field with label/hint/error, select,
switch, dialog, toast, badge, avatar, menu, and the studio layout. Fonts are
self-hosted woff2 subsets.

---

## 10. Data model changes

- `user`: `role`, `status`, `locale`, `display_name` (Better Auth `additionalFields`).
- Better Auth tables: `session`, `account`, `verification`, `passkey`, `rate_limit`.
- `invitations` (§4) and `audit_log` — `id, actor_id (nullable), actor_kind (user · cli · system), action, target_type, target_id, data jsonb, ip, created_at`.

---

## 11. Testing

- **Unit:** `can` over the whole role × action table; registration hook in each
  mode; invitation claiming under concurrency; mail allow-list; secret
  encryption round trip; each template in each locale.
- **Integration (real Postgres in CI):** invite → accept with password → sign in
  → `GET /api/me`; approval mode; suspended user loses sessions; a moderator
  cannot touch staff.
- **Smoke (compose):** CLI owner invitation with the `log` mail driver, accept
  it, sign in, read and update settings through the web origin.

---

## 12. Operator setup for the codenav instances

- Mail: `aliyun-dm` with the DirectMail account boxly uses, set in each
  instance's `.env`; staging also sets `CAIRN_MAIL_ALLOWED_RECIPIENTS`.
- GitHub: one OAuth app per environment, since each has its own callback URL.
- `CAIRN_CLIENT_IP_HEADER=cf-connecting-ip` on both.
- After the first deploy with identity: create the owner invitation on
  production with the CLI, accept it, and add a passkey.
