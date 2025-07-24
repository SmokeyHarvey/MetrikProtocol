'use client';

import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { ApprovalInfo } from '@/components/ui/ApprovalInfo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStaking } from '@/hooks/useStaking';
import { useSessionSigner } from '@/hooks/useSessionSigner';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';

export function StakingInterface() {
  const { wallets } = useWallets();
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
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
  const { executeSeamlessTransaction, encodeApproval, encodeStake } = useSessionSigner();
  
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('45');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);

  const handleStake = async () => {
    if (!amount || !duration) return;
    
    try {
      setIsStaking(true);
      
      // Use session signer for seamless staking
      const stakingContractAddress = CONTRACT_ADDRESSES.STAKING;
      const metrikTokenAddress = CONTRACT_ADDRESSES.METRIK_TOKEN;
      
      // Convert amount to BigInt properly
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      
      // Encode approval transaction
      const approvalData = encodeApproval(
        metrikTokenAddress,
        stakingContractAddress,
        amountInWei
      );
      
      // Encode staking transaction
      const stakeData = encodeStake(
        amountInWei,
        BigInt(duration)
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
          <CardTitle>Stake METRIK</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApprovalInfo action="Stake" isVisible={true} />
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to Stake</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isStaking}
              />
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
            
            <Button
              onClick={handleStake}
              disabled={isStaking || !amount || !duration}
              className="w-full"
            >
              {isStaking ? 'Staking...' : 'Stake METRIK'}
            </Button>
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