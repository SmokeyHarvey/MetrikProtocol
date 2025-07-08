import { JsonRpcProvider, Wallet, Contract, parseUnits } from "ethers";
import * as dotenv from "dotenv";
import metrikAbi from "../src/lib/contracts/abis/MockERC20.json";

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY_OWNER!;
const METRIK_ADDRESS = process.env.NEXT_PUBLIC_METRIK_TOKEN_ADDRESS!;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS!;
const FAUCET_ADDRESS = "0x047B41c1E11331f7C8BB8Cc2343b34Ec1336772D";

// Set the amount to mint and approve (as string, e.g., "1000000")
const METRIK_AMOUNT = "1000000";
const USDC_AMOUNT = "1000000";

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  // Mint METRIK
  const metrik = new Contract(METRIK_ADDRESS, metrikAbi.abi, wallet);
  const metrikDecimals = 18;
  const metrikAmount = parseUnits(METRIK_AMOUNT, metrikDecimals);
  console.log(`Minting ${METRIK_AMOUNT} METRIK to ${wallet.address}...`);
  let tx = await metrik.mint(wallet.address, metrikAmount);
  await tx.wait();
  console.log(`Minted METRIK. Tx: ${tx.hash}`);

  // Approve METRIK to Faucet (full 1,000,000 METRIK)
  console.log(`Approving Faucet to spend ${METRIK_AMOUNT} METRIK...`);
  tx = await metrik.approve(FAUCET_ADDRESS, metrikAmount);
  await tx.wait();
  console.log(`Approved METRIK. Tx: ${tx.hash}`);

  // Mint USDC
  const usdc = new Contract(USDC_ADDRESS, metrikAbi.abi, wallet);
  const usdcDecimals = 6;
  const usdcAmount = parseUnits(USDC_AMOUNT, usdcDecimals);
  console.log(`Minting ${USDC_AMOUNT} USDC to ${wallet.address}...`);
  tx = await usdc.mint(wallet.address, usdcAmount);
  await tx.wait();
  console.log(`Minted USDC. Tx: ${tx.hash}`);

  // Approve USDC to Faucet (full 1,000,000 USDC)
  console.log(`Approving Faucet to spend ${USDC_AMOUNT} USDC...`);
  tx = await usdc.approve(FAUCET_ADDRESS, usdcAmount);
  await tx.wait();
  console.log(`Approved USDC. Tx: ${tx.hash}`);

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 