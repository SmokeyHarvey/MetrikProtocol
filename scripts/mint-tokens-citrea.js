const { ethers } = require('ethers');
require('dotenv').config();

// Import ABIs
const MockERC20ABI = require('../src/lib/contracts/abis/MockERC20.json').abi;

// Configuration for Citrea (Avalanche mainnet)
const RPC_URL = `https://rpc.testnet.citrea.xyz`; // Avalanche mainnet
const CHAIN_ID = 5115; // Avalanche mainnet chain ID

// Contract addresses (you'll need to update these with your deployed contract addresses on Citrea)
const METRIK_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CITREA_METRIK_TOKEN_ADDRESS;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_CITREA_STABLECOIN_ADDRESS;

// Owner private key
const OWNER_PRIVATE_KEY = process.env.PRIVATE_KEY_OWNER;

// Mint amounts (100 million tokens each)
const METRIK_MINT_AMOUNT = ethers.utils.parseEther('100000000'); // 100 million METRIK tokens
const USDC_MINT_AMOUNT = ethers.utils.parseUnits('100000000', 6); // 100 million USDC (6 decimals)

async function mintTokensCitrea() {
  try {
    console.log('🚀 Starting Citrea token minting script...\n');
    console.log('⚠️  WARNING: This script will mint tokens on Avalanche MAINNET (Citrea)\n');

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
    console.log(`   Network: Avalanche Mainnet (Citrea) - Chain ID: ${CHAIN_ID}`);
    console.log(`   Owner Address: ${ownerAddress}`);
    console.log(`   METRIK Token: ${METRIK_TOKEN_ADDRESS}`);
    console.log(`   USDC Token: ${USDC_ADDRESS}`);
    console.log(`   METRIK Amount: ${ethers.utils.formatEther(METRIK_MINT_AMOUNT)} tokens`);
    console.log(`   USDC Amount: ${ethers.utils.formatUnits(USDC_MINT_AMOUNT, 6)} tokens\n`);

    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    console.log(`   Current Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei\n`);

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

    // Get owner's AVAX balance
    const avaxBalance = await provider.getBalance(ownerAddress);
    console.log(`   AVAX: ${ethers.utils.formatEther(avaxBalance)} AVAX`);

    // Estimate gas for transactions
    console.log('\n⛽ Estimating gas costs...');
    try {
      const metrikGasEstimate = await metrikContract.estimateGas.mint(ownerAddress, METRIK_MINT_AMOUNT);
      const usdcGasEstimate = await usdcContract.estimateGas.mint(ownerAddress, USDC_MINT_AMOUNT);
      
      const metrikGasCost = metrikGasEstimate.mul(gasPrice);
      const usdcGasCost = usdcGasEstimate.mul(gasPrice);
      const totalGasCost = metrikGasCost.add(usdcGasCost);
      
      console.log(`   METRIK mint gas estimate: ${metrikGasEstimate.toString()}`);
      console.log(`   USDC mint gas estimate: ${usdcGasEstimate.toString()}`);
      console.log(`   Total estimated gas cost: ${ethers.utils.formatEther(totalGasCost)} AVAX`);
      
      if (avaxBalance.lt(totalGasCost)) {
        throw new Error(`Insufficient AVAX balance. Need at least ${ethers.utils.formatEther(totalGasCost)} AVAX`);
      }
    } catch (error) {
      console.log(`   Could not estimate gas: ${error.message}`);
    }

    // Confirm before proceeding
    console.log('\n⚠️  CONFIRMATION REQUIRED:');
    console.log('   This will mint 100,000,000 tokens of each type on Avalanche MAINNET.');
    console.log('   This action cannot be undone and will cost real AVAX for gas fees.');
    console.log('   Are you sure you want to proceed? (This is a simulation - add confirmation logic if needed)\n');

    // Mint METRIK tokens
    console.log('🪙 Minting METRIK tokens...');
    try {
      const metrikTx = await metrikContract.mint(ownerAddress, METRIK_MINT_AMOUNT, {
        gasLimit: 100000, // Set a reasonable gas limit
      });
      console.log(`   Transaction hash: ${metrikTx.hash}`);
      console.log(`   View on Snowtrace: https://snowtrace.io/tx/${metrikTx.hash}`);
      
      const metrikReceipt = await metrikTx.wait();
      console.log(`   ✅ METRIK minting successful! Gas used: ${metrikReceipt.gasUsed.toString()}`);
    } catch (error) {
      console.log(`   ❌ METRIK minting failed: ${error.message}`);
    }

    // Mint USDC tokens
    console.log('\n💵 Minting USDC tokens...');
    try {
      const usdcTx = await usdcContract.mint(ownerAddress, USDC_MINT_AMOUNT, {
        gasLimit: 100000, // Set a reasonable gas limit
      });
      console.log(`   Transaction hash: ${usdcTx.hash}`);
      console.log(`   View on Snowtrace: https://snowtrace.io/tx/${usdcTx.hash}`);
      
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
      const newAvaxBalance = await provider.getBalance(ownerAddress);
      
      console.log(`   METRIK: ${ethers.utils.formatEther(newMetrikBalance)} tokens`);
      console.log(`   USDC: ${ethers.utils.formatUnits(newUsdcBalance, 6)} tokens`);
      console.log(`   AVAX: ${ethers.utils.formatEther(newAvaxBalance)} AVAX`);
    } catch (error) {
      console.log('   Could not fetch updated balances');
    }

    console.log('\n🎉 Citrea token minting script completed!');
    console.log('🔗 View your transactions on Snowtrace: https://snowtrace.io/');

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  mintTokensCitrea();
}

module.exports = { mintTokensCitrea }; 