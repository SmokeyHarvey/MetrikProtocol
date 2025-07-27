'use client';

import { useState, useEffect } from 'react';
import { useStaking } from '@/hooks/useStaking';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { useLendingPool } from '@/hooks/useLendingPool';
import { useAccount, useDisconnect } from 'wagmi';
import { BorrowInterface } from '@/components/borrow/BorrowInterface';
import * as Privy from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export default function BorrowPage() {
  const { ready, authenticated } = Privy.usePrivy();
  const { wallets } = Privy.useWallets();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = privyWallet?.address;

  // Debug log for wallets and address
  console.log('BorrowPage wallets:', wallets);
  console.log('BorrowPage address:', address);

  // Only call hooks and render invoice UI if address is ready
  const isAddressReady = !!address && typeof address === 'string' && address.length > 0;

  // Always call hooks, but pass undefined if address is not ready
  const { stakedAmount } = useStaking(isAddressReady ? address : undefined);
  const { invoices, getInvoiceDetails, approveInvoice, isInvoiceApproved, fetchInvoices, error: invoiceError } = useInvoiceNFT(isAddressReady ? address : undefined);
  const { borrow, getMaxBorrowAmount } = useLendingPool(isAddressReady ? address : undefined);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<any | null>(null);
  const [selectedMaxBorrow, setSelectedMaxBorrow] = useState<string>('0');
  const [selectedBorrowInput, setSelectedBorrowInput] = useState<string>('');
  const [selectedLoading, setSelectedLoading] = useState<boolean>(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Disconnect injected wallets for suppliers
  useEffect(() => {
    disconnect();
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router, disconnect]);

  // Update debug info when relevant values change
  useEffect(() => {
    const selectedInvoiceData = invoices.find(inv => inv.id === selectedInvoice);
    console.log('Debug state update:', {
      selectedInvoice,
      selectedInvoiceData,
      invoices: invoices.map(inv => ({ id: inv.id, invoiceId: inv.invoiceId })),
      maxBorrowAmount: selectedMaxBorrow.toString(),
      borrowAmount: selectedBorrowInput
    });
  }, [invoices, selectedInvoice, selectedMaxBorrow, selectedBorrowInput]);

  // When an invoice is selected, fetch its details and max borrow amount
  useEffect(() => {
    if (selectedInvoice) {
      setSelectedLoading(true);
      setSelectedError(null);
      Promise.all([
        getInvoiceDetails(selectedInvoice),
        getMaxBorrowAmount(selectedInvoice)
      ]).then(([details, maxAmount]) => {
        setSelectedInvoiceDetails(details);
        setSelectedMaxBorrow(maxAmount);
      }).catch(() => {
        setSelectedError('Failed to fetch invoice details or max borrow amount');
      }).finally(() => {
        setSelectedLoading(false);
      });
    } else {
      setSelectedInvoiceDetails(null);
      setSelectedMaxBorrow('0');
      setSelectedBorrowInput('');
      setSelectedError(null);
    }
  }, [selectedInvoice, getInvoiceDetails, getMaxBorrowAmount]);

  useEffect(() => {
    if (!selectedLoading && invoices.length > 0) {
      setHasLoadedOnce(true);
    }
  }, [selectedLoading, invoices.length]);

  // Borrow handler for the selected invoice
  const handleSelectedBorrow = async () => {
    if (!selectedInvoice || !selectedBorrowInput) return;
    setSelectedLoading(true);
    setSelectedError(null);
    try {
      const invoiceDetails = await getInvoiceDetails(selectedInvoice);
      if (!invoiceDetails) throw new Error('Invoice not found');
      if (!invoiceDetails.isVerified) throw new Error('Invoice is not verified');
      if (invoiceDetails.supplier.toLowerCase() !== address?.toLowerCase()) throw new Error('You are not the supplier of this invoice');
      if (new Date(typeof invoiceDetails.dueDate === 'bigint' ? Number(invoiceDetails.dueDate) * 1000 : invoiceDetails.dueDate) <= new Date()) throw new Error('Invoice has expired');
      const borrowAmountWei = BigInt(selectedBorrowInput) * BigInt(1e6);
      const maxBorrowAmountWei = BigInt(selectedMaxBorrow || '0');
      if (borrowAmountWei > maxBorrowAmountWei) throw new Error(`Borrow amount exceeds maximum allowed (${(maxBorrowAmountWei / BigInt(1e6)).toString()} USDC)`);
      const isApproved = await isInvoiceApproved(selectedInvoice);
      if (!isApproved) {
        await approveInvoice(selectedInvoice);
        const isNowApproved = await isInvoiceApproved(selectedInvoice);
        if (!isNowApproved) throw new Error('Invoice approval failed. Please try again.');
      }
      await borrow(selectedInvoice, borrowAmountWei.toString());
      setSelectedInvoice(null);
      setSelectedInvoiceDetails(null);
      setSelectedMaxBorrow('0');
      setSelectedBorrowInput('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSelectedError(err.message || 'Error borrowing');
      } else {
        setSelectedError('An unexpected error occurred.');
      }
    } finally {
      setSelectedLoading(false);
    }
  };

  const inputAmount = Number(selectedBorrowInput);
const inputAmountInUSDC = !isNaN(inputAmount) ? BigInt(Math.floor(inputAmount * 1e6)) : BigInt(0);
const maxBorrow = BigInt(selectedMaxBorrow || '0');
const isInputValid = !isNaN(inputAmount) && inputAmount > 0 && inputAmountInUSDC <= maxBorrow;


  const isStaked = stakedAmount && parseFloat(stakedAmount) > 0;
  const hasVerifiedInvoices = invoices.length > 0;

  // Format max borrow for display (handles both 1e6 and 1e18 units)
  let maxBorrowDisplay = 0;
  if (Number(selectedMaxBorrow) > 1e12) {
    // Looks like 1e18 units (ETH-style)
    maxBorrowDisplay = Number(selectedMaxBorrow) / 1e18;
  } else {
    // Looks like 1e6 units (USDC-style)
    maxBorrowDisplay = Number(selectedMaxBorrow) / 1e6;
  }
  const maxBorrowDisplayFormatted = maxBorrowDisplay.toLocaleString(undefined, { maximumFractionDigits: 2 });

  // Validation for input exceeding max borrow (compare in user units)
  let inputError = '';
  if (
    selectedBorrowInput &&
    !isNaN(Number(selectedBorrowInput)) &&
    Number(selectedBorrowInput) > 0 &&
    Number(selectedBorrowInput) > maxBorrowDisplay
  ) {
    inputError = `Amount exceeds max borrow amount (${maxBorrowDisplayFormatted} USDC)`;
  }

  // DEBUG: Only show in development
  const isDev = typeof window !== 'undefined' && process.env.NODE_ENV !== 'production';

  // Debug state for all invoices
  const [allInvoices, setAllInvoices] = useState([]);
  const [allInvoicesError, setAllInvoicesError] = useState(null);

  useEffect(() => {
    if (isDev && fetchInvoices) {
      // Try to fetch all invoices (not just for this address)
      fetchInvoices(undefined)
        .then((result) => {
          setAllInvoices(result || []);
        })
        .catch((err) => {
          setAllInvoicesError(err);
          console.error('Error fetching all invoices:', err);
        });
    }
  }, [isDev, fetchInvoices]);

  // Show only verified invoices that the current user owns
  const borrowableInvoices = isAddressReady && invoices.length > 0
    ? invoices.filter(inv => inv.isVerified && inv.supplier?.toLowerCase() === address.toLowerCase())
    : [];

  // Render logic
  if (!ready) return <div>Loading Privy...</div>;
  if (!authenticated) return null;
  if (!isAddressReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-lg font-semibold text-blue-700">Waiting for Privy wallet address...</div>
        <div className="mt-2 animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-full">
        {/* Borrow stats and history UI */}
        <BorrowInterface invoices={borrowableInvoices} />
      </div>
    </div>
  );
} 