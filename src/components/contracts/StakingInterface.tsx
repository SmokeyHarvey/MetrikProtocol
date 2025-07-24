'use client';

import { useState, useEffect } from 'react';
import { useWallets, useCreateWallet, usePrivy } from '@privy-io/react-auth';
import { ApprovalInfo } from '@/components/ui/ApprovalInfo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStaking } from '@/hooks/useStaking';
import { useSessionSigner } from '@/hooks/useSessionSigner';
import { useOneClickStaking } from '@/hooks/useOneClickStaking';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';
import { toast } from 'react-toastify';

export function StakingInterface() {
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { authenticated, ready } = usePrivy();
  
  // Find Privy embedded wallet
  const privyWallet = wallets.find(w => 
    w.walletClientType === 'privy' || 
    (w.meta && w.meta.id === 'io.privy.wallet') ||
    w.connectorType === 'embedded'
  );
  const address = privyWallet?.address;
  
  const {
    stake,
    unstake,
    currentTier,
    stakeDuration,
    isLoading,
    error,
    animatedStakedAmount,
    animatedRewards,
    animatedMetrikBalance,
  } = useStaking(address);
  
  // Session signer for seamless transactions
  const { executeSeamlessTransaction, encodeApproval, encodeStake } = useSessionSigner(wallets);
  
  // One-click staking hook
  const { executeOneClickStake, isExecuting } = useOneClickStaking(wallets);
  
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('45');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  // Auto-create wallet if user is authenticated but has no wallets
  useEffect(() => {
    const createWalletIfNeeded = async () => {
      // More robust check - don't create if we already have an address or if wallets exist
      if (ready && authenticated && !address && wallets.length === 0 && !isCreatingWallet) {
        console.log('🔄 No wallets found, creating embedded wallet...');
        console.log('📊 Pre-creation state:', {
          ready,
          authenticated,
          address,
          walletsLength: wallets.length,
          wallets: wallets.map(w => ({ address: w.address, type: w.walletClientType }))
        });
        
        setIsCreatingWallet(true);
        try {
          await createWallet();
          console.log('✅ Embedded wallet created successfully');
        } catch (error) {
          console.error('❌ Failed to create wallet:', error);
          // If error is about already having a wallet, that's actually fine
          if (error instanceof Error && error.message.includes('already has an embedded wallet')) {
            console.log('✅ Wallet already exists - this is expected');
          }
        } finally {
          setIsCreatingWallet(false);
        }
      } else {
        console.log('📝 Wallet creation skipped:', {
          ready,
          authenticated,
          hasAddress: !!address,
          walletsLength: wallets.length,
          isCreatingWallet
        });
      }
    };

    createWalletIfNeeded();
  }, [ready, authenticated, address, wallets.length, createWallet, isCreatingWallet]);

  // Debug wallet state changes
  useEffect(() => {
    console.log('🔄 StakingInterface wallet state changed:', {
      walletsLength: wallets?.length || 0,
      wallets: wallets?.map(w => ({
        address: w.address,
        type: w.walletClientType,
        connectorType: w.connectorType
      })) || [],
      privyWallet: !!privyWallet,
      address
    });
  }, [wallets, privyWallet, address]);

  const handleStake = async () => {
    if (!amount || !duration) return;
    
    // Ensure wallet exists before staking
    if (!privyWallet || !address) {
      console.log('⚠️ No wallet available');
      console.log('📊 Current wallet state:', {
        privyWallet: !!privyWallet,
        address,
        walletsLength: wallets.length,
        wallets: wallets.map(w => ({ address: w.address, type: w.walletClientType }))
      });
      
      toast.error('Please ensure your wallet is connected');
      return;
    }
    
    try {
      setIsStaking(true);
      
      // Use session signer for seamless staking
      const stakingContractAddress = CONTRACT_ADDRESSES.STAKING;
      const metrikTokenAddress = CONTRACT_ADDRESSES.METRIK_TOKEN;
      
      // Convert amount to BigInt properly
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      
      // Convert duration from DAYS to SECONDS (contract expects seconds)
      const durationInSeconds = BigInt(parseInt(duration) * 24 * 60 * 60);
      
      // Encode approval transaction
      const approvalData = encodeApproval(
        metrikTokenAddress,
        stakingContractAddress,
        amountInWei
      );
      
      // Encode staking transaction
      const stakeData = encodeStake(
        amountInWei,
        durationInSeconds
      );
      
      // Execute both transactions seamlessly
      await executeSeamlessTransaction(stakingContractAddress, approvalData);
      await executeSeamlessTransaction(stakingContractAddress, stakeData);
      
      setAmount('');
      setDuration('45');
    } catch (err) {
      console.error('Staking error:', err);
    } finally {
      setIsStaking(false);
    }
  };

  // One-click staking handler
  const handleOneClickStake = async () => {
    if (!amount || !duration) {
      toast.error('Please enter amount and duration');
      return;
    }

            // Check if user has enough METRIK balance
        const requiredAmount = parseFloat(amount);
        const currentBalance = parseFloat(String(animatedMetrikBalance));
    
    if (currentBalance < requiredAmount) {
      toast.error(
        `❌ Insufficient METRIK balance! 
        💰 Required: ${requiredAmount} METRIK
        💰 Available: ${currentBalance} METRIK
        💡 Go to Home page to claim more tokens from faucet`,
        { autoClose: 8000 }
      );
      return;
    }

    try {
      console.log('🚀 Initiating one-click stake:', { amount, duration });
      
      const result = await executeOneClickStake(amount, duration);
      
      if (result?.success) {
        console.log('✅ One-click staking successful!', result);
        
        // Clear form on success
        setAmount('');
        setDuration('');
        
        // Show success message with transaction details
        toast.success(`🎉 One-click staking completed successfully!`, {
          autoClose: 8000,
          onClick: () => {
            if (result.stakingHash) {
              window.open(`https://sepolia.etherscan.io/tx/${result.stakingHash}`, '_blank');
            }
          }
        });
      }
    } catch (error) {
      console.error('❌ One-click staking error:', error);
      toast.error('One-click staking failed. Please try again.');
    }
  };

  const handleUnstake = async () => {
    try {
      setIsUnstaking(true);
      await unstake();
    } catch (err) {
      console.error('Unstaking error:', err);
    } finally {
      setIsUnstaking(false);
    }
  };

  const getTierName = (tier: number) => {
    const names = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    return names[tier] || 'Unknown';
  };

  const getTierColor = (tier: number) => {
    const colors = ['text-orange-600', 'text-gray-600', 'text-yellow-600', 'text-blue-600', 'text-purple-600'];
    return colors[tier] || 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Wallet Status */}
      {isCreatingWallet && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Creating Wallet</h3>
              <div className="mt-1 text-sm text-blue-700">Please wait while we create your embedded wallet...</div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connection Status */}
      {ready && authenticated && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                {privyWallet ? 'Wallet Connected' : 'Authenticated'}
              </h3>
              <div className="mt-1 text-sm text-green-700">
                {privyWallet 
                  ? `Address: ${address?.slice(0, 6)}...${address?.slice(-4)}`
                  : `Wallets available: ${wallets.length}`
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Staking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">Current Stake</h3>
          <div className="flex items-center">
            <p className="text-2xl font-bold text-indigo-600 transition-all duration-300">
              {animatedStakedAmount} METRIK
            </p>
            {isLoading && (
              <div className="ml-2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          <p className="text-sm text-gray-500">Duration: {stakeDuration ? (stakeDuration / (24 * 60 * 60)) : 0} days</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">METRIK Balance</h3>
          <div className="flex items-center">
            <p className="text-2xl font-bold text-green-600 transition-all duration-300">
              {animatedMetrikBalance} METRIK
            </p>
            {isLoading && (
              <div className="ml-2 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          <p className="text-sm text-gray-500">Available for staking</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">Current Tier</h3>
          <div className="flex items-center">
            <p className={`text-2xl font-bold ${getTierColor(currentTier || 0)}`}>
              {getTierName(currentTier || 0)}
            </p>
            {isLoading && (
              <div className="ml-2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          <p className="text-sm text-gray-500">Tier {currentTier || 0} based on staked amount</p>
        </div>
      </div>

      {/* Staking Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Stake METRIK</span>
            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full font-normal">
              ⚡ Zero-Click Available
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* One-Click Benefits Info */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <h4 className="text-sm font-semibold text-green-900 mb-2">⚡ Why Use Seamless Staking?</h4>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• <strong>Zero-Click:</strong> No wallet confirmations or prompts</li>
              <li>• <strong>Instant:</strong> Backend handles all approvals automatically</li>
              <li>• <strong>Seamless:</strong> Approval + staking in complete background</li>
              <li>• <strong>Perfect UX:</strong> Users don't need to understand blockchain complexity</li>
            </ul>
          </div>

          <ApprovalInfo action="Stake" isVisible={true} />
          
          {/* Seamless Execution Progress */}
          {isExecuting && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-900">⚡ Seamless Execution in Progress</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Running approval + staking in background... No action needed from you!
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Step 1: Approval transaction submitted</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <span>Step 2: Waiting for blockchain confirmation (~8 seconds)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-600">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span>Step 3: Staking transaction (pending)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to Stake</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isStaking || isExecuting}
              />
              {amount && parseFloat(amount) > parseFloat(String(animatedMetrikBalance)) && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  ⚠️ Insufficient balance! You have {animatedMetrikBalance} METRIK available.
                  <br />
                  <a href="/" className="text-red-800 underline font-medium">
                    → Go to Home page to claim more tokens
                  </a>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="45"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={isStaking}
              />
            </div>
            
            {/* One-Click Staking (Primary Method) */}
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h4 className="text-sm font-semibold text-green-900 mb-2">🚀 Seamless Staking (Zero-Click Experience)</h4>
                <p className="text-xs text-green-700 mb-3">
                  ✨ Completely automated! Approval + staking happens in background with ZERO wallet prompts!
                </p>
                <Button
                  onClick={handleOneClickStake}
                  disabled={
                    isExecuting || 
                    isCreatingWallet || 
                    !amount || 
                    !duration || 
                    !authenticated || 
                    (!privyWallet && !isCreatingWallet)
                  }
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
                  size="lg"
                >
                  {isExecuting 
                    ? '⚡ Processing Seamlessly...' 
                    : isCreatingWallet 
                      ? 'Creating Wallet...' 
                      : !authenticated 
                        ? 'Please Login First'
                        : !privyWallet 
                          ? 'Wallet Required'
                          : `⚡ SEAMLESS STAKE ${amount ? `${amount} METRIK` : ''} (Zero-Click)`
                  }
                </Button>
              </div>

              {/* Advanced/Traditional Method */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 select-none">
                  ⚙️ Advanced: Manual Two-Step Staking (Old Method)
                </summary>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs text-gray-600 mb-3">
                    ⚠️ Traditional method with manual approval and staking transactions (requires wallet confirmations)
                  </p>
                  <Button
                    onClick={handleStake}
                    disabled={
                      isStaking || 
                      isCreatingWallet || 
                      !amount || 
                      !duration || 
                      !authenticated || 
                      (!privyWallet && !isCreatingWallet)
                    }
                    variant="outline"
                    className="w-full"
                  >
                    {isCreatingWallet 
                      ? 'Creating Wallet...' 
                      : isStaking 
                        ? 'Processing Traditional Stake...' 
                        : !authenticated 
                          ? 'Please Login First'
                          : !privyWallet 
                            ? 'Wallet Required'
                            : 'Traditional Stake (2 Steps)'
                    }
                  </Button>
                </div>
              </details>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unstaking Form */}
      <Card>
        <CardHeader>
          <CardTitle>Unstake METRIK</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleUnstake}
            disabled={isUnstaking}
            variant="outline"
            className="w-full"
          >
            {isUnstaking ? 'Unstaking...' : 'Unstake All'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 