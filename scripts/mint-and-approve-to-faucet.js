const { JsonRpcProvider, Wallet, Contract, parseUnits } = require('ethers');
const dotenv = require('dotenv');

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY_OWNER;
const METRIK_ADDRESS = process.env.NEXT_PUBLIC_CITREA_METRIK_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_METRIK_TOKEN_ADDRESS;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_CITREA_STABLECOIN_ADDRESS || process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS;
const FAUCET_ADDRESS = process.env.NEXT_PUBLIC_FAUCET_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !METRIK_ADDRESS || !USDC_ADDRESS || !FAUCET_ADDRESS) {
  console.error('Missing env. Require NEXT_PUBLIC_RPC_URL, PRIVATE_KEY_OWNER, METRIK & USDC & NEXT_PUBLIC_FAUCET_ADDRESS');
  process.exit(1);
}

const erc20Abi = require('../src/lib/contracts/abis/MockERC20.json').abi;
const faucetAbi = require('../src/lib/contracts/abis/Faucet.json');

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  console.log('Owner:', wallet.address);

  // Mint METRIK
  const metrik = new Contract(METRIK_ADDRESS, erc20Abi, wallet);
  const metrikAmount = parseUnits('9999000000', 18); // 1,000,000 METRIK
  console.log('Minting METRIK...');
  let tx = await metrik.mint(wallet.address, metrikAmount);
  await tx.wait();
  console.log('Minted METRIK:', tx.hash);

  // Approve + Deposit METRIK to Faucet
  console.log('Approving Faucet for METRIK...');
  tx = await metrik.approve(FAUCET_ADDRESS, metrikAmount);
  await tx.wait();
  console.log('Approved METRIK');

  const faucet = new Contract(FAUCET_ADDRESS, faucetAbi, wallet);
  console.log('Depositing METRIK to Faucet...');
  tx = await faucet.deposit(METRIK_ADDRESS, metrikAmount);
  await tx.wait();
  console.log('Deposited METRIK to Faucet:', tx.hash);

  // Mint USDC
  const usdc = new Contract(USDC_ADDRESS, erc20Abi, wallet);
  const usdcAmount = parseUnits('9999000000', 6); // 1,000,000 USDC
  console.log('Minting USDC...');
  tx = await usdc.mint(wallet.address, usdcAmount);
  await tx.wait();
  console.log('Minted USDC:', tx.hash);

  // Approve + Deposit USDC to Faucet
  console.log('Approving Faucet for USDC...');
  tx = await usdc.approve(FAUCET_ADDRESS, usdcAmount);
  await tx.wait();
  console.log('Approved USDC');

  console.log('Depositing USDC to Faucet...');
  tx = await faucet.deposit(USDC_ADDRESS, usdcAmount);
  await tx.wait();
  console.log('Deposited USDC to Faucet:', tx.hash);

  console.log('Done. Faucet funded with METRIK and USDC.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
