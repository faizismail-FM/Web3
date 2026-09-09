# ProofChain

Blockchain-backed document verification for businesses.

ProofChain lets an organization prove that a document existed at a specific
point in time and has not been modified since — **without ever publishing the
document itself**. The file is stored off-chain; only its SHA-256 fingerprint,
a public verification ID, the issuer and a timestamp are anchored on-chain.

Anyone can verify a document from a link or QR code without an account, a
wallet, or any knowledge of blockchain technology.

---

## Status

This project is being built in phases. **Phases 1–3 are complete.**

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Project setup, database, authentication, application layout | ✅ Complete |
| 2 | Organization management, document upload, SHA-256 hashing, document list | ✅ Complete |
| 3 | Document details, verification ID, public verification page, QR generation | ✅ Complete |
| 4 | Smart contract, blockchain integration, wallet connection, transactions | ⬜ Not started |
| 5 | Dashboard, activity, search, filters, polish | ⬜ Not started |
| 6 | Testing, security review, error handling, production cleanup | ⬜ Not started |

Pages that belong to a later phase are present as navigable placeholders so the
application shell can be used and reviewed end to end today.

---

## Architecture

```
Document  ──►  SHA-256 hash  ──►  Blockchain proof  ──►  Verification
 (private)      (server-side)        (hash only)          (public)
```

Three rules shape the whole design:

1. **The document never goes on-chain.** Only a one-way fingerprint does.
2. **Hashes are computed server-side.** A client-supplied hash is never trusted.
3. **Every read is scoped to an organization.** There is no cross-tenant path.

### Layers

| Layer | Location | Responsibility |
| ----- | -------- | -------------- |
| Pages | `src/app` | Routing and server-rendered pages |
| API | `src/app/api` | JSON endpoints with a single response envelope |
| Services | `src/lib/services` | Business logic, independent of HTTP and UI |
| Data | `prisma/` | Schema, migrations, seed data |
| UI | `src/components` | Presentational and interactive components |

Business logic lives in `src/lib`, never in components. Components render; they
do not decide.

---

## Technology stack

- **Next.js 16** (App Router) with **TypeScript** in strict mode
- **Tailwind CSS v4** and **shadcn/ui** (Radix primitives)
- **PostgreSQL** with **Prisma ORM**
- **NextAuth** (credentials provider, JWT sessions, bcrypt password hashing)
- **Vitest** for unit and integration tests
- *Planned:* Solidity + OpenZeppelin, viem/wagmi, Base Sepolia

---

## Folder structure

```
src/
  app/
    (public)/        Landing page, /verify and /verify/[id] (no account needed)
    (auth)/          Login and registration
    (app)/           Authenticated application shell
    api/             JSON API routes
  components/
    ui/              shadcn/ui primitives
    layout/          Sidebar, header, navigation, theme toggle
    auth/            Sign-in and registration forms
    marketing/       Landing page sections
    common/          Shared building blocks (stat card, empty state)
    providers/       Theme and session providers
  lib/
    auth/            Sessions, password hashing, role-based access control
    api/             Response envelope, typed fetch client, org-scoped guard
    blockchain/      Network config and the anchoring provider (mock today)
    documents/       Document taxonomy and upload validation rules
    services/        Business logic (documents, storage, hashing, proofs, verification)
    validation/      Zod schemas shared by client and server
    verification/    Verification IDs, public URLs, QR codes
prisma/              Schema, migrations, seed script
tests/
  unit/              Pure logic
  integration/       Database-backed
```

---

## Installation

Requires **Node.js 22+** and **PostgreSQL 14+**.

```bash
npm install
cp .env.example .env      # then edit the values
```

Generate a session secret:

```bash
openssl rand -base64 32
```

---

## Environment variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | yes | Session signing secret (32 random bytes) |
| `NEXTAUTH_URL` | production | Canonical deployment URL |
| `NEXT_PUBLIC_APP_URL` | yes | Base URL embedded in verification links and QR codes |
| `BLOCKCHAIN_MODE` | yes | `mock` or `real` |
| `BASE_SEPOLIA_RPC_URL` | if `real` | JSON-RPC endpoint |
| `CONTRACT_ADDRESS` | if `real` | Deployed `ProofChainRegistry` address |
| `DEPLOYER_PRIVATE_KEY` | deployment only | Used by the deploy script; **never** read by the app |
| `STORAGE_DIR` | no | Where uploaded documents are written (default `./storage`) |
| `MAX_UPLOAD_BYTES` | no | Upload size limit (default 10 MB) |

`src/lib/env.ts` validates these at runtime and fails with a readable message
rather than silently reading `undefined`. When `BLOCKCHAIN_MODE=real`, the RPC
URL and contract address become mandatory.

**Never commit a populated `.env`.** `DEPLOYER_PRIVATE_KEY` is never exposed to
the browser and is not referenced by application code.

---

## Database setup

```bash
npm run db:migrate     # apply migrations (development)
npm run db:seed        # optional demo organization and accounts
npm run db:studio      # browse the data
```

`npm run db:deploy` applies migrations without prompting, for production.

### Demo accounts

`npm run db:seed` creates one organization with an account per role. All use the
password `ProofChain123`. **Development only.**

| Email | Role |
| ----- | ---- |
| `owner@proofchain.test` | Owner |
| `admin@proofchain.test` | Admin |
| `member@proofchain.test` | Member |
| `viewer@proofchain.test` | Viewer |

---

## Development

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest
npm run build        # production build
npm start            # serve the production build
```

### Uploading documents

Documents are stored under `STORAGE_DIR` (default `./storage`), partitioned by
organization and named by UUID. The directory is git-ignored and is not served
publicly — there is no URL that maps to a stored file.

Only PDFs up to `MAX_UPLOAD_BYTES` (default 10 MB) are accepted.

### Verification IDs and QR codes

Registering a proof mints a human-readable verification ID such as `PC-8F29A2`.
The alphabet excludes `0/O` and `1/I/L`, because these IDs are read aloud and
typed off printed paper. IDs are drawn with `crypto.randomInt`, not
`Math.random` — a guessable ID would let someone enumerate other organizations'
proofs.

Every proof gets a public URL (`/verify/PC-8F29A2`) and a QR code, available as
SVG for display and PNG for printing. QR images are generated only for IDs that
actually exist, so the endpoint cannot be used to mint official-looking codes
for arbitrary text.

### Verifying a document

Two ways, neither requiring an account:

- **By ID** — open the verification URL or scan the QR code.
- **By upload** — drop the document at `/verify`. It is fingerprinted in memory
  and discarded; verification uploads are never stored.

Supplying a verification ID alongside an upload changes what a failure means: a
mismatch says *this is a different document*, where a bare lookup can only say
*no such document is registered*.

### Inviting colleagues

There is no email delivery yet. Creating an invitation returns a single-use
link, shown **once** to the inviter to pass on themselves. The token is stored
only as a hash, so a lost link genuinely cannot be recovered — issue a new one.

### Mock blockchain mode

The application runs end to end with **no blockchain configuration at all**.
With `BLOCKCHAIN_MODE=mock` (the default), registrations are simulated: mock
transaction hashes and block numbers are generated and the real transaction
states are shown, so the product can be developed and demonstrated before a
contract is deployed. The header shows a **Simulation mode** badge whenever mock
mode is active, so a simulated proof is never mistaken for a real one.

Creating a proof mints a verification ID, records a simulated transaction hash
and block number, and produces a working public verification page and QR code —
the full user journey, minus a real chain.

`BLOCKCHAIN_MODE=real` currently **fails with a clear error** rather than
silently simulating. Real anchoring arrives with the `ProofChainRegistry`
contract in Phase 4. An operator who asked for real proofs must never
unknowingly get mock ones.

---

## Testing

```bash
npm test
```

Unit tests run against pure logic. Integration tests use a **separate database**
(`proofchain_test` by default, or `TEST_DATABASE_URL`) that is truncated between
tests, so a test run can never touch development data.

Create it once:

```bash
createdb proofchain_test
DATABASE_URL="postgresql://.../proofchain_test" npx prisma migrate deploy
```

The test database is migrated automatically before each run by the `pretest`
script, so a new migration never shows up as a confusing "table does not exist"
failure.

Current coverage: password hashing, role-based access control, input
validation, display formatting, transactional account and organization
creation, cross-organization data isolation, SHA-256 hashing, upload validation
(size, MIME type, magic bytes, filename sanitisation), duplicate detection,
document listing with pagination, sorting and filtering, member role changes and
removal, the full invitation lifecycle, verification ID generation and
normalisation, proof registration, public proof lookup, tamper detection, and
verification audit records.

---

## Security

Implemented in Phase 1:

- Passwords are hashed with bcrypt (cost 12); plaintext is never stored.
- Sign-in failures are indistinguishable between "unknown email" and "wrong
  password", including in timing, so the form does not disclose which addresses
  are registered.
- The authenticated shell is gated in `src/proxy.ts` *and* re-checked in every
  server component and API route — the proxy is a first line of defence, not the
  only one.
- API errors return a consistent JSON envelope. Stack traces are logged
  server-side and never sent to the browser.
- Every database read is scoped to the caller's organization.
- Role-based access control is centralised in `src/lib/auth/rbac.ts` and
  expressed as capabilities rather than scattered role comparisons.
- `.env` is git-ignored; only `.env.example` is committed.

Added in Phase 2:

- **Hashes are computed server-side, always.** `src/lib/services/hashing.ts` is
  the only place a document fingerprint is produced. A client-supplied hash is
  ignored entirely — accepting one would prove nothing about the stored bytes.
- **Uploads are validated three ways**: declared MIME type, file extension, and
  the file's own magic bytes. A non-PDF renamed to `.pdf` and sent with a PDF
  content type is still rejected.
- **Filenames are sanitised** against directory traversal, control characters
  and reserved characters. The uploaded name is never used as a path in any
  case: stored files are named by UUID and partitioned by organization.
- **Storage paths are resolved against the storage root** and anything escaping
  it is refused, so a future bug becomes a failure rather than an arbitrary
  file read.
- **`requireOrgMember()` is the single authorization entry point** for
  organization-scoped routes. It re-reads membership from the database rather
  than trusting the session token, so a role change or removal takes effect
  immediately.
- **Duplicate documents are rejected** per organization, backed by a unique
  index rather than only a pre-check, so concurrent uploads cannot both win.
- **Invitation tokens are stored only as a hash**, are single-use, expire after
  seven days, and may be bound to a specific email address.
- **Owners cannot be demoted or removed** through the API, and nobody can change
  their own role — so an organization always keeps an owner.

Added in Phase 3:

- **The public proof view is a deliberate allowlist.** Filename, uploader, file
  size and storage path are never exposed — `Termination_Letter_J_Smith.pdf`
  would leak the very thing the document is about. A test asserts these do not
  appear in the public payload.
- **A document belonging to another organization returns 404**, not 403, from
  every document route including detail, download and proof creation — the
  organization is part of the query, so it does not exist as far as the lookup
  is concerned.
- **Stored files leave the server through one authorized route only**, served
  as `attachment` with `no-store`. There is no public path to the storage
  directory.
- **Verification IDs are cryptographically random**, so proofs cannot be
  enumerated.
- **An unconfirmed registration reports as pending, never as verified.**
  Overstating a proof is the one lie this product cannot afford.
- **Simulated proofs are labelled as such** on the document page and on the
  public verification page, so a mock proof can never be mistaken for a real
  one. `BLOCKCHAIN_MODE=real` currently fails loudly rather than silently
  falling back to simulation.

Planned for later phases: on-chain transaction result validation and
duplicate-registration prevention at the contract level.

---

## Production considerations

- Set a strong, unique `NEXTAUTH_SECRET` and a correct `NEXTAUTH_URL`.
- Run `npm run db:deploy`, not `db:migrate`, at deploy time.
- Do not run the seed script; it refuses to run when `NODE_ENV=production`.
- Replace filesystem storage with object storage before scaling beyond a single
  instance. Storage access is already isolated behind `STORAGE_DIR`.
- Serve over HTTPS so session cookies are sent with the `Secure` attribute.
