'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';

export function StakingInterface() {
  const {
    stake,
    unstake,
    getTier,
    getStakedAmount,
    getActiveStakes,
    getStakeUsage,
    currentTier,
    stakeDuration,
    isLoading,
    error,
    animatedStakedAmount,
    animatedRewards,
    animatedMetrikBalance,
    // New state from updated hook
    activeStakes,
    stakeUsage,
    totalStakedAmount,
  } = useStaking();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('45');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);

  const handleStake = async () => {
    try {
      setIsStaking(true);
      await stake(amount, Number(duration));
      setAmount('');
      setDuration('45');
    } catch (err) {
      // Error is handled in the hook
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    try {
      setIsUnstaking(true);
      await unstake();
    } catch (err) {
      // Error is handled in the hook
    } finally {
      setIsUnstaking(false);
    }
  };

  const getTierName = (tier: number) => {
    const tierNames = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Platinum'];
    return tierNames[tier] || `Tier ${tier}`;
  };

  const getTierColor = (tier: number) => {
    const colors = ['text-orange-600', 'text-gray-600', 'text-yellow-600', 'text-blue-600', 'text-purple-600'];
    return colors[tier] || 'text-gray-600';
  };

  return (
    <div className="p-4">
      <h2 className="text-xl text-black font-bold mb-4">Stake METRIK Tokens</h2>

      {/* Staking Info Tables in a techy card layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StakingInfoTable />
        <TierInfoTable />
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

      {/* METRIK Balance */}
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-medium text-gray-900">METRIK Balance</h3>
        <div className="flex items-center">
          <p className="text-2xl font-bold text-green-600 transition-all duration-300">
            {animatedMetrikBalance} METRIK
          </p>
          {isLoading && (
            <div className="ml-2 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
      </div>

      {/* Active Stakes Display */}
      {activeStakes && activeStakes.length > 0 && (
        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Active Stakes</h3>
          <div className="space-y-10">
            {activeStakes.map((stake, index) => (
              <div key={index}>
                {/* Main Stake Info Card */}
                <div className="bg-white p-6 rounded-lg border flex flex-col md:flex-row md:items-center gap-6 mb-6 shadow-sm">
                  <div className="flex flex-col justify-between min-w-[180px] md:w-1/5">
                    <p className="font-medium text-gray-900 text-3xl mb-2">{formatUnits(stake.amount, 18)} METRIK</p>
                    <div className={`px-2 py-1 rounded-full text-xs inline-block w-fit ${stake.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{stake.isActive ? 'Active' : 'Inactive'}</div>
                    <p className="text-xs text-gray-400 mt-2">ID: {stake.stakeId.toString()}</p>
                  </div>
                </div>
                {/* Stat Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-blue-700 font-semibold mb-1">APY</span>
                    <span className="text-2xl font-bold text-blue-900">{Number(stake.apy) / 100}%</span>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-yellow-700 font-semibold mb-1">Multiplier</span>
                    <span className="text-2xl font-bold text-yellow-900">{Number(stake.multiplier) / 100}x</span>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-indigo-700 font-semibold mb-1">Duration</span>
                    <span className="text-2xl font-bold text-indigo-900">{Number(stake.duration) / (24 * 60 * 60)} days</span>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-green-700 font-semibold mb-1">Claimed Reward</span>
                    <span className="text-2xl font-bold text-green-900">{stake.rewardDebt ? (Number(stake.rewardDebt) / 1e18).toFixed(4) : '0.0000'} METRIK</span>
                  </div>
                  <div className="bg-purple-100 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-purple-700 font-semibold mb-1">Pending Reward</span>
                    <span className="text-2xl font-bold text-purple-900">{stake.pendingReward ? (Number(stake.pendingReward) / 1e18).toFixed(4) : '0.0000'} METRIK</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staking Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black px-2 py-3"
            placeholder="Enter amount to stake"
            disabled={isStaking || isUnstaking}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Duration (days)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black px-2 py-3"
            disabled={isStaking || isUnstaking}
          >
            <option value="45">45</option>
            <option value="90">90</option>
            <option value="180">180</option>
            <option value="365">365</option>
          </select>
        </div>
        {/* Show APY for selected duration */}
        <ShowAPY duration={duration} />
        <div className="flex space-x-4">
          <button
            onClick={handleStake}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isStaking || isUnstaking || !amount || !duration}
          >
            {isStaking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Staking...
              </>
            ) : (
              'Stake'
            )}
          </button>
          <button
            onClick={handleUnstake}
            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isStaking || isUnstaking}
          >
            {isUnstaking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Unstaking...
              </>
            ) : (
              'Unstake'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState as useReactState } from 'react';
import { useStaking } from '@/hooks/useStaking';
import { CheckCircleIcon, StarIcon, TrophyIcon } from '@heroicons/react/24/solid';

function ShowAPY({ duration }: { duration: string }) {
  const { getAPYForDuration } = useStaking();
  const [apy, setApy] = useReactState<number | null>(null);
  useEffect(() => {
    getAPYForDuration(Number(duration)).then(setApy);
  }, [duration, getAPYForDuration]);
  return (
    <div className="text-sm text-gray-700 mb-2">
      APY for selected duration: {apy !== null ? `${apy}%` : '...'}
    </div>
  );
}

function StakingInfoTable() {
  const { getAPYForDuration } = useStaking();
  const [info, setInfo] = useReactState<{
    days: number;
    apy: number | null;
    multiplier: number | null;
    points: number | null;
  }[]>([
    { days: 45, apy: null, multiplier: null, points: null },
    { days: 90, apy: null, multiplier: null, points: null },
    { days: 180, apy: null, multiplier: null, points: null },
    { days: 365, apy: null, multiplier: null, points: null },
  ]);
  useEffect(() => {
    async function fetchInfo() {
      const updated = await Promise.all(
        info.map(async (row) => {
          const apy = await getAPYForDuration(row.days * 24 * 60 * 60);
          let multiplier = 0;
          let points = 0;
          if (row.days === 45) { multiplier = 0.1; points = 1; }
          if (row.days === 90) { multiplier = 0.25; points = 2; }
          if (row.days === 180) { multiplier = 0.5; points = 4; }
          if (row.days === 365) { multiplier = 1; points = 8; }
          return { ...row, apy, multiplier, points };
        })
      );
      setInfo(updated);
    }
    fetchInfo();
    // eslint-disable-next-line
  }, []);
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-gray-700">Staking Rewards Table</span>
      </h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm rounded-lg border border-gray-100">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="px-3 py-2 border-b border-gray-200 font-medium">Duration (days)</th>
              <th className="px-3 py-2 border-b border-gray-200 font-medium">APY</th>
              <th className="px-3 py-2 border-b border-gray-200 font-medium">Multiplier</th>
              <th className="px-3 py-2 border-b border-gray-200 font-medium">Points per 1 METRIK</th>
            </tr>
          </thead>
          <tbody>
            {info.map((row) => (
              <tr key={row.days} className="hover:bg-gray-50 transition">
                <td className="px-3 py-2 text-center text-gray-900">{row.days}</td>
                <td className="px-3 py-2 text-center text-gray-700">{row.apy !== null ? `${row.apy}%` : '...'}</td>
                <td className="px-3 py-2 text-center text-gray-700">{row.multiplier !== null ? `${row.multiplier}x` : '...'}</td>
                <td className="px-3 py-2 text-center text-gray-700">{row.points !== null ? row.points : '...'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TierInfoTable() {
  // Example static tier data, update as needed
  const tiers = [
    { name: 'Bronze', icon: <CheckCircleIcon className="h-5 w-5 text-gray-400" />, required: '0', perks: 'Basic access' },
    { name: 'Silver', icon: <CheckCircleIcon className="h-5 w-5 text-gray-400" />, required: '1,000', perks: 'Lower fees' },
    { name: 'Gold', icon: <TrophyIcon className="h-5 w-5 text-yellow-500" />, required: '5,000', perks: 'Priority support' },
    { name: 'Diamond', icon: <StarIcon className="h-5 w-5 text-blue-400" />, required: '10,000', perks: 'VIP rewards' },
    { name: 'Platinum', icon: <StarIcon className="h-5 w-5 text-purple-400" />, required: '50,000', perks: 'All perks' },
  ];
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-gray-700">Tier Table</span>
      </h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm rounded-lg border border-gray-100">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="px-3 py-2 border-b border-gray-200 font-medium">Tier</th>
              <th className="px-3 py-2 border-b border-gray-200 font-medium">Required Stake</th>
              <th className="px-3 py-2 border-b border-gray-200 font-medium">Perks</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.name} className="hover:bg-gray-50 transition">
                <td className="px-3 py-2 text-center font-medium flex items-center gap-2 justify-center text-gray-900">{tier.icon}{tier.name}</td>
                <td className="px-3 py-2 text-center text-gray-700">{tier.required} METRIK</td>
                <td className="px-3 py-2 text-center text-gray-700">{tier.perks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 