'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useLendingPool, Tranche } from '@/hooks/useLendingPool';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { formatUnits } from 'viem';

export function LendingInterface() {
  const { address } = useAccount();
  const {
    repay,
    deposit,
    depositWithTranche,
    withdraw,
    withdrawByTranche,
    withdrawInterest,
    getLPInterest,
    getUserTotalLPDeposits,
    getUserLPDeposits,
    getLPTrancheBreakdown,
    checkIsRegisteredLP,
    getLPActiveDeposits,
    getAllRegisteredLPs,
    borrowedAmount,
    availableLiquidity,
    isLoading,
    error,
    // New state from updated hook
    userTotalDeposits,
    userDeposits,
    trancheBreakdown,
    isRegisteredLP,
    lpInterest,
    activeDeposits,
    allRegisteredLPs,
    withdrawJuniorInterest,
    withdrawSeniorInterest,
  } = useLendingPool();
  const { getFormattedBalance } = useTokenBalance();

  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedTranche, setSelectedTranche] = useState<Tranche>(Tranche.JUNIOR);
  const [lockupDuration, setLockupDuration] = useState<number>(30); // Default 30 days
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInterestTranche, setSelectedInterestTranche] = useState<Tranche>(Tranche.JUNIOR);
  const [isWithdrawingInterest, setIsWithdrawingInterest] = useState(false);
  const [showTrancheInfo, setShowTrancheInfo] = useState(false);

  // Fetch all LP data
  const fetchLPData = useCallback(async () => {
    if (!address) return;

    try {
      // Fetch all the new data
      await Promise.all([
        // These will update the state automatically through the hook
        getUserTotalLPDeposits(address),
        getUserLPDeposits(address),
        getLPTrancheBreakdown(address),
        checkIsRegisteredLP(address),
        getLPActiveDeposits(address),
        getAllRegisteredLPs(),
      ]);
    } catch (err) {
      console.error('Error fetching LP data:', err);
    }
  }, [address, getUserTotalLPDeposits, getUserLPDeposits, getLPTrancheBreakdown, checkIsRegisteredLP, getLPActiveDeposits, getAllRegisteredLPs]);

  useEffect(() => {
    fetchLPData();
  }, [fetchLPData]);

  const handleAction = async () => {
    console.log("Withdraw clicked", action, amount, selectedTranche);
    console.log("withdrawByTranche:", withdrawByTranche);
    setIsProcessing(true);
    try {
      if (action === 'deposit') {
        if (selectedTranche === Tranche.JUNIOR) {
          // Use default deposit for Junior tranche
          await deposit(amount);
        } else {
          // Use tranche-specific deposit for Senior tranche
          await depositWithTranche(amount, selectedTranche, lockupDuration);
        }
      } else if (action === 'withdraw') {
        console.log("Calling withdrawByTranche with", amount, selectedTranche);
        await withdrawByTranche(amount, selectedTranche);
        console.log("withdrawByTranche call finished");
      }
      setAmount('');
      fetchLPData();
    } catch (err) {
      console.error("Withdraw error:", err);
      // Error is handled in the hook
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawInterest = async () => {
    setIsWithdrawingInterest(true);
    try {
      if (selectedInterestTranche === Tranche.JUNIOR) {
        await withdrawJuniorInterest();
      } else {
        await withdrawSeniorInterest();
      }
      fetchLPData();
    } catch (err) {
      // Error is handled in the hook
    } finally {
      setIsWithdrawingInterest(false);
    }
  };

  const getTrancheName = (tranche: Tranche) => {
    return tranche === Tranche.JUNIOR ? 'Flexible Lending' : 'Fixed Lending';
  };

  const getTrancheAPY = (tranche: Tranche) => {
    return tranche === Tranche.JUNIOR ? '12% APY' : '7% APY';
  };

  const getTrancheDescription = (tranche: Tranche) => {
    return tranche === Tranche.JUNIOR 
      ? 'Higher risk, higher returns. First to absorb losses.'
      : 'Lower risk, stable returns. Protected by Junior tranche.';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-8 mb-8">
        <h2 className="text-2xl font-bold mb-8">Lending Pool</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-gray-50 rounded-lg shadow p-6 flex flex-col items-center justify-center min-h-[120px]">
            <span className="text-gray-500 text-base mb-1">Your USDC Balance</span>
            <span className="text-xl font-bold">{getFormattedBalance('usdc')} USDC</span>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-6 flex flex-col items-center justify-center min-h-[120px]">
            <span className="text-gray-500 text-base mb-1">Total LP Deposits</span>
            <span className="text-xl font-bold">{userTotalDeposits} USDC</span>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-6 flex flex-col items-center justify-center min-h-[120px]">
            <span className="text-gray-500 text-base mb-1">Available Liquidity</span>
            <span className="text-xl font-bold">{availableLiquidity} USDC</span>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-6 flex flex-col items-center justify-center min-h-[120px]">
            <span className="text-gray-500 text-base mb-1">Registered LPs</span>
            <span className="text-xl font-bold">{allRegisteredLPs ? allRegisteredLPs.length : 0}</span>
          </div>
        </div>
      </div>
      {/* Earned Interest and Controls Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center min-h-[120px]">
          <span className="text-gray-500 text-base mb-1">Earned Interest</span>
          <span className="text-xl font-bold">{lpInterest} USDC</span>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center min-h-[120px]">
          <label htmlFor="tranche-select" className="mb-2 text-gray-700 font-medium">Lending Type</label>
          <select
            id="tranche-select"
            value={selectedInterestTranche}
            onChange={e => setSelectedInterestTranche(Number(e.target.value))}
            className="rounded-md border-gray-300 px-3 py-2 text-base text-black focus:ring-2 focus:ring-purple-400 mb-4"
            disabled={isWithdrawingInterest}
          >
            <option value={Tranche.JUNIOR}>Flexible Lending (12% APY)</option>
            <option value={Tranche.SENIOR}>Fixed Lending (7% APY)</option>
          </select>
          <button
            onClick={handleWithdrawInterest}
            disabled={isWithdrawingInterest || lpInterest === '0'}
            className="bg-purple-400 text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {isWithdrawingInterest ? 'Withdrawing...' : 'Withdraw Interest'}
          </button>
        </div>
      </div>
      {/* Lending Breakdown */}
      {/* REMOVE the Lending Breakdown section */}

        {/* Tranche Breakdown */}
        {/* Action Tabs */}
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setAction('deposit')}
            className={`flex-1 py-2 px-4 rounded-md ${
              action === 'deposit'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setAction('withdraw')}
            className={`flex-1 py-2 px-4 rounded-md ${
              action === 'withdraw'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Withdraw
          </button>
        </div>

        {/* Deposit Form with Tranche Selection */}
        {action === 'deposit' && (
          <div className="space-y-4">
            {/* Tranche Selection */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                Select Lending Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedTranche(Tranche.JUNIOR)}
                  className={`p-6 rounded-xl border-2 transition-all w-full text-left flex flex-col justify-center min-h-[120px] ${
                    selectedTranche === Tranche.JUNIOR
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">Flexible Lending <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">12% APY</span></h4>
                    <p className="text-sm text-gray-600">Higher risk, higher returns</p>
                    <p className="text-xs text-gray-500 mt-1">No lockup, first to absorb losses</p>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedTranche(Tranche.SENIOR)}
                  className={`p-6 rounded-xl border-2 transition-all w-full text-left flex flex-col justify-center min-h-[120px] ${
                    selectedTranche === Tranche.SENIOR
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">Fixed Lending <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">7% APY</span></h4>
                    <p className="text-sm text-gray-600">Lower risk, stable returns</p>
                    <p className="text-xs text-gray-500 mt-1">Lockup required, protected by Flexible Lending</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Lockup Duration for Fixed Lending */}
            {selectedTranche === Tranche.SENIOR && (
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  Lockup Duration (days)
                </label>
                <select
                  value={lockupDuration}
                  onChange={(e) => setLockupDuration(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base px-2 py-3 text-black"
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>365 days</option>
                </select>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="block text-base font-semibold text-gray-700">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base px-2 py-3 text-black"
                placeholder={`Enter amount to deposit in ${getTrancheName(selectedTranche)}`}
              />
            </div>
          </div>
        )}

        {/* Withdraw Form */}
        {action === 'withdraw' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (USDC)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-3 text-black"
              placeholder="Enter amount to withdraw"
            />
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleAction}
          className="w-full inline-flex justify-center rounded-xl border border-transparent bg-indigo-600 py-3 px-4 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mt-4"
          disabled={isProcessing || !amount}
        >
          {isProcessing
            ? 'Processing...'
            : action === 'deposit'
              ? `Deposit to ${getTrancheName(selectedTranche)}`
              : `Withdraw from ${getTrancheName(selectedTranche)}`}
        </button>

        {/* Error Display */}
        {error && (
          <div className="text-red-600 text-sm mt-2">
            {error.message}
          </div>
        )}

        {/* Active Deposits Display */}
        {activeDeposits && activeDeposits.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Active Deposits</h3>
            <div className="space-y-2">
              {activeDeposits.map((deposit, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold text-lg text-gray-900">
                      {formatUnits(deposit.amount, 6)} USDC
                    </p>
                    <p className="text-base text-gray-700">
                      {getTrancheName(deposit.tranche)}
                    </p>
                  </div>
                  <div className="text-right mt-2 md:mt-0">
                    <p className="text-base text-gray-600">
                      Lockup: {Number(deposit.lockupDuration)} days
                    </p>
                    <p className="text-xs text-gray-500">
                      ID: {deposit.depositId.toString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
} 