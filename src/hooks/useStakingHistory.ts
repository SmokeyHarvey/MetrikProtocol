import { useState, useCallback, useEffect } from 'react';
import { useContract } from './useContract';
import { usePublicClient } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { formatAmount } from '@/lib/utils/contracts';
import { useAnimatedValue } from './useAnimatedValue';

export interface StakeInfo {
  amount: string;
  points: string;
  startTime: Date;
  lastUpdateTime: Date;
  duration: number;
}

export interface StakeHistory {
  amount: string;
  startTime: Date;
  duration: number;
  usedForBorrow: string;
}

export interface StakeUsage {
  total: string;
  used: string;
  free: string;
}

export function useStakingHistory() {
  const { contract: stakingContract } = useContract('staking');
  const publicClient = usePublicClient();
  const { wallets } = useWallets();
  
  // Find Privy embedded wallet
  const privyWallet = wallets.find(w => 
    w.walletClientType === 'privy' || 
    (w.meta && w.meta.id === 'io.privy.wallet') ||
    w.connectorType === 'embedded'
  );
  const address = privyWallet?.address;

  const [activeStakes, setActiveStakes] = useState<StakeInfo[]>([]);
  const [stakeHistory, setStakeHistory] = useState<StakeHistory[]>([]);
  const [stakeUsage, setStakeUsage] = useState<StakeUsage>({
    total: '0',
    used: '0',
    free: '0'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Animated values for smooth UI updates
  const animatedStakeUsage = {
    total: useAnimatedValue(stakeUsage.total, 800, 'ease-out'),
    used: useAnimatedValue(stakeUsage.used, 800, 'ease-out'),
    free: useAnimatedValue(stakeUsage.free, 800, 'ease-out'),
  };

  // Fetch all active stakes
  const fetchActiveStakes = useCallback(async () => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi || !address) {
      setActiveStakes([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 useStakingHistory: Fetching active stakes for address:', address);
      console.log('🔍 useStakingHistory: Contract address:', stakingContract.address);
      
      const stakes = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'getActiveStakes',
        args: [address],
      });

      console.log('🔍 useStakingHistory: Raw stakes result:', stakes);

      if (Array.isArray(stakes)) {
        const formattedStakes: StakeInfo[] = stakes.map((stake: any) => ({
          amount: formatAmount(stake.amount),
          points: formatAmount(stake.points),
          startTime: new Date(Number(stake.startTime) * 1000),
          lastUpdateTime: new Date(Number(stake.lastUpdateTime) * 1000),
          duration: Number(stake.duration),
        }));
        console.log('🔍 useStakingHistory: Formatted stakes:', formattedStakes);
        setActiveStakes(formattedStakes);
      } else {
        console.log('🔍 useStakingHistory: Stakes is not an array, setting empty');
        setActiveStakes([]);
      }
    } catch (err) {
      console.error('Error fetching active stakes:', err);
      setError(err as Error);
      setActiveStakes([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, stakingContract.address, stakingContract.abi, address]);

  // Fetch stake history using getStakeHistoryLength and stakeHistory mapping
  const fetchStakeHistory = useCallback(async () => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi || !address) {
      setStakeHistory([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 useStakingHistory: Fetching stake history using getStakeHistoryLength for address:', address);
      
      // First, get the length of stake history
      const historyLength = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'getStakeHistoryLength',
        args: [address],
      }) as bigint;

      const length = Number(historyLength);
      console.log('🔍 useStakingHistory: Stake history length from contract:', length);
      
      const history: StakeHistory[] = [];

      // Fetch each stake record from the stakeHistory mapping
      for (let i = 0; i < length; i++) {
        try {
          console.log(`🔍 useStakingHistory: Fetching stake record ${i}...`);
          const stakeRecord = await publicClient.readContract({
            address: stakingContract.address,
            abi: stakingContract.abi,
            functionName: 'stakeHistory',
            args: [address, BigInt(i)],
          }) as any;

          console.log(`🔍 useStakingHistory: Stake record ${i}:`, stakeRecord);

          if (stakeRecord && Array.isArray(stakeRecord) && stakeRecord.length >= 4) {
            history.push({
              amount: formatAmount(stakeRecord[0]),
              startTime: new Date(Number(stakeRecord[1]) * 1000),
              duration: Number(stakeRecord[2]),
              usedForBorrow: formatAmount(stakeRecord[3]),
            });
            console.log(`🔍 useStakingHistory: Added stake record ${i} to history`);
          } else {
            console.log(`🔍 useStakingHistory: Invalid stake record ${i}:`, stakeRecord);
          }
        } catch (err) {
          console.error(`🔍 useStakingHistory: Error fetching stake record ${i}:`, err);
        }
      }

      console.log('🔍 useStakingHistory: Final history from stakeHistory mapping:', history);
      setStakeHistory(history);
      
      // Debug: If no history found, let's check if the function is working
      if (history.length === 0) {
        console.log('🔍 useStakingHistory: No stake history found. This could mean:');
        console.log('🔍 useStakingHistory: 1. You have not made any stakes yet');
        console.log('🔍 useStakingHistory: 2. The getStakeHistoryLength function returned 0');
        console.log('🔍 useStakingHistory: 3. The stakeHistory mapping is not accessible');
        console.log('🔍 useStakingHistory: 4. The contract address is wrong');
      } else {
        console.log('🔍 useStakingHistory: Successfully found stake history:', history.length, 'entries');
      }
    } catch (err) {
      console.error('Error fetching stake history:', err);
      setError(err as Error);
      setStakeHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, stakingContract.address, stakingContract.abi, address]);

  // Fetch stake usage
  const fetchStakeUsage = useCallback(async () => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi || !address) {
      setStakeUsage({ total: '0', used: '0', free: '0' });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const usage = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'getStakeUsage',
        args: [address],
      });

      if (Array.isArray(usage) && usage.length === 3) {
        setStakeUsage({
          total: formatAmount(usage[0]),
          used: formatAmount(usage[1]),
          free: formatAmount(usage[2]),
        });
      } else {
        setStakeUsage({ total: '0', used: '0', free: '0' });
      }
    } catch (err) {
      console.error('Error fetching stake usage:', err);
      setError(err as Error);
      setStakeUsage({ total: '0', used: '0', free: '0' });
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, stakingContract.address, stakingContract.abi, address]);

  // Fetch all staking data
  const fetchAllStakingData = useCallback(async () => {
    await Promise.all([
      fetchActiveStakes(),
      fetchStakeHistory(),
      fetchStakeUsage(),
    ]);
  }, [fetchActiveStakes, fetchStakeHistory, fetchStakeUsage]);

  // Effect to fetch data on address change
  useEffect(() => {
    if (address) {
      fetchAllStakingData();

      const interval = setInterval(() => {
        fetchAllStakingData();
      }, 30000); // Refetch every 30 seconds instead of 15 to reduce UI flickering

      return () => clearInterval(interval);
    }
  }, [address, fetchAllStakingData]);

  return {
    activeStakes,
    stakeHistory,
    stakeUsage,
    isLoading,
    error,
    refetch: fetchAllStakingData,
    // Animated values for smooth UI updates
    animatedStakeUsage,
  };
} 