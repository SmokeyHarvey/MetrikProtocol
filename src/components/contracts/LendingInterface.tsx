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
    return tranche === Tranche.JUNIOR ? 'Junior' : 'Senior';
  };

  const getTrancheDescription = (tranche: Tranche) => {
    return tranche === Tranche.JUNIOR 
      ? 'Higher risk, higher returns. First to absorb losses.'
      : 'Lower risk, stable returns. Protected by Junior tranche.';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl text-black font-bold mb-4">Lending Pool</h2>
        
        {/* User Balance and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Your USDC Balance</h3>
            <p className="text-2xl text-black font-bold">{getFormattedBalance('usdc')} USDC</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">Total LP Deposits</h3>
            <p className="text-2xl text-black font-bold">{userTotalDeposits} USDC</p>
          </div>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Available Liquidity</h3>
            <p className="text-2xl text-black font-bold">{availableLiquidity} USDC</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">Earned Interest</h3>
            <p className="text-2xl text-black font-bold">{lpInterest} USDC</p>
            <div className="flex items-center gap-2 mt-2">
              <select
                value={selectedInterestTranche}
                onChange={e => setSelectedInterestTranche(Number(e.target.value))}
                className="rounded-md border-gray-300 px-2 py-1 text-sm text-black"
                disabled={isWithdrawingInterest}
              >
                <option value={Tranche.JUNIOR}>Junior Tranche</option>
                <option value={Tranche.SENIOR}>Senior Tranche</option>
              </select>
              <button
                onClick={handleWithdrawInterest}
                disabled={isWithdrawingInterest || lpInterest === '0'}
                className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isWithdrawingInterest ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Withdrawing...
                  </>
                ) : (
                  'Withdraw Interest'
                )}
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">Registered LPs</h3>
            <p className="text-2xl text-black font-bold">{allRegisteredLPs ? allRegisteredLPs.length : 0}</p>
          </div>
        </div>

        {/* Tranche Breakdown */}
        {trancheBreakdown && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tranche Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700">Junior Tranche</h4>
                <p className="text-xl text-black font-bold">
                  {formatUnits(trancheBreakdown.juniorPrincipal, 6)} USDC
                </p>
                <p className="text-xs text-gray-500">Higher risk, higher returns</p>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700">Senior Tranche</h4>
                <p className="text-xl text-black font-bold">
                  {formatUnits(trancheBreakdown.seniorPrincipal, 6)} USDC
                </p>
                <p className="text-xs text-gray-500">Lower risk, stable returns</p>
              </div>
            </div>
          </div>
        )}

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tranche
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedTranche(Tranche.JUNIOR)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedTranche === Tranche.JUNIOR
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900">Junior Tranche</h4>
                    <p className="text-sm text-gray-600">Higher risk, higher returns</p>
                    <p className="text-xs text-gray-500 mt-1">First to absorb losses</p>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedTranche(Tranche.SENIOR)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedTranche === Tranche.SENIOR
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900">Senior Tranche</h4>
                    <p className="text-sm text-gray-600">Lower risk, stable returns</p>
                    <p className="text-xs text-gray-500 mt-1">Protected by Junior tranche</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Lockup Duration for Senior Tranche */}
            {selectedTranche === Tranche.SENIOR && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lockup Duration (days)
                </label>
                <select
                  value={lockupDuration}
                  onChange={(e) => setLockupDuration(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-3 text-black"
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
              <label className="block text-sm font-medium text-gray-700">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-3 text-black"
                placeholder={`Enter amount to deposit in ${getTrancheName(selectedTranche)} tranche`}
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
          className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mt-4"
          disabled={isProcessing || !amount}
        >
          {isProcessing
            ? 'Processing...'
            : action === 'deposit'
              ? `Deposit to ${getTrancheName(selectedTranche)} Tranche`
              : `Withdraw from ${getTrancheName(selectedTranche)} Tranche`}
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
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatUnits(deposit.amount, 6)} USDC
                      </p>
                      <p className="text-sm text-gray-600">
                        {getTrancheName(deposit.tranche)} Tranche
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Lockup: {Number(deposit.lockupDuration)} days
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {deposit.depositId.toString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 