import { roles, userStatuses } from '@cairnhq/contracts'
import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const id = () =>
  uuid()
    .primaryKey()
    .default(sql`uuidv7()`)
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow()
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

export const siteSettings = pgTable('site_settings', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

// Identity. The first five tables follow the field names Better Auth expects;
// the adapter maps its models onto them in apps/api.

export const userRole = pgEnum('user_role', roles)
export const userStatus = pgEnum('user_status', userStatuses)

export const users = pgTable(
  'users',
  {
    id: id(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: userRole().notNull().default('member'),
    status: userStatus().notNull().default('active'),
    locale: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('users_single_owner')
      .on(t.role)
      .where(sql`${t.role} = 'owner'`),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    token: text().notNull().unique(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
)

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: text().notNull(),
    accountId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId), unique().on(t.providerId, t.accountId)],
)

export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.identifier)],
)

export const passkeys = pgTable(
  'passkeys',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text(),
    publicKey: text().notNull(),
    credentialID: text().notNull().unique(),
    counter: integer().notNull(),
    deviceType: text().notNull(),
    backedUp: boolean().notNull(),
    transports: text(),
    aaguid: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow(),
  },
  (t) => [index().on(t.userId)],
)

export const rateLimits = pgTable('rate_limits', {
  id: id(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: 'number' }).notNull(),
})

export const invitations = pgTable('invitations', {
  id: id(),
  tokenHash: text().notNull().unique(),
  role: userRole().notNull(),
  email: text(),
  invitedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  acceptedAt: timestamp({ withTimezone: true }),
  acceptedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  revokedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
})

export const actorKind = pgEnum('actor_kind', ['user', 'cli', 'system'])

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    actorId: uuid().references(() => users.id, { onDelete: 'set null' }),
    actorKind: actorKind().notNull(),
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    data: jsonb(),
    ip: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt)],
)
