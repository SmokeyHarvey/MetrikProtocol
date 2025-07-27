import { useState, useCallback, useEffect } from 'react';
import { useBalance, useReadContract, usePublicClient } from 'wagmi';
import { type Address } from 'viem';
import { contracts } from '@/lib/wagmi/config';
import { formatAmount } from '@/lib/utils/contracts';
import { useWallets } from '@privy-io/react-auth';

export function useTokenBalance() {
  const { wallets } = useWallets();
  const publicClient = usePublicClient();
  // Prefer embedded Privy wallet for supplier flows
  const privyWallet = wallets.find(w => 
    w.walletClientType === 'privy' || 
    (w.meta && w.meta.id === 'io.privy.wallet') ||
    w.type === 'ethereum' // Fallback to any ethereum wallet
  );
  const address = privyWallet?.address;

  console.log('🔍 useTokenBalance - Wallets:', wallets);
  console.log('🔍 useTokenBalance - Wallet details:', wallets.map(w => ({
    type: w.type,
    address: w.address,
    walletClientType: w.walletClientType,
    meta: w.meta
  })));
  console.log('🔍 useTokenBalance - Privy wallet:', privyWallet);
  console.log('🔍 useTokenBalance - Address type:', typeof address);
  console.log('🔍 useTokenBalance - Address value:', address);
  const [balances, setBalances] = useState<{
    metrik: string;
    usdc: string;
    eth: string;
  }>({
    metrik: '0',
    usdc: '0',
    eth: '0',
  });

  // Read METRIK token balance
  const { data: metrikBalance } = useReadContract({
    address: contracts.metrikToken.address,
    abi: contracts.metrikToken.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read USDC token balance
  const { data: usdcBalance, refetch: refetchUsdcBalance, isError: usdcError, error: usdcErrorDetails } = useReadContract({
    address: contracts.usdc.address,
    abi: contracts.usdc.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  console.log('🔍 useTokenBalance - Address:', address);
  console.log('🔍 useTokenBalance - USDC Contract:', contracts.usdc.address);
  console.log('🔍 useTokenBalance - Raw USDC Balance from wagmi:', usdcBalance);
  console.log('🔍 useTokenBalance - USDC Error:', usdcError);
  console.log('🔍 useTokenBalance - USDC Error Details:', usdcErrorDetails);
  console.log('🔍 useTokenBalance - Query enabled:', !!address);

  // Read native token (CBTC) balance
  const { data: ethBalance } = useBalance({
    address: address as `0x${string}` | undefined,
  });

  // Update balances when data changes
  useEffect(() => {
    if (metrikBalance && typeof metrikBalance === 'bigint') {
      setBalances(prev => ({
        ...prev,
        metrik: formatAmount(metrikBalance),
      }));
    }
  }, [metrikBalance]);

  useEffect(() => {
    if (usdcBalance && typeof usdcBalance === 'bigint') {
      setBalances(prev => ({
        ...prev,
        usdc: formatAmount(usdcBalance, 6), // USDC has 6 decimals
      }));
    }
  }, [usdcBalance]);

  useEffect(() => {
    if (ethBalance?.value) {
      setBalances(prev => ({
        ...prev,
        eth: ethBalance.formatted,
      }));
    }
  }, [ethBalance]);

  const getFormattedBalance = useCallback((token: 'metrik' | 'usdc' | 'eth') => {
    return balances[token];
  }, [balances]);

  // Function to manually refresh balances
  const refreshBalances = useCallback(async () => {
    console.log('🔄 refreshBalances called');
    if (!address || !publicClient) {
      console.log('🔄 refreshBalances - Missing address or publicClient:', { address: !!address, publicClient: !!publicClient });
      return;
    }

    try {
      console.log('🔄 Refreshing balances for address:', address);
      console.log('🔄 USDC contract address:', contracts.usdc.address);
      
      // Refresh USDC balance
      const usdcBalance = await publicClient.readContract({
        address: contracts.usdc.address,
        abi: contracts.usdc.abi,
        functionName: 'balanceOf',
        args: [address as Address],
      });

      console.log('🔄 Raw USDC balance:', usdcBalance);
      console.log('🔄 Formatted USDC balance:', formatAmount(usdcBalance as bigint, 6));

      // Refresh METRIK balance
      const metrikBalance = await publicClient.readContract({
        address: contracts.metrikToken.address,
        abi: contracts.metrikToken.abi,
        functionName: 'balanceOf',
        args: [address as Address],
      });

      console.log('🔄 Raw METRIK balance:', metrikBalance);
      console.log('🔄 Formatted METRIK balance:', formatAmount(metrikBalance as bigint));

      setBalances({
        metrik: formatAmount(metrikBalance as bigint),
        usdc: formatAmount(usdcBalance as bigint, 6),
        eth: balances.eth, // Keep existing ETH balance
      });

      console.log('🔄 Updated balances state:', {
        metrik: formatAmount(metrikBalance as bigint),
        usdc: formatAmount(usdcBalance as bigint, 6),
        eth: balances.eth,
      });
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  }, [address, publicClient, balances.eth]);

  const debugRefetchUsdcBalance = useCallback(async () => {
    console.log('🔄 debugRefetchUsdcBalance called');
    console.log('🔄 debugRefetchUsdcBalance - refetchUsdcBalance function:', refetchUsdcBalance);
    try {
      const result = await refetchUsdcBalance();
      console.log('🔄 debugRefetchUsdcBalance - result:', result);
    } catch (error) {
      console.error('🔄 debugRefetchUsdcBalance - error:', error);
    }
  }, [refetchUsdcBalance]);

  return {
    balances,
    getFormattedBalance,
    refreshBalances,
    refetchUsdcBalance: debugRefetchUsdcBalance,
  };
} 