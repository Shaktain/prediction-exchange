# Prediction Exchange

A prediction market platform where users trade yes/no contracts on a limit order book. It has a demo mode with paper balances and a real mode with USDC, wallet-signed orders and batched settlement on Base Sepolia (testnet).

**Status:** work in progress. Tracking of settled trades and seller updates are still being finished. This is a personal project and has not been audited, so don't use it with real funds. Admin and redemption routes don't have proper authentication yet, so run it locally or on testnet only and don't expose it publicly.

## Features

- Limit orders on yes/no markets, including grouped markets and short sales backed by collateral
- Order book, price history charts, positions and a portfolio page
- Separate demo and real balances, with funds locked when orders are placed
- EIP-712 wallet signatures for real-mode orders
- Batched on-chain settlement of matched trades
- Market maker service with an admin control page
- Admin pages for creating markets, resolving them and running settlement
- Comments and usernames

## Stack

| Area | Tools |
| --- | --- |
| App | Next.js, React, TypeScript, Tailwind CSS |
| Database | PostgreSQL, Prisma |
| Wallets and chain | wagmi, viem, RainbowKit, Base Sepolia |
| Contracts | Solidity, Hardhat, OpenZeppelin |

## Project layout

```
app/        Pages and API routes (orders, order book, positions, settlement, admin)
components/ UI components
contracts/  Solidity contracts
lib/        Settlement and market maker services, signature checks, contract config
prisma/     Database schema, migrations and seed data
scripts/    Deployment and maintenance scripts
```

## Running locally

You need Node.js and a PostgreSQL database.

```bash
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

Then open http://localhost:3000.

Create a `.env.local` file with these values. Prisma reads `DATABASE_URL` from `.env`, so put that one there as well.

```
DATABASE_URL=
NEXT_PUBLIC_CHAIN_ID=
NEXT_PUBLIC_EXCHANGE_CONTRACT_ADDRESS=
NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
PRIVATE_KEY=
BASESCAN_API_KEY=
ENABLE_MARKET_MAKER=
MARKET_MAKER_INTERVAL=
```

`PRIVATE_KEY` signs settlement transactions. Use a testnet-only wallet and never commit it.
