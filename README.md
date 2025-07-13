# Metrik – On-Chain Credit Settlement Infrastructure for Supply Chains

Metrik is a decentralized credit infrastructure that bridges traditional B2B trade credit with on-chain liquidity. It enables suppliers to tokenize their unpaid invoices as expirable NFTs and borrow against them using liquidity sourced from the crypto ecosystem — offering faster capital access without relying on banks.

---

🔍 **Problem**

In traditional B2B transactions, buyers often purchase goods or services on credit, delaying payments for 30–90 days. This leaves suppliers — especially early-stage or SME vendors — cash-strapped and unable to grow due to working capital shortages. Banks are slow, underwrite conservatively, and charge high interest for such short-term loans.

💡 **Solution**

Metrik creates an alternative, on-chain credit market by:

- Allowing suppliers to mint Invoice NFTs representing verified, pending receivables
- Letting suppliers borrow stablecoins against these invoices
- Rewarding lenders (crypto users) with interest + METRIK token incentives
- Enforcing smart contract–driven collateralization and liquidation mechanisms

⚙️ **How It Works**

- **Invoice Tokenization** – Suppliers create expirable, verifiable NFTs representing invoices.
- **Staking & Trust Scoring** – Suppliers stake $METRIK tokens to earn trust tiers, which define borrowing limits.
- **Dynamic LTV Engine** – Metrik calculates borrowing capacity using on-chain staking, tier, and credit history.
- **Liquidity Matching** – Liquidity providers deposit USDC into pools and earn APR from borrowing activity.
- **Repayment or Liquidation** – Borrowers repay with interest; if overdue, NFTs are burned and staked tokens are slashed.

🔐 **Key Features**

✅ Invoice-backed borrowing using NFTs  
✅ Dynamic credit scoring via staking + history  
✅ On-chain invoice verification using AVS or trusted oracles  
✅ Fair, transparent, and programmatic interest rates  
✅ Zero human underwriting or intermediaries  
✅ Crypto-native access to real-world working capital demand

🎯 **Target Users**

- **Suppliers/Vendors:** Seeking faster liquidity against trade receivables
- **Liquidity Providers:** Holding idle USDC, seeking yield with real-world collateral
- **DAOs/Protocols:** With treasury capital looking to support RWAs
- **SMEs in emerging markets** excluded by traditional finance

💰 **Token Utility – $METRIK**

- Staking determines credit tiers (Bronze → Diamond)
- Higher staking unlocks better borrowing terms
- Slashed on borrower defaults
- Earned by LPs and verifier/integrators as incentives

---

# Metrik DeFi Credit Protocol

A decentralized protocol for tokenizing invoices as NFTs, enabling suppliers to borrow against them from a shared lending pool, with a robust staking and rewards system.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
  - [MockERC20 (METRIK, USDC)](#mockerc20-metrik-usdc)
  - [InvoiceNFT](#invoicenft)
  - [Staking](#staking)
  - [LendingPool](#lendingpool)
  - [BorrowRegistry](#borrowregistry)
- [Staking & Rewards](#staking--rewards)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Metrik enables suppliers to:
- Mint invoices as NFTs (`InvoiceNFT`)
- Stake METRIK tokens for higher borrowing power and rewards
- Borrow stablecoins against verified invoices
- Earn rewards as a liquidity provider (LP) or staker

---

## Architecture

- **InvoiceNFT**: ERC721 tokens representing invoices, with verification and metadata.
- **LendingPool**: Manages stablecoin deposits, loans, repayments, and liquidations.
- **Staking**: Users stake METRIK tokens for tiered benefits and claimable rewards.
- **BorrowRegistry**: Tracks supplier credit history for risk management.
- **MockERC20**: Used for METRIK and USDC tokens (mintable/burnable for testing).

---

## Smart Contracts

### MockERC20 (METRIK, USDC)
- ERC20 tokens with custom decimals.
- `mint(address, amount)` and `burn(amount)` functions (owner-only for mint).
- Used for both METRIK (18 decimals) and USDC (6 decimals).

### InvoiceNFT
- ERC721 NFT for each invoice.
- Metadata: invoiceId, supplier, buyer, creditAmount, dueDate, IPFS hash, verification status.
- Only verified invoices can be transferred or used as collateral.
- Roles: `MINTER_ROLE`, `VERIFIER_ROLE`.

### Staking
- Stake METRIK tokens for 45, 90, 180, or 365 days.
- Tiers: Bronze, Silver, Gold, Diamond (based on points).
- APY: 1%–8% depending on duration.
- **Claimable rewards**: Users can claim METRIK rewards based on APY and time staked.
- Rewards are auto-claimed on unstake.

### LendingPool
- Deposit/withdraw stablecoins as LP.
- Borrow against verified invoices (up to 60% LTV, tier-boosted).
- Repay with interest, subject to origination fees.
- Liquidate overdue loans, with loss absorption logic.
- System-wide and per-user safe lending limits.
- Integrates with Staking and BorrowRegistry.

### BorrowRegistry
- Tracks supplier defaults, late repayments, and successful loans.
- Used by LendingPool to adjust borrowing capacity (LTV).

---

## Staking & Rewards

- **Staking**: Lock METRIK tokens for a fixed duration to earn points and APY.
- **Claiming Rewards**: Call `claimRewards(stakeIndex)` to mint earned METRIK tokens.
- **Auto-claim**: Rewards are automatically claimed when unstaking.
- **View rewards**: Use `pendingRewards(address, stakeIndex)` to see unclaimed rewards.

---

## Deployment

### Prerequisites

- Node.js v16+ (avoid v23+ for Hardhat compatibility)
- npm
- Hardhat

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```
   PRIVATE_KEY=your_private_key
   INFURA_API_KEY=your_infura_key
   ```

### Supported Networks

- Hardhat (local)
- Sepolia (Ethereum testnet)
- Fuji (Avalanche testnet)
- Citrea (OP Stack testnet)

#### Example Citrea Network Config (from `hardhat.config.ts`):
```js
Citrea: {
  url: "https://citrea-testnet.public.blastapi.io",
  chainId: 5115,
  timeout: 60000,
  accounts: [
    process.env.PRIVATE_KEY_OWNER || "",
    process.env.PRIVATE_KEY_SUPPLIER || "",
    process.env.PRIVATE_KEY_LP || "",
    process.env.PRIVATE_KEY_BUYER || ""
  ].filter(key => key !== "")
}
```

### Deploying to Citrea

```bash
npx hardhat run scripts/deploy.ts --network Citrea
```

Deployment addresses will be saved to `deployments/Citrea.json`.

---

## Testing

Run all tests:

This frontend is built with **Next.js** and **React**, providing a fast, responsive, and user-friendly dashboard for all users.

---

## 🚀 Project Purpose
Metrik is a decentralized finance (DeFi) platform that enables:
- **Suppliers** to stake tokens, create invoices, borrow against invoices, and repay loans.
- **Liquidity Providers (LPs)** to deposit USDC, earn interest, and withdraw funds.
- **Owners/Admins** to manage platform fees and monitor protocol health.

## ✨ Main Features
- **Dashboard views** for Suppliers, LPs, and Owners
- **Staking** and **unstaking** tokens
- **Invoice creation** and management
- **Borrowing** against invoices
- **Repayment** of loans
- **LP deposit/withdrawal** with animated stats and per-deposit interest withdrawal
- **Real-time, animated stats** and smooth background refreshes
- **Wallet connection** (MetaMask, WalletConnect, etc.)
- **Smart contract integration** via up-to-date ABIs
- **Modern, responsive UI** with loading skeletons and error handling

---

## 📁 Folder Structure
```
frontend/
├── src/
│   ├── app/                # Next.js app routes and pages
│   ├── components/         # Reusable React components (dashboard, tables, forms, etc.)
│   ├── hooks/              # Custom React hooks (contract calls, state, etc.)
│   ├── lib/
│   │   └── contracts/
│   │       └── abis/       # Smart contract ABIs (JSON)
│   └── public/             # Static assets
├── .env                    # Environment variables
├── package.json            # Project dependencies and scripts
├── eslint.config.mjs       # Linting rules
├── tsconfig.json           # TypeScript config
└── README.md               # This file
```

---

## ⚙️ Setup & Installation
1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-org/metrik.git
   cd metrik/frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in the required values (RPC URLs, contract addresses, etc.)

---

## 🏗️ Running & Developing
- **Start the dev server:**
  ```bash
  npm run dev
  # or
  bun run dev
  ```
  The app will be available at [http://localhost:3000](http://localhost:3000)

- **Build for production:**
  ```bash
  npm run build
  # or
  bun run build
  ```

- **Lint & format code:**
  ```bash
  npm run lint
  npm run format
  ```

---

## 🔗 Smart Contract ABIs
- All contract ABIs are stored in `src/lib/contracts/abis/`.
- **If you update or redeploy contracts:**
  1. Recompile your contracts (e.g., with Hardhat or Foundry).
  2. Copy the new ABI JSON files into `src/lib/contracts/abis/`.
  3. The frontend will automatically use the latest ABIs.

---

## 🛠️ Environment Variables
- `.env` contains all sensitive and environment-specific config.
- Typical variables:
  - `NEXT_PUBLIC_RPC_URL` — your Ethereum/Polygon/other RPC endpoint
  - `NEXT_PUBLIC_CONTRACT_ADDRESS_LENDINGPOOL` — deployed LendingPool contract address
  - `NEXT_PUBLIC_CONTRACT_ADDRESS_STAKING` — deployed Staking contract address
  - `NEXT_PUBLIC_INVOICE_NFT_ADDRESS` - deployed contract for NFTs
  - `NEXT_PUBLIC_METRIK_TOKEN_ADDRESS` - METRIK Token contract address
  - `NEXT_PUBLIC_STABLECOIN_ADDRESS` - StableCoin or Bitcoin wrapped token for testing (erc20)

---

## 🤝 Contributing
- **Open to PRs and issues!**
- Please follow the existing code style and naming conventions.
- Write clear commit messages and document any new features or changes.
- If you add new contract functions, update the ABI and document the change in this README.

---

## 💬 Support & Questions
- For help, open an issue or start a discussion on GitHub.
- For urgent questions, contact the core team via Discord or email.

---

## 📜 License
This project is licensed under the MIT License. See [LICENSE](../LICENSE) for details.

---

**Happy building with Metrik! 🚀**
