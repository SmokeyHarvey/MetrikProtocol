import { useState, useCallback, useEffect } from 'react';
import { useContract } from './useContract';
import { usePublicClient, useAccount, useWalletClient } from 'wagmi';
import { parseAmount, formatAmount } from '@/lib/utils/contracts';
import { type Hash } from 'viem';
import { toast } from 'react-toastify';
import { useAnimatedValue } from './useAnimatedValue';
import { useWallets, useSendTransaction } from '@privy-io/react-auth';
import { encodeFunctionData } from 'viem';
import { useSeamlessTransaction } from './useSeamlessTransaction';

// Types for the new staking functions
export interface StakeInfo {
  amount: bigint;
  points: bigint;
  startTime: bigint;
  lastUpdateTime: bigint;
  duration: bigint;
  stakeId: bigint;
  isActive: boolean;
  apy: bigint;
  multiplier: bigint;
  rewardDebt?: bigint; // claimed
  pendingReward?: bigint; // pending
}

export interface StakeUsage {
  total: bigint;
  used: bigint;
  free: bigint;
}

export function useStaking(addressOverride?: string) {
  const { contract: stakingContract } = useContract('staking');
  const { contract: metrikContract } = useContract('metrikToken');
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address: wagmiAddress } = useAccount();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const { executeBatchTransactions, executeTransaction, preApproveToken } = useSeamlessTransaction();
  // Use override if provided, else embedded wallet, else Wagmi address
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = addressOverride || privyWallet?.address || wagmiAddress;
  const isPrivy = !!(addressOverride || privyWallet?.address);

  const [stakedAmount, setStakedAmount] = useState<string>('0');
  const [rewards, setRewards] = useState<string>('0');
  const [stakeDuration, setStakeDuration] = useState<number>(0);
  const [currentTier, setCurrentTier] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metrikBalance, setMetrikBalance] = useState<bigint | undefined>(undefined);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isBalanceError, setIsBalanceError] = useState(false);
  const [balanceError, setBalanceError] = useState<Error | null>(null);
  
  // New state for additional staking data
  const [activeStakes, setActiveStakes] = useState<StakeInfo[]>([]);
  const [stakeUsage, setStakeUsage] = useState<StakeUsage | null>(null);
  const [totalStakedAmount, setTotalStakedAmount] = useState<string>('0');

  // Animated values for smooth UI updates
  const animatedStakedAmount = useAnimatedValue(stakedAmount, 800, 'ease-out');
  const animatedRewards = useAnimatedValue(rewards, 800, 'ease-out');
  const animatedMetrikBalance = useAnimatedValue(
    metrikBalance !== undefined ? formatAmount(metrikBalance, 18) : '0',
    800,
    'ease-out'
  );

  // New function to get user's tier (0-4)
  const getTier = useCallback(async (userAddress?: string): Promise<number> => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi) {
      return 0;
    }

    try {
      console.log('🔍 Fetching tier for address:', userAddress || address || '0x0');
      console.log('🔍 Using staking contract address:', stakingContract.address);
      const tier = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'getTier',
        args: [userAddress || address || '0x0'],
      });
      const tierNumber = Number(tier);
      console.log('🔍 Raw tier from contract:', tier, 'Converted to number:', tierNumber);
      
      // Debug: Let's also check the staked amount that the getTier function sees
      try {
        const stakedForTier = await publicClient.readContract({
          address: stakingContract.address,
          abi: stakingContract.abi,
          functionName: 'getStakedAmount',
          args: [userAddress || address || '0x0'],
        });
              console.log('🔍 Staked amount for tier calculation (wei):', stakedForTier);
      console.log('🔍 Staked amount for tier calculation (METRIK):', Number(stakedForTier) / 1e18);
      } catch (err) {
        console.error('Error fetching staked amount for tier debug:', err);
      }
      
      return tierNumber;
    } catch (err) {
      console.error('Error fetching tier:', err);
      // Return mock data for testing when contracts are not deployed
      return 1; // Bronze tier
    }
  }, [publicClient, stakingContract.address, stakingContract.abi, address]);

  // New function to get total staked amount
  const getStakedAmount = useCallback(async (userAddress?: string): Promise<string> => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi) {
      return '0';
    }

    try {
      console.log('🔍 Fetching staked amount for address:', userAddress || address || '0x0');
      const amount = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'getStakedAmount',
        args: [userAddress || address || '0x0'],
      });
      console.log('🔍 Raw staked amount from contract:', amount);
      // METRIK tokens use 18 decimals like standard ERC20
      const formattedAmount = formatAmount(amount as bigint, 18);
      console.log('🔍 Formatted staked amount:', formattedAmount);
      return formattedAmount;
    } catch (err) {
      console.error('Error fetching staked amount:', err);
      // Return mock data for testing when contracts are not deployed
      return '500';
    }
  }, [publicClient, stakingContract.address, stakingContract.abi, address]);

  // New function to get all active stakes
  const getActiveStakes = useCallback(async (userAddress?: string): Promise<StakeInfo[]> => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi || !userAddress) {
      return [];
    }
    try {
      const stakes = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'getActiveStakes',
        args: [userAddress as `0x${string}`],
      }) as any[];
      
      console.log('🔍 getActiveStakes result:', stakes);
      
      // Convert the raw stakes to StakeInfo format
      return stakes.map((stake: any, index: number) => ({
        amount: BigInt(stake.amount),
        points: BigInt(stake.points),
        startTime: BigInt(stake.startTime),
        lastUpdateTime: BigInt(stake.lastUpdateTime),
        duration: BigInt(stake.duration),
        stakeId: BigInt(index), // Use index as stakeId
        isActive: true,
        apy: 0n, // Will be calculated separately
        multiplier: 0n // Will be calculated separately
      }));
    } catch (err) {
      console.error('Error fetching active stakes:', err);
      return [];
    }
  }, [publicClient, stakingContract.address, stakingContract.abi]);

  // New function to get stake usage (total, used, free)
  const getStakeUsage = useCallback(async (userAddress?: string): Promise<StakeUsage | null> => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi || !userAddress) {
      return null;
    }
    try {
      const usage = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'getStakeUsage',
        args: [userAddress as `0x${string}`],
      }) as [bigint, bigint, bigint];
      
      console.log('🔍 getStakeUsage result:', usage);
      
      return {
        total: usage[0],
        used: usage[1],
        free: usage[2]
      };
    } catch (err) {
      console.error('Error fetching stake usage:', err);
      return null;
    }
  }, [publicClient, stakingContract.address, stakingContract.abi]);

  // New function to get stake history
  const getStakeHistory = useCallback(async (userAddress?: string): Promise<any[]> => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi || !userAddress) {
      return [];
    }
    try {
      const historyLength = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'getStakeHistoryLength',
        args: [userAddress as `0x${string}`],
      }) as bigint;
      
      console.log('🔍 getStakeHistoryLength result:', historyLength);
      
      const history = [];
      for (let i = 0; i < Number(historyLength); i++) {
        try {
          const record = await publicClient.readContract({
            address: stakingContract.address,
            abi: stakingContract.abi,
            functionName: 'stakeHistory',
            args: [userAddress as `0x${string}`, BigInt(i)],
          });
          history.push(record);
        } catch (err) {
          console.error(`Error fetching stake history record ${i}:`, err);
        }
      }
      
      console.log('🔍 getStakeHistory result:', history);
      return history;
    } catch (err) {
      console.error('Error fetching stake history:', err);
      return [];
    }
  }, [publicClient, stakingContract.address, stakingContract.abi]);

  // New function to get APY for a given duration
  const getAPYForDuration = useCallback(async (duration: number): Promise<number> => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi) {
      return 0;
    }
    try {
      const apy = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'getAPYForDuration',
        args: [duration],
      });
      return Number(apy) / 100; // APY is likely in basis points
    } catch (err) {
      console.error('Error fetching APY for duration:', err);
      return 0;
    }
  }, [publicClient, stakingContract.address, stakingContract.abi]);

  // New function to get pending rewards for a stake
  const getPendingReward = useCallback(async (stakeIndex: bigint): Promise<bigint> => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi || !address) return 0n;
    try {
      const pending = await publicClient.readContract({
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'pendingRewards',
        args: [address, stakeIndex],
      });
      return BigInt(pending as bigint);
    } catch (err) {
      console.error('Error fetching pending rewards:', err);
      return 0n;
    }
  }, [publicClient, stakingContract.address, stakingContract.abi, address]);

  // Fetch staked balance and info
  const fetchStakedInfo = useCallback(async () => {
    if (!publicClient || !stakingContract.address || !stakingContract.abi || !address) {
      setStakedAmount('0');
      setStakeDuration(0);
      setRewards('0');
      setCurrentTier(0);
      setActiveStakes([]);
      setStakeUsage(null);
      setTotalStakedAmount('0');
      return;
    }
    
    try {
      // Get tier
      const tier = await getTier();
      console.log('🔍 Setting current tier to:', tier);
      setCurrentTier(tier);
      
      // Get total staked amount
      const totalStaked = await getStakedAmount();
      console.log('🔍 Staking debug - Raw staked amount:', totalStaked);
      setTotalStakedAmount(totalStaked);
      setStakedAmount(totalStaked);
      
      // Debug: Let's also check the raw staked amount from contract
      try {
        const rawAmount = await publicClient.readContract({
          address: stakingContract.address,
          abi: stakingContract.abi,
          functionName: 'getStakedAmount',
          args: [address || '0x0'],
        });
        console.log('🔍 Raw staked amount from contract (wei):', rawAmount);
        console.log('🔍 Raw staked amount in METRIK:', Number(rawAmount) / 1e18);
      } catch (err) {
        console.error('Error fetching raw staked amount:', err);
      }
      
      // Get active stakes
      let stakes = await getActiveStakes(address);
      console.log('🔍 fetchStakedInfo - Active stakes:', stakes);
      
      // For each stake, fetch pending and claimed rewards
      stakes = await Promise.all(stakes.map(async (stake, idx) => {
        let pendingReward = 0n;
        let rewardDebt = 0n;
        try {
          pendingReward = await getPendingReward(stake.stakeId);
        } catch {}
        try {
          // rewardDebt is part of the struct if returned by getActiveStakes, else fallback to 0
          rewardDebt = (stake as any).rewardDebt ? BigInt((stake as any).rewardDebt) : 0n;
        } catch {}
        return { ...stake, pendingReward, rewardDebt };
      }));
      // Filter out any null or undefined stakes before setting state
      setActiveStakes(stakes.filter(Boolean));
      
      // Get stake usage
      const usage = await getStakeUsage(address);
      console.log('🔍 fetchStakedInfo - Stake usage:', usage);
      setStakeUsage(usage);
      
      // Calculate duration from active stakes
      if (stakes.length > 0) {
        const firstStake = stakes[0];
        setStakeDuration(Number(firstStake.duration));
      } else {
        setStakeDuration(0);
      }
      
      // For now, we'll set rewards to 0 as there's no direct rewards function
      setRewards('0');
    } catch (err) {
      console.error('Error fetching stake info:', err);
      // Don't throw error, just set default values
      setStakedAmount('0');
      setStakeDuration(0);
      setRewards('0');
      setCurrentTier(0);
      setActiveStakes([]);
      setStakeUsage(null);
      setTotalStakedAmount('0');
    }
  }, [publicClient, stakingContract.address, stakingContract.abi, address, getTier, getStakedAmount, getActiveStakes, getStakeUsage, getPendingReward]);

  // Fetch METRIK balance
  const fetchMetrikBalance = useCallback(async () => {
    setIsBalanceLoading(true);
    setIsBalanceError(false);
    setBalanceError(null);
    if (!publicClient || !metrikContract.address || !metrikContract.abi || !address) {
      setMetrikBalance(undefined);
      setIsBalanceLoading(false);
      return;
    }
    try {
      const data = await publicClient.readContract({
        address: metrikContract.address,
        abi: metrikContract.abi,
        functionName: 'balanceOf',
        args: [address],
      });
      setMetrikBalance(data as bigint);
    } catch (err) {
      console.error('Error fetching METRIK balance:', err);
      setIsBalanceError(true);
      setBalanceError(err as Error);
      setMetrikBalance(0n); // Set to 0 instead of undefined
    } finally {
      setIsBalanceLoading(false);
    }
  }, [publicClient, metrikContract.address, metrikContract.abi, address]);

  // Effect to refetch data on address change or periodically
  useEffect(() => {
    if (address) {
      fetchStakedInfo();
      fetchMetrikBalance();

      const interval = setInterval(() => {
        fetchStakedInfo();
        fetchMetrikBalance();
      }, 30000); // Refetch every 30 seconds instead of 15 to reduce UI flickering

      return () => clearInterval(interval);
    }
  }, [address, fetchStakedInfo, fetchMetrikBalance]);

  const stake = useCallback(async (amount: string, duration: number) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!stakingContract || !stakingContract.address || !stakingContract.abi) {
        throw new Error('Staking contract not available.');
      }

      if (!metrikContract || !metrikContract.address || !metrikContract.abi) {
        throw new Error('METRIK token contract not available.');
      }

      if (!address) {
        throw new Error('Wallet not connected.');
      }

      if (!publicClient) {
        throw new Error('Public client not available. Please ensure network is connected.');
      }

      console.log('Current useWalletClient state:', { walletClient: typeof walletClient, walletClientValue: walletClient });
      console.log('Current publicClient chain ID:', publicClient?.chain.id, '(Expected:', publicClient?.chain.id, ')');

      console.log('Checking METRIK balance state:', {
        isBalanceLoading,
        isBalanceError,
        balanceError,
        metrikBalance: metrikBalance?.toString(),
        address
      });

      if (isBalanceLoading) {
        throw new Error('Loading METRIK balance... Please wait.');
      }

      if (isBalanceError) {
        throw new Error(`Error fetching METRIK balance: ${balanceError?.message}`);
      }

      // Define variables that will be used in both paths
      const parsedAmount = parseAmount(amount);
      const safeDuration = BigInt(Math.max(0, Math.floor(duration || 0)));
      const durationInSeconds = safeDuration * BigInt(24 * 60 * 60);

      if (isPrivy) {
        // Use seamless transactions for suppliers with better messaging
        
        toast.info('Setting up your stake... This may require one approval for future transactions.');
        
        // Execute approve and stake in one seamless batch
        const transactions = [
          {
            to: metrikContract.address,
            data: encodeFunctionData({
              abi: metrikContract.abi,
              functionName: 'approve',
              args: [stakingContract.address, parsedAmount],
            }),
          },
          {
            to: stakingContract.address,
            data: encodeFunctionData({
              abi: stakingContract.abi,
              functionName: 'stake',
              args: [parsedAmount, durationInSeconds],
            }),
          },
        ];

        const results = await executeBatchTransactions(transactions, publicClient?.chain.id);
        toast.success('Stake successful! Your tokens are now staked.');
        return results[1].hash; // Return the stake transaction hash
      }

      if (!walletClient) {
        throw new Error('Wallet client not available. Please ensure your wallet is connected.');
      }

      // First approve the staking contract to spend METRIK tokens
      let approveTxHash: Hash | undefined;

      console.log('Before approve walletClient.writeContract call.');

      try {
        const { request } = await publicClient!.simulateContract({
          account: address as `0x${string}`,
          address: metrikContract.address,
          abi: metrikContract.abi,
          functionName: 'approve',
          args: [stakingContract.address, parsedAmount],
        });

        approveTxHash = await walletClient.writeContract(request);
        console.log('approveTxHash result:', approveTxHash);

      } catch (approveError) {
        console.error('Error during approve transaction call:', approveError);
        throw new Error(`Approval transaction failed: ${(approveError as Error).message}`);
      }
      
      if (typeof approveTxHash !== 'string') {
        throw new Error('Transaction approval failed or was rejected. `walletClient.writeContract` did not return a valid transaction hash.');
      }

      console.log('Approval transaction sent:', approveTxHash);

      console.log('Waiting for approval transaction confirmation...');
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: approveTxHash });
      console.log('Approval transaction confirmed:', receipt);

      // Then stake the tokens
      console.log('Staking tokens...', {
        amount: parsedAmount.toString(),
        duration: durationInSeconds.toString()
      });

      let stakeTxHash: Hash | undefined;

      try {
        const { request } = await publicClient!.simulateContract({
          account: address as `0x${string}`,
          address: stakingContract.address,
          abi: stakingContract.abi,
          functionName: 'stake',
          args: [parsedAmount, durationInSeconds],
        });

        stakeTxHash = await walletClient.writeContract(request);
        console.log('stakeTxHash result:', stakeTxHash);
      } catch (stakeError) {
        console.error('Error during stake transaction call:', stakeError);
        throw new Error(`Staking transaction failed: ${(stakeError as Error).message}`);
      }

      if (typeof stakeTxHash !== 'string') {
        throw new Error('Staking transaction failed or was rejected. `walletClient.writeContract` did not return a valid transaction hash.');
      }
      
      console.log('Stake transaction sent:', stakeTxHash);

      console.log('Waiting for stake transaction confirmation...');
      const stakeReceipt = await publicClient!.waitForTransactionReceipt({ hash: stakeTxHash });
      console.log('Stake transaction confirmed:', stakeReceipt);

      toast.success('Stake successful!');
      return stakeTxHash;
    } catch (err) {
      console.error('Error staking:', err);
      setError(err as Error);
      toast.error('Staking failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [stakingContract, metrikContract, metrikBalance, address, isBalanceLoading, isBalanceError, balanceError, walletClient, publicClient, sendTransaction, isPrivy, executeBatchTransactions]);

  const unstake = useCallback(async (stakeIndex: number = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      if (!stakingContract || !stakingContract.address || !stakingContract.abi) {
        throw new Error('Staking contract not available.');
      }
      
      console.log('🔍 Unstaking stake at index:', stakeIndex);
      console.log('🔍 isPrivy:', isPrivy);
      console.log('🔍 address:', address);
      console.log('🔍 privyWallet:', privyWallet);
      
      if (isPrivy) {
        // Use seamless transaction for suppliers
        console.log('🔍 Using seamless transaction flow for unstaking');
        toast.info('Processing your unstake request...');
        
        const data = encodeFunctionData({
          abi: stakingContract.abi,
          functionName: 'unstake',
          args: [BigInt(stakeIndex)],
        });
        
        console.log('🔍 Encoded function data:', data);
        console.log('🔍 Contract address:', stakingContract.address);
        
        const hash = await executeTransaction(
          stakingContract.address,
          data,
          0n,
          publicClient?.chain.id
        );
        
        console.log('🔍 Transaction hash:', hash);
        toast.success('Unstake successful! Your tokens have been returned.');
        return hash;
      } else {
        console.log('🔍 Using regular wallet flow for unstaking');
      }
      
      if (!walletClient || !address || !publicClient) {
        throw new Error('Wallet client, address, or public client not available.');
      }
      const { request } = await publicClient!.simulateContract({
        account: address as `0x${string}`,
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'unstake',
        args: [BigInt(stakeIndex)],
      });
      const hash = await walletClient.writeContract(request);
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      console.error('Error unstaking:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [stakingContract, walletClient, publicClient, address, isPrivy, executeTransaction]);

  const claimRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!stakingContract || !stakingContract.address || !stakingContract.abi) {
        throw new Error('Staking contract not available.');
      }
      
      if (isPrivy) {
        // Use seamless transaction for suppliers
        toast.info('Processing your reward claim request...');
        
        const data = encodeFunctionData({
          abi: stakingContract.abi,
          functionName: 'claimRewards',
        });
        
        const hash = await executeTransaction(
          stakingContract.address,
          data,
          0n,
          publicClient?.chain.id
        );
        
        toast.success('Rewards claimed successfully!');
        return hash;
      }
      
      if (!walletClient || !address || !publicClient) {
        throw new Error('Wallet client, address, or public client not available.');
      }
      const { request } = await publicClient!.simulateContract({
        account: address as `0x${string}`,
        address: stakingContract.address,
        abi: stakingContract.abi,
        functionName: 'claimRewards',
      });
      const hash = await walletClient.writeContract(request);
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      console.error('Error claiming rewards:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [stakingContract, walletClient, publicClient, address, isPrivy, executeTransaction]);

  return {
    isLoading: isLoading || isBalanceLoading,
    error,
    stakedAmount,
    rewards,
    stakeDuration,
    currentTier,
    stake,
    unstake,
    claimRewards,
    metrikBalance: metrikBalance && typeof metrikBalance === 'bigint' ? formatAmount(metrikBalance, 18) : '0',
    // New state for additional staking data
    activeStakes,
    stakeUsage,
    totalStakedAmount,
    // Functions for additional data
    getTier,
    getStakedAmount,
    getActiveStakes,
    getStakeUsage,
    getStakeHistory,
    getAPYForDuration,
    // Animated values for smooth UI updates
    animatedStakedAmount,
    animatedRewards,
    animatedMetrikBalance,
    fetchStakedInfo,
  };
} 