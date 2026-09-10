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

**All six phases are complete.** The MVP implements every section of the
specification.

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Project setup, database, authentication, application layout | ✅ Complete |
| 2 | Organization management, document upload, SHA-256 hashing, document list | ✅ Complete |
| 3 | Document details, verification ID, public verification page, QR generation | ✅ Complete |
| 4 | Smart contract, blockchain integration, wallet connection, transactions | ⬜ Not started |
| 5 | Dashboard, activity, search, filters, polish | ✅ Complete |
| 6 | Testing, security review, error handling, production cleanup | ⬜ Not started |

Run `npm run preflight` before deploying — it catches the misconfigurations
that are silent but serious.

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
- **Solidity 0.8.28** + **OpenZeppelin 5**, compiled and tested with **Hardhat 3**
- **viem** and **wagmi** for wallet connection and chain reads, on **Base Sepolia**

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
contracts/           Self-contained Hardhat package (see below)
  src/               ProofChainRegistry.sol
  test/              Contract tests
  scripts/           Deployment and ABI export
tests/
  unit/              Pure logic
  integration/       Database-backed, plus an opt-in live-chain suite
```

### Why contracts are a separate package

`contracts/` has its own `package.json` and `node_modules`. Hardhat 3 requires an
ESM project, and converting the whole application to ESM purely to satisfy the
Solidity toolchain would be the tail wagging the dog. Keeping it separate also
means the web application's dependency tree contains no Hardhat at all, so
`npm audit` for what actually ships stays clean.

The application never imports from `contracts/`. The one thing that crosses the
boundary is the ABI, which is **generated** into `src/lib/blockchain/abi.ts` and
committed — so the app builds without the Solidity toolchain, and the ABI it
encodes against cannot drift from the deployed contract.

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
npm test             # vitest (application)
npm run test:all     # application + contract tests
npm run build        # production build
npm start            # serve the production build
npm run preflight    # check configuration before deploying
```

`GET /api/health` reports liveness and database reachability for a load
balancer. It returns only `status` and `database` — never versions or
configuration.

### Uploading documents

Documents are stored under `STORAGE_DIR` (default `./storage`), partitioned by
organization and named by UUID. The directory is git-ignored and is not served
publicly — there is no URL that maps to a stored file.

Only PDFs up to `MAX_UPLOAD_BYTES` (default 10 MB) are accepted.

### Smart contract

`ProofChainRegistry` records, per proof: the document fingerprint, the issuer,
a timestamp and the verification id. It emits `DocumentRegistered` and exposes
read-only lookups by fingerprint and by verification id. It uses OpenZeppelin's
`Ownable` and `Pausable`.

**Duplicate policy.** Uniqueness is enforced per *(document, issuer)*, not
globally per document. Two counterparties to the same shipment legitimately hold
the same bill of lading and both must be able to attest to it; global uniqueness
would make the first registrant the only party who could ever prove they had the
document. What is prevented is the same issuer registering the same document
twice. Verification ids remain globally unique. This matches the application's
own per-organization duplicate rule.

**Ownership grants exactly one power:** pausing new registrations. There is no
function that can alter or delete a proof that has already been recorded — a
test asserts the full list of state-changing functions, so adding one is a
deliberate act.

```bash
npm run contracts:install    # once
npm run contracts:compile
npm run contracts:test
npm run contracts:abi        # regenerate src/lib/blockchain/abi.ts
npm run contracts:deploy     # deploy to Base Sepolia
```

### Base Sepolia configuration

1. Fund a deployer account from a Base Sepolia faucet.
2. Set `DEPLOYER_PRIVATE_KEY` and `BASE_SEPOLIA_RPC_URL` in `.env`.
3. Run `npm run contracts:deploy`. It prints the values to copy back into
   `.env` (`CONTRACT_ADDRESS`, `NEXT_PUBLIC_CONTRACT_ADDRESS`,
   `BLOCKCHAIN_MODE=real`).
4. Rebuild the application so the public variables are inlined.

`DEPLOYER_PRIVATE_KEY` is read by the deployment script and nowhere else. The
web server holds no key and cannot sign anything.

### How a real proof is created

Proofs are signed by the issuing organization's **own wallet**, never by the
server:

1. The browser asks the server to prepare. The server reserves a verification
   id, records a PENDING registration, and returns the fingerprint, contract
   address and chain id.
2. The user approves the transaction in their wallet.
3. The browser waits for the transaction to be mined, then sends **only the
   transaction hash** back.
4. The server independently fetches the receipt from the chain and checks: the
   transaction succeeded, it was sent to the registry contract, and a
   `DocumentRegistered` log emitted *by that contract* carries exactly the
   fingerprint and verification id that were reserved. The issuer, block number
   and timestamp are read from the chain, never from the request.

Only then is the proof recorded. A client that submits an unrelated, failed, or
fabricated transaction gets a rejection.

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

### Searching and filtering

The documents table and the activity log both filter through the **URL**, so a
filtered view can be bookmarked, shared with a colleague, and survives a
refresh.

One search box covers all three things people actually have to hand: part of a
filename, a verification ID read off a printout (`pc8f29a2` resolves the same as
`PC-8F29A2`), or a fingerprint pasted from elsewhere in any case. There is no
mode selector to get wrong.

An empty result with filters applied is worded differently from an empty
workspace — "no documents match those filters" needs a way to clear them, not an
invitation to upload.

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
the full user journey with no wallet, no RPC endpoint and no deployed contract.

Simulated proofs are stored with `mode: MOCK` and labelled as simulated on both
the document page and the public verification page, so a mock proof can never be
mistaken for a real one. In `real` mode, the server-side anchoring path refuses
to run at all — proofs must be wallet-signed.

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

The dashboard counts a **verified** document as **registered** too. A customer
checking a document must not make the registered count drop.

Current coverage: password hashing, role-based access control, input
validation, display formatting, transactional account and organization
creation, cross-organization data isolation, SHA-256 hashing, upload validation
(size, MIME type, magic bytes, filename sanitisation), duplicate detection,
document listing with pagination, sorting and filtering, member role changes and
removal, the full invitation lifecycle, verification ID generation and
normalisation, proof registration, public proof lookup, tamper detection, and
verification audit records, dashboard counts, blockchain status reporting,
activity filtering and pagination, document search across all three key types,
the ABI's shape, and the on-chain confirmation
guard (reverted transactions, wrong contract, wrong document, wrong verification
id, forged logs from another address).

Contract tests run separately:

```bash
npm run contracts:test    # 18 tests
npm run test:all          # application + contract tests
```

An opt-in suite exercises the real confirmation path against an actual EVM.
Start a node and point the tests at it:

```bash
cd contracts && npx hardhat node          # in one terminal
LOCAL_CHAIN_RPC=http://127.0.0.1:8545 npm test
```

Without `LOCAL_CHAIN_RPC` those cases are skipped, so the default run stays
self-contained.

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

Added in Phase 4:

- **The server holds no private key.** It cannot sign a transaction on any
  user's behalf. Real proofs are signed by the organization's own wallet.
- **Transaction results are verified against the chain, not trusted.** The
  browser supplies only a transaction hash; the receipt is re-fetched and the
  emitted event must match the reserved fingerprint and verification id. Logs
  from any address other than the registry are ignored, so a look-alike contract
  emitting the same event cannot mint a proof.
- **Duplicate registration is prevented on-chain** per (document, issuer), and
  verification ids are globally unique at the contract level.
- **The contract cannot rewrite history.** Pausing blocks new registrations
  only; existing proofs stay readable and verifiable.
- **The Solidity toolchain is not in the application's dependency tree**, so it
  cannot reach production.

Added in Phase 5:

- **The error boundary shows no stack trace, message or digest.** A raw error
  can leak table names, file paths or query fragments; the detail is logged
  server-side instead.
- **Search and activity are organization-scoped in the `where` clause**, like
  every other read. Activity messages contain filenames and member names, so a
  leak there would be as bad as a leak of the documents.
- **The blockchain status card queries the RPC endpoint** rather than assuming
  it is reachable. "Connected" means the chain answered; a misconfigured or
  unreachable node shows as a problem rather than a blank card.

Added in Phase 6:

- **Rate limiting** on the endpoints that are unauthenticated, expensive, or
  both: registration (5/hour per caller), verification by upload (30/10min,
  since each call hashes up to 10 MB), verification lookup (120/10min), and
  sign-in (10 per account and 30 per caller, per 15 minutes). A throttled
  sign-in returns the same response as a wrong password, so an attacker still
  learns nothing about which accounts exist.
- **Security headers on every response**, including a Content-Security-Policy
  and `frame-ancestors 'none'` — a verification page must not be framed inside
  a site that then claims the result as its own. `X-Powered-By` is off.
- **Stored failure messages are vetted text only.** A registration failure is
  shown on the document page, so the raw error is logged and replaced. A test
  asserts a connection string in an error never reaches the database or the
  activity log.
- **Two dead columns removed** (`ipHash`, `userAgent`). They collected nothing
  but implied the public verification endpoint tracked its visitors. Logging who
  checked whose paperwork is a liability the product does not need.

### Known limitations

Stated plainly rather than left to be discovered:

- **Rate limiting is per instance.** It uses process memory, so behind more than
  one server each gets its own budget. Move it to Redis before scaling
  horizontally.
- **Document storage is a local filesystem.** Fine for a single instance;
  replace with object storage before scaling out. Access is already isolated
  behind `STORAGE_DIR`.
- **Invitations have no email delivery.** The link is shown once to the inviter
  to pass on themselves.
- **The wallet approval step is not covered by automated tests**, because it
  needs a real wallet extension. Everything either side of it is tested,
  including against a live EVM.
- **`npm audit` reports 3 moderate advisories in the contracts package**, from
  an unfixed issue in a Hardhat dependency. Development-only, absent from the
  production build. The web application audits clean.

---

## Production checklist

```bash
npm run preflight
```

It fails the build on: a placeholder or short `NEXTAUTH_SECRET`; a localhost or
non-https `NEXT_PUBLIC_APP_URL` (those URLs are printed onto documents and
encoded into QR codes, so a localhost value produces codes nobody can scan);
and `BLOCKCHAIN_MODE=real` without a contract address, without an RPC endpoint,
or with `CONTRACT_ADDRESS` and `NEXT_PUBLIC_CONTRACT_ADDRESS` disagreeing — which
would have the browser build transactions for a different contract than the
server verifies against.

## Production considerations

- Set a strong, unique `NEXTAUTH_SECRET` and a correct `NEXTAUTH_URL`.
- Run `npm run db:deploy`, not `db:migrate`, at deploy time.
- Do not run the seed script; it refuses to run when `NODE_ENV=production`.
- Replace filesystem storage with object storage before scaling beyond a single
  instance. Storage access is already isolated behind `STORAGE_DIR`.
- Serve over HTTPS so session cookies are sent with the `Secure` attribute.
- Deploy the contract and set `BLOCKCHAIN_MODE=real` before onboarding real
  customers; simulated proofs are clearly labelled but are not evidence.
- `npm audit` reports 3 moderate advisories in the **contracts** package only
  (an unfixed symlink issue in `adm-zip`, reached when Hardhat extracts a
  compiler download from the official Solidity release server). It is a
  development dependency of a package the application never imports, and is
  absent from the production build. The web application itself audits clean.
