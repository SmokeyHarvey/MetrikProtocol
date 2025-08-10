'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStaking } from '@/hooks/useStaking';
import { toast } from 'react-toastify';
import { parseAmount, formatAmount } from '@/lib/utils/contracts';
import { encodeFunctionData, parseUnits } from 'viem';
import { type Hash } from 'viem';
import faucetAbi from '@/lib/contracts/abis/Faucet.json';

export function VerifierStakingInterface() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const {
    stakedAmount,
    metrikBalance,
    currentTier,
    isLoading,
    error,
    stake,
    fetchStakedInfo,
  } = useStaking(address);
  
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('45'); // Default to 45 days
  const [isStaking, setIsStaking] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const METRIK_ADDRESS = process.env.NEXT_PUBLIC_METRIK_TOKEN_ADDRESS!;
  const FAUCET_ADDRESS = process.env.NEXT_PUBLIC_FAUCET_ADDRESS!;

  // Refresh data when address changes
  useEffect(() => {
    if (address) {
      fetchStakedInfo();
    }
  }, [address, fetchStakedInfo]);

  const handleStake = async () => {
    if (!amount || !duration) {
      toast.error('Please enter amount and duration');
      return;
    }

    if (!address) {
      toast.error('Please connect your MetaMask wallet');
      return;
    }

    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected. Please ensure MetaMask is connected.');
      return;
    }

    // Check if user has enough METRIK balance
    const requiredAmount = parseFloat(amount);
    const currentBalance = parseFloat(metrikBalance || '0');

    if (currentBalance < requiredAmount) {
      toast.error(
        `Insufficient METRIK balance! Required: ${requiredAmount} METRIK, Available: ${currentBalance} METRIK`
      );
      return;
    }

    setIsStaking(true);
    try {
      const durationInDays = parseInt(duration);
      await stake(amount, durationInDays);
      toast.success('Staking successful!');
      
      // Refresh data
      fetchStakedInfo();
      
      // Clear form
      setAmount('');
    } catch (err) {
      console.error('Staking error:', err);
      toast.error('Staking failed. Please try again.');
    } finally {
      setIsStaking(false);
    }
  };

  const handleMintMetrik = async () => {
    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!address) {
      toast.error('Please connect your MetaMask wallet');
      return;
    }

    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected. Please ensure MetaMask is connected.');
      return;
    }

    setIsMinting(true);
    try {
      const decimals = 18;
      const amt = BigInt(parseUnits(mintAmount, decimals).toString());
      
      // Simulate the transaction first
      const { request } = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: FAUCET_ADDRESS as `0x${string}`,
        abi: faucetAbi,
        functionName: 'claim',
        args: [METRIK_ADDRESS as `0x${string}`, amt],
      });

      // Execute the transaction
      const hash = await walletClient.writeContract(request);
      
      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      
      toast.success(`Minted ${mintAmount} METRIK to your wallet! Transaction: ${hash}`);
      
      // Refresh balance
      fetchStakedInfo();
      
      // Clear form
      setMintAmount('');
    } catch (err) {
      console.error('Minting error:', err);
      toast.error('Minting failed. Please try again.');
    } finally {
      setIsMinting(false);
    }
  };

  const getTierName = (tier: number) => {
    switch (tier) {
      case 0: return 'None';
      case 1: return 'Bronze';
      case 2: return 'Silver';
      case 3: return 'Gold';
      case 4: return 'Diamond';
      default: return 'Unknown';
    }
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 0: return 'bg-gray-100 text-gray-800';
      case 1: return 'bg-amber-100 text-amber-800';
      case 2: return 'bg-gray-100 text-gray-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect MetaMask</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Please connect your MetaMask wallet to stake METRIK tokens and become a verifier.
          </p>
          <Button disabled className="w-full">
            Connect MetaMask First
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600">METRIK Balance</div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : metrikBalance || '0'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Staked Amount</div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stakedAmount || '0'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Current Tier</div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : getTierName(currentTier)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staking Form */}
      <Card>
        <CardHeader>
          <CardTitle>Stake METRIK Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to Stake (METRIK)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="duration">Staking Duration (Days)</Label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="45">45 Days (1% APY)</option>
                <option value="90">90 Days (2% APY)</option>
                <option value="180">180 Days (4% APY)</option>
                <option value="365">365 Days (8% APY)</option>
              </select>
            </div>

            <Button
              onClick={handleStake}
              disabled={isStaking || isLoading || !amount || !duration}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isStaking ? 'Staking...' : 'Stake Tokens'}
            </Button>

            {error && (
              <div className="text-red-600 text-sm">
                Error: {error.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Staking Info */}
      <Card>
        <CardHeader>
          <CardTitle>Staking Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Connected Wallet:</span>
              <span className="font-mono text-gray-600">
                {address.slice(0, 8)}...{address.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Current Tier:</span>
              <span className={`px-2 py-1 rounded text-xs ${getTierColor(currentTier)}`}>
                {getTierName(currentTier)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Staked:</span>
              <span className="font-mono">{stakedAmount || '0'} METRIK</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mint METRIK Section */}
      <Card>
        <CardHeader>
          <CardTitle>Faucet: Mint METRIK Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="mintAmount">Amount to Mint (METRIK)</Label>
              <Input
                id="mintAmount"
                type="number"
                placeholder="Enter amount"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                min="0"
                step="0.01"
                disabled={isMinting}
              />
            </div>

            <Button
              onClick={handleMintMetrik}
              disabled={isMinting || !address || !mintAmount || parseFloat(mintAmount) <= 0}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isMinting ? 'Minting...' : 'Mint METRIK Tokens'}
            </Button>

            <p className="text-xs text-gray-500">
              You can mint any amount of METRIK tokens to your wallet for testing purposes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
