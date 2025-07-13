import { useState, useCallback, useEffect } from 'react';
import { useContract } from './useContract';
import { usePublicClient, useAccount, useWalletClient } from 'wagmi';
import { parseAmount, formatAmount } from '@/lib/utils/contracts';
import { toast } from 'react-toastify';
import { useAnimatedValue } from './useAnimatedValue';

export interface Loan {
  invoiceId: string;
  amount: string;
  dueDate: Date;
  status: 'active' | 'repaid' | 'liquidated';
  interestAccrued: string;
  borrowTime: Date;
  supplier: string;
  borrowAmount: string;
}

export interface BorrowStats {
  totalLoans: number;
  activeLoans: number;
  repaidLoans: number;
  liquidatedLoans: number;
  totalBorrowed: number;
  totalInterest: number;
  totalRepaid: number;
}

export function useBorrow() {
  const { contract: lendingPoolContract } = useContract('lendingPool');
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const [userLoans, setUserLoans] = useState<Loan[]>([]); // All loans (history)
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]); // Only active loans
  const [borrowStats, setBorrowStats] = useState<BorrowStats>({
    totalLoans: 0,
    activeLoans: 0,
    repaidLoans: 0,
    liquidatedLoans: 0,
    totalBorrowed: 0,
    totalInterest: 0,
    totalRepaid: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for borrowing capacity and safe lending amount
  const [borrowingCapacity, setBorrowingCapacity] = useState<string>('0');
  const [safeLendingAmount, setSafeLendingAmount] = useState<string>('0');

  // Animated values for smooth UI updates
  const animatedStats = {
    totalBorrowed: useAnimatedValue(borrowStats.totalBorrowed.toString(), 800, 'ease-out'),
    activeLoans: useAnimatedValue(borrowStats.activeLoans.toString(), 800, 'ease-out'),
    repaidLoans: useAnimatedValue(borrowStats.repaidLoans.toString(), 800, 'ease-out'),
    liquidatedLoans: useAnimatedValue(borrowStats.liquidatedLoans.toString(), 800, 'ease-out'),
    totalInterest: useAnimatedValue(borrowStats.totalInterest.toString(), 800, 'ease-out'),
    totalLoans: useAnimatedValue(borrowStats.totalLoans.toString(), 800, 'ease-out'),
  };

  // New function to get borrowing capacity
  const getBorrowingCapacity = useCallback(async (userAddress?: string): Promise<string> => {
    if (!publicClient || !lendingPoolContract.address || !lendingPoolContract.abi) {
      return '0';
    }

    try {
      const capacity = await publicClient.readContract({
        address: lendingPoolContract.address,
        abi: lendingPoolContract.abi,
        functionName: 'getBorrowingCapacity',
        args: [userAddress || address || '0x0'],
      });
      // If the raw value is 7500, do not divide by 1e6
      if (typeof capacity === 'object' && capacity !== null && 'toString' in capacity && typeof capacity.toString === 'function') {
        return capacity.toString();
      }
      return String(capacity);
    } catch (err) {
      console.error('Error fetching borrowing capacity:', err);
      return '0';
    }
  }, [publicClient, lendingPoolContract.address, lendingPoolContract.abi, address]);

  // New function to get system-wide safe lending amount
  const getSystemWideSafeLendingAmount = useCallback(async (): Promise<string> => {
    if (!publicClient || !lendingPoolContract.address || !lendingPoolContract.abi) {
      return '0';
    }
    try {
      const safeAmount = await publicClient.readContract({
        address: lendingPoolContract.address,
        abi: lendingPoolContract.abi,
        functionName: 'getSystemWideSafeLendingAmount',
        args: [],
      });
      // USDC has 6 decimals
      return (Number(safeAmount) / 1e6).toString();
    } catch (err) {
      console.error('Error fetching system-wide safe lending amount:', err);
      return '0';
    }
  }, [publicClient, lendingPoolContract.address, lendingPoolContract.abi]);

  // Fetch system-wide safe lending amount on mount
  useEffect(() => {
    (async () => {
      const safeAmount = await getSystemWideSafeLendingAmount();
      setSafeLendingAmount(safeAmount);
    })();
  }, [getSystemWideSafeLendingAmount]);

  // Fetch all user loan IDs (history)
  const getAllUserLoans = useCallback(async (): Promise<Loan[]> => {
    if (!publicClient || !lendingPoolContract.address || !lendingPoolContract.abi || !address) {
      return [];
    }
    try {
      const loanIds = await publicClient.readContract({
        address: lendingPoolContract.address,
        abi: lendingPoolContract.abi,
        functionName: 'getUserLoans',
        args: [address],
      }) as bigint[];
      if (!loanIds || loanIds.length === 0) return [];
      const loanResults = await Promise.all(
        loanIds.map(async (id) => {
          try {
            // Use the raw loans(id) function instead of getUserLoanDetails
            const details = await publicClient.readContract({
              address: lendingPoolContract.address,
              abi: lendingPoolContract.abi,
              functionName: 'loans',
              args: [id],
            }) as any;
            if (!details || typeof details[0] === 'undefined') return null;
            // details: [invoiceId, amount, dueDate, isRepaid, isLiquidated, interestAccrued, lastInterestUpdate, supplier, borrowAmount, borrowTime]
            const amount = formatAmount(details[1], 6);
            const dueDate = new Date(Number(details[2]) * 1000);
            const isRepaid = details[3];
            const isLiquidated = details[4];
            const interestAccrued = formatAmount(details[5], 6);
            const borrowTime = new Date(Number(details[9]) * 1000);
            let status: 'active' | 'repaid' | 'liquidated' = 'active';
            if (isRepaid) status = 'repaid';
            if (isLiquidated) status = 'liquidated';
            return {
              invoiceId: id.toString(),
              amount,
              dueDate,
              status,
              interestAccrued,
              borrowTime,
              supplier: details[7],
              borrowAmount: formatAmount(details[8], 6),
            };
          } catch (err: any) {
            return null;
          }
        })
      );
      const loans: Loan[] = loanResults.filter((loan): loan is Loan => loan !== null);
      return loans;
    } catch (err) {
      return [];
    }
  }, [publicClient, lendingPoolContract.address, lendingPoolContract.abi, address]);

  // Fetch only active user loan IDs
  const getActiveUserLoans = useCallback(async (): Promise<Loan[]> => {
    if (!publicClient || !lendingPoolContract.address || !lendingPoolContract.abi || !address) {
      return [];
    }
    try {
      const loanIds = await publicClient.readContract({
        address: lendingPoolContract.address,
        abi: lendingPoolContract.abi,
        functionName: 'getUserActiveLoans',
        args: [address],
      }) as bigint[];
      if (!loanIds || loanIds.length === 0) return [];
      const loanResults = await Promise.all(
        loanIds.map(async (id) => {
          try {
            const details = await publicClient.readContract({
              address: lendingPoolContract.address,
              abi: lendingPoolContract.abi,
              functionName: 'getUserLoanDetails',
              args: [address, id],
            }) as any;
            if (!details || typeof details[0] === 'undefined') return null;
            const amount = formatAmount(details[0], 6);
            const dueDate = new Date(Number(details[1]) * 1000);
            const isRepaid = details[2];
            const isLiquidated = details[3];
            const interestAccrued = formatAmount(details[4], 6);
            let status: 'active' | 'repaid' | 'liquidated' = 'active';
            if (isRepaid) status = 'repaid';
            if (isLiquidated) status = 'liquidated';
            const borrowTime = new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            return {
              invoiceId: id.toString(),
              amount,
              dueDate,
              status,
              interestAccrued,
              borrowTime,
              supplier: '',
              borrowAmount: amount,
            };
          } catch (err: any) {
            if (err.message && err.message.includes('Loan not found or not active')) {
              return null;
            }
            return null;
          }
        })
      );
      const loans: Loan[] = loanResults.filter((loan): loan is Loan => loan !== null);
      return loans;
    } catch (err) {
      return [];
    }
  }, [publicClient, lendingPoolContract.address, lendingPoolContract.abi, address]);

  const getUserLoansRaw = useCallback(async (userAddress?: string) => {
    if (!publicClient || !lendingPoolContract.address || !lendingPoolContract.abi) {
      return [];
    }
    try {
      const ids = await publicClient.readContract({
        address: lendingPoolContract.address,
        abi: lendingPoolContract.abi,
        functionName: 'getUserLoans',
        args: [userAddress || address || '0x0'],
      });
      return ids;
    } catch (err) {
      console.error('DEBUG getUserLoansRaw error:', err);
      return [];
    }
  }, [publicClient, lendingPoolContract.address, lendingPoolContract.abi, address]);

  const getLoanByIdRaw = useCallback(async (loanId: bigint | number | string) => {
    if (!publicClient || !lendingPoolContract.address || !lendingPoolContract.abi) {
      return null;
    }
    try {
      const id = typeof loanId === 'bigint' ? loanId : BigInt(loanId);
      const details = await publicClient.readContract({
        address: lendingPoolContract.address,
        abi: lendingPoolContract.abi,
        functionName: 'loans',
        args: [id],
      });
      return details;
    } catch (err) {
      console.error('DEBUG getLoanByIdRaw error for', loanId, err);
      return null;
    }
  }, [publicClient, lendingPoolContract.address, lendingPoolContract.abi]);

  const fetchUserLoans = useCallback(async () => {
    if (!address) return;
    try {
      setIsLoading(true);
      setError(null);
      // Fetch both all loans and active loans in parallel
      const [allLoans, actLoans] = await Promise.all([
        getAllUserLoans(),
        getActiveUserLoans(),
      ]);
      setUserLoans(allLoans);
      setActiveLoans(actLoans);
      // Calculate statistics from all loans
      const repaidLoans = allLoans.filter(loan => loan.status === 'repaid');
      const liquidatedLoans = allLoans.filter(loan => loan.status === 'liquidated');
      const totalInterest = allLoans.reduce((sum, loan) => sum + Number(loan.interestAccrued), 0);
      setBorrowStats({
        totalLoans: allLoans.length,
        activeLoans: actLoans.length,
        repaidLoans: repaidLoans.length,
        liquidatedLoans: liquidatedLoans.length,
        totalBorrowed: allLoans.reduce((sum, loan) => sum + Number(loan.amount), 0),
        totalInterest,
        totalRepaid: repaidLoans.reduce((sum, loan) => sum + Number(loan.amount), 0)
      });
      // Fetch borrowing capacity and safe lending amount
      const capacity = await getBorrowingCapacity();
      setBorrowingCapacity(capacity);
      // The safeLendingAmount is now fetched on mount
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch loans');
    } finally {
      setIsLoading(false);
    }
  }, [address, getAllUserLoans, getActiveUserLoans, getBorrowingCapacity]);

  const getMaxBorrowAmount = useCallback(async (tokenId: string) => {
    try {
      if (!publicClient || !lendingPoolContract.address || !lendingPoolContract.abi) {
        return '0';
      }

      const maxBorrow = await publicClient.readContract({
        address: lendingPoolContract.address,
        abi: lendingPoolContract.abi,
        functionName: 'getMaxBorrowAmount',
        args: [BigInt(tokenId)],
      }) as bigint;

      return formatAmount(maxBorrow);
    } catch (err) {
      console.error('Error getting max borrow amount:', err);
      return '0';
    }
  }, [publicClient, lendingPoolContract.address, lendingPoolContract.abi]);

  // Updated borrow function to use depositInvoiceAndBorrow
  const borrow = useCallback(async (tokenId: string, borrowAmount: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!walletClient || !address || !publicClient) {
        throw new Error('Wallet client, address, or public client not available.');
      }

      const parsedAmount = parseAmount(borrowAmount);

      // Use the new depositInvoiceAndBorrow function
      const { request } = await publicClient.simulateContract({
        account: address,
        address: lendingPoolContract.address,
        abi: lendingPoolContract.abi,
        functionName: 'depositInvoiceAndBorrow',
        args: [BigInt(tokenId), parsedAmount],
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      // Refresh data
      await fetchUserLoans();

      toast.success('Borrow successful!');
      return hash;
    } catch (err) {
      console.error('Error borrowing:', err);
      setError(err instanceof Error ? err.message : 'Borrowing failed');
      toast.error('Borrowing failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, address, publicClient, lendingPoolContract.address, lendingPoolContract.abi, fetchUserLoans]);

  // Effect to fetch data on address change or periodically
  useEffect(() => {
    if (address) {
      fetchUserLoans();
      
      // Set up polling every 30 seconds
      const interval = setInterval(fetchUserLoans, 30000);
      
      return () => clearInterval(interval);
    }
  }, [address, fetchUserLoans]);

  return {
    userLoans, // all loans (history)
    activeLoans, // only active loans
    borrowStats,
    animatedStats,
    isLoading,
    error,
    borrow,
    getMaxBorrowAmount,
    getBorrowingCapacity,
    // Expose the system-level function for future use
    getSystemWideSafeLendingAmount,
    borrowingCapacity,
    safeLendingAmount,
    refetch: fetchUserLoans,
    getUserLoansRaw, // debug export
    getLoanByIdRaw, // debug export
  };
} 