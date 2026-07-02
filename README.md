# KilnTrace

KilnTrace is a GenLayer ceramic firing provenance protocol for studios that need verifiable clay batches, glaze lots, kiln telemetry, review windows and sealed firing records.

A studio opens a firing, records material and kiln evidence, asks GenLayer to review the public evidence trail, then handles challenge, appeal and final sealing paths.

## Live System

| Surface | Link |
| --- | --- |
| App | https://kilntrace.vercel.app |
| GitHub | https://github.com/thorbh2/kilntrace |
| Contract | https://explorer-studio.genlayer.com/contracts/0xb828C57ED73B72A516Ed97c3403fA0b5C9EC3b58 |
| Network | GenLayer Studionet |

## What Ships

- Product frontend with wallet-gated write actions and public read views.
- GenLayer contract source in `contracts/kilntrace.py`.
- Deployment metadata in `deployment.json`.
- Frontend contract client in `src/lib/kilntrace.ts`.
- Public contract address pinned as a fallback and documented in `.env.local.example`.

## Contract Model

This is not a one-call demo contract. The on-chain package keeps lifecycle state, evidence records, review outputs, challenge and appeal records, indexed read methods and audit-friendly public views.

Verification record: 18 finalized write transactions, 21/21 read checks.

## Run Locally

```powershell
npm install
npm run dev
```

Open the URL printed by Next.js. The public contract address is already present as a fallback; local env files are optional for normal read-only review.

## Public Environment

```text
NEXT_PUBLIC_CONTRACT_ADDRESS=0xb828C57ED73B72A516Ed97c3403fA0b5C9EC3b58
NEXT_PUBLIC_GENLAYER_RPC=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_EXPLORER=https://explorer-studio.genlayer.com
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
```

## Deploy

```powershell
npx --yes vercel@latest --prod --yes
```

## Security

- No private keys, vault files, local dashboard data or decrypted wallet material belong in this repository.
- The frontend receives only public `NEXT_PUBLIC_*` values.
- Write actions require a connected wallet confirmation.
- `.env.local`, `.vercel/`, build output and local state are ignored.
