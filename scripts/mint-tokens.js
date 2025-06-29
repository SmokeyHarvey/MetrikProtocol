const { ethers } = require('ethers');
require('dotenv').config();

// Import ABIs
const MockERC20ABI = require('../src/lib/contracts/abis/MockERC20.json').abi;

// Configuration from environment variables
const RPC_URL = `https://api.avax-test.network/ext/bc/C/rpc`; // Avalanche Fuji testnet
const CHAIN_ID = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 43113;

// Contract addresses
const METRIK_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_METRIK_TOKEN_ADDRESS;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS;

// Owner private key
const OWNER_PRIVATE_KEY = process.env.PRIVATE_KEY_OWNER;

// Mint amounts (in wei - adjust as needed)
const METRIK_MINT_AMOUNT = ethers.utils.parseEther('10000000'); // 10 million METRIK tokens
const USDC_MINT_AMOUNT = ethers.utils.parseUnits('10000000', 6); // 10 million USDC (6 decimals)

async function mintTokens() {
  try {
    console.log('🚀 Starting token minting script...\n');

    // Validate environment variables
    if (!OWNER_PRIVATE_KEY) {
      throw new Error('OWNER_PRIVATE_KEY not found in environment variables');
    }
    if (!METRIK_TOKEN_ADDRESS) {
      throw new Error('NEXT_PUBLIC_METRIK_TOKEN_ADDRESS not found in environment variables');
    }
    if (!USDC_ADDRESS) {
      throw new Error('NEXT_PUBLIC_STABLECOIN_ADDRESS not found in environment variables');
    }

    // Setup provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
    const ownerAddress = wallet.address;

    console.log('📋 Configuration:');
    console.log(`   Network: Avalanche Fuji Testnet (Chain ID: ${CHAIN_ID})`);
    console.log(`   Owner Address: ${ownerAddress}`);
    console.log(`   METRIK Token: ${METRIK_TOKEN_ADDRESS}`);
    console.log(`   USDC Token: ${USDC_ADDRESS}`);
    console.log(`   METRIK Amount: ${ethers.utils.formatEther(METRIK_MINT_AMOUNT)} tokens`);
    console.log(`   USDC Amount: ${ethers.utils.formatUnits(USDC_MINT_AMOUNT, 6)} tokens\n`);

    // Create contract instances
    const metrikContract = new ethers.Contract(METRIK_TOKEN_ADDRESS, MockERC20ABI, wallet);
    const usdcContract = new ethers.Contract(USDC_ADDRESS, MockERC20ABI, wallet);

    // Check if owner has minting rights
    console.log('🔍 Checking minting permissions...');
    
    try {
      const metrikOwner = await metrikContract.owner();
      const usdcOwner = await usdcContract.owner();
      
      console.log(`   METRIK Token Owner: ${metrikOwner}`);
      console.log(`   USDC Token Owner: ${usdcOwner}`);
      
      if (metrikOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
        console.log('   ⚠️  Warning: Owner address is not the METRIK token owner');
      }
      if (usdcOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
        console.log('   ⚠️  Warning: Owner address is not the USDC token owner');
      }
    } catch (error) {
      console.log('   ⚠️  Could not verify token ownership (this is normal for some contracts)');
    }

    // Get current balances
    console.log('\n💰 Current balances:');
    try {
      const metrikBalance = await metrikContract.balanceOf(ownerAddress);
      const usdcBalance = await usdcContract.balanceOf(ownerAddress);
      
      console.log(`   METRIK: ${ethers.utils.formatEther(metrikBalance)} tokens`);
      console.log(`   USDC: ${ethers.utils.formatUnits(usdcBalance, 6)} tokens`);
    } catch (error) {
      console.log('   Could not fetch current balances');
    }

    // Mint METRIK tokens
    console.log('\n🪙 Minting METRIK tokens...');
    try {
      const metrikTx = await metrikContract.mint(ownerAddress, METRIK_MINT_AMOUNT);
      console.log(`   Transaction hash: ${metrikTx.hash}`);
      
      const metrikReceipt = await metrikTx.wait();
      console.log(`   ✅ METRIK minting successful! Gas used: ${metrikReceipt.gasUsed.toString()}`);
    } catch (error) {
      console.log(`   ❌ METRIK minting failed: ${error.message}`);
    }

    // Mint USDC tokens
    console.log('\n💵 Minting USDC tokens...');
    try {
      const usdcTx = await usdcContract.mint(ownerAddress, USDC_MINT_AMOUNT);
      console.log(`   Transaction hash: ${usdcTx.hash}`);
      
      const usdcReceipt = await usdcTx.wait();
      console.log(`   ✅ USDC minting successful! Gas used: ${usdcReceipt.gasUsed.toString()}`);
    } catch (error) {
      console.log(`   ❌ USDC minting failed: ${error.message}`);
    }

    // Get updated balances
    console.log('\n💰 Updated balances:');
    try {
      const newMetrikBalance = await metrikContract.balanceOf(ownerAddress);
      const newUsdcBalance = await usdcContract.balanceOf(ownerAddress);
      
      console.log(`   METRIK: ${ethers.utils.formatEther(newMetrikBalance)} tokens`);
      console.log(`   USDC: ${ethers.utils.formatUnits(newUsdcBalance, 6)} tokens`);
    } catch (error) {
      console.log('   Could not fetch updated balances');
    }

    console.log('\n🎉 Token minting script completed!');

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  mintTokens();
}

module.exports = { mintTokens }; 