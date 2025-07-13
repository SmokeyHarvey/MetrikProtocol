'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useLendingPool } from '@/hooks/useLendingPool';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { BrowserProvider, Contract, parseUnits } from "ethers";
import faucetAbi from '@/lib/contracts/abis/Faucet.json';
import usdcAbi from '@/lib/contracts/abis/MockERC20.json';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS!;
const FAUCET_ADDRESS = "0xC12b08bf710d825C733ED6169f81fF24806f9F2c";

interface LoanDetails {
  amount: string;
  dueDate: Date;
  isRepaid: boolean;
  isLiquidated: boolean;
  interestAccrued: string;
}

export default function RepayPage() {
  const { address, isConnected } = useAccount();
  const { repay, getUserActiveLoans, getUserLoanDetails, isLoading, error } = useLendingPool();
  const { getInvoiceDetails } = useInvoiceNFT();

  const [activeLoanIds, setActiveLoanIds] = useState<string[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<any | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loanDetailsMap, setLoanDetailsMap] = useState<Record<string, LoanDetails | null>>({});
  const [mintAmount, setMintAmount] = useState("");
  const [mintLoading, setMintLoading] = useState(false);

  const fetchActiveLoans = useCallback(async () => {
    if (address) {
      console.log('RepayPage: Fetching active loans for address:', address);
      const loans = await getUserActiveLoans(address);
      console.log('RepayPage: Fetched active loan IDs:', loans);
      
      // Filter out invalid loan IDs (empty, undefined, but allow 0)
      const validLoans = loans.filter(loanId => 
        loanId && loanId !== '' && loanId !== 'undefined'
      );
      console.log('RepayPage: Filtered valid loan IDs:', validLoans);
      setActiveLoanIds(validLoans);
      
      // Debug: Check if we have any loans and try to get details for the first one
      if (validLoans.length > 0) {
        console.log('RepayPage: Found valid loans, checking details for first loan:', validLoans[0]);
        try {
          const firstLoanDetails = await getUserLoanDetails(address, validLoans[0]);
          console.log('RepayPage: First loan details:', firstLoanDetails);
        } catch (err) {
          console.error('RepayPage: Error getting first loan details:', err);
        }
      } else {
        console.log('RepayPage: No valid loans found');
      }
    }
  }, [address, getUserActiveLoans, getUserLoanDetails]);

  useEffect(() => {
    fetchActiveLoans();
  }, [fetchActiveLoans]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (selectedInvoiceId && address) {
        console.log('RepayPage: Selected Invoice ID changed or address available.', { selectedInvoiceId, address });
        const details = await getUserLoanDetails(address, selectedInvoiceId);
        console.log('RepayPage: Fetched loan details:', details);
        setLoanDetails(details);

        const invDetails = await getInvoiceDetails(selectedInvoiceId);
        console.log('RepayPage: Fetched invoice details:', invDetails);
        setInvoiceDetails(invDetails);
      } else {
        console.log('RepayPage: No selected invoice ID or address, resetting details.');
        setLoanDetails(null);
        setInvoiceDetails(null);
      }
    };
    fetchDetails();
  }, [selectedInvoiceId, address, getUserLoanDetails, getInvoiceDetails]);

  useEffect(() => {
    if (!isLoading && activeLoanIds.length > 0) {
      setHasLoadedOnce(true);
    }
  }, [isLoading, activeLoanIds.length]);

  // Fetch loan details for all active loans in the background
  useEffect(() => {
    let isMounted = true;
    async function fetchAllLoanDetails() {
      if (activeLoanIds.length === 0 || !address) return;
      const detailsEntries = await Promise.all(
        activeLoanIds.map(async (loanId) => {
          try {
            const details = await getUserLoanDetails(address, loanId);
            return [loanId, details];
          } catch {
            return [loanId, null];
          }
        })
      );
      if (isMounted) {
        setLoanDetailsMap(Object.fromEntries(detailsEntries));
      }
    }
    fetchAllLoanDetails();
    return () => { isMounted = false; };
  }, [activeLoanIds, address, getUserLoanDetails]);

  const handleRepay = async () => {
    if (!selectedInvoiceId) {
      console.log('RepayPage: No invoice selected for repay.');
      return;
    }

    // Additional validation - allow '0' as valid
    if (selectedInvoiceId === '') {
      console.error('RepayPage: Invalid invoice ID selected.');
      return;
    }

    try {
      console.log('RepayPage: Initiating repay for invoice', selectedInvoiceId);
      await repay(selectedInvoiceId);
      console.log('RepayPage: Repay successful.');

      fetchActiveLoans();
      setSelectedInvoiceId('');
      setLoanDetails(null);
      setInvoiceDetails(null);
    } catch (err) {
      console.error('RepayPage: Error during repay:', err);
    }
  };

  // Helper to format USDC
  const formatUSDC = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? '0' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Helper to calculate total due
  const getTotalDue = (details: LoanDetails | null) =>
    details ? (parseFloat(details.amount) + parseFloat(details.interestAccrued)) : 0;

  // Add a row-level repay handler
  const handleRepayRow = async (loanId: string) => {
    setSelectedInvoiceId(loanId);
    await handleRepay();
  };

  // Mint USDC function
  async function mintUSDC() {
    if (!window.ethereum || !address) {
      alert("Connect your wallet first.");
      return;
    }
    setMintLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const faucet = new Contract(FAUCET_ADDRESS, faucetAbi, signer);
      if (!mintAmount || isNaN(Number(mintAmount)) || Number(mintAmount) <= 0) {
        alert("Enter a valid amount");
        setMintLoading(false);
        return;
      }
      const decimals = 6;
      const amt = parseUnits(mintAmount, decimals);
      const tx = await faucet.claim(USDC_ADDRESS, amt);
      await tx.wait();
      alert(`Minted ${mintAmount} USDC to your wallet!`);
    } catch (err: any) {
      alert(err.message || "Mint failed");
    } finally {
      setMintLoading(false);
    }
  }

  // UI
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-full">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Repay Loan</h2>
          <p className="text-gray-500 mb-6">Select an outstanding invoice to view loan details and repay your loan. Only active, non-liquidated, non-repaid loans are shown.</p>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Invoice ID</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Principal</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Interest Accrued</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Total Due</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoading && !hasLoadedOnce ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : activeLoanIds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-6">No outstanding loans found.</td>
                  </tr>
                ) : (
                  activeLoanIds.map((loanId) => {
                    const details = loanDetailsMap[loanId];
                    const isRepaid = details?.isRepaid;
                    const isLiquidated = details?.isLiquidated;
                    const disabled = isRepaid || isLiquidated;
                    return (
                      <tr key={loanId} className="hover:bg-indigo-50 transition">
                        <td className="px-4 py-2 font-mono font-medium">{loanId}</td>
                        <td className="px-4 py-2">{details ? `${formatUSDC(details.amount)} USDC` : <span className="text-gray-400">--</span>}</td>
                        <td className="px-4 py-2">{details ? `${formatUSDC(details.interestAccrued)} USDC` : <span className="text-gray-400">--</span>}</td>
                        <td className="px-4 py-2">{details ? `${formatUSDC(getTotalDue(details))} USDC` : <span className="text-gray-400">--</span>}</td>
                        <td className="px-4 py-2">{details && details.dueDate ? (details.dueDate instanceof Date ? details.dueDate.toLocaleDateString() : details.dueDate) : <span className="text-gray-400">--</span>}</td>
                        <td className="px-4 py-2">
                          {isRepaid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Repaid</span>
                          ) : isLiquidated ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Liquidated</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            onClick={() => handleRepayRow(loanId)}
                            disabled={disabled}
                          >
                            Repay
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 text-center">
              {error.message}
            </div>
          )}
        </div>
        
        {/* Mint USDC Section */}
        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-semibold mb-2">Faucet: Mint USDC</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Amount of USDC"
              value={mintAmount}
              onChange={e => setMintAmount(e.target.value)}
              className="border rounded px-3 py-2 mb-2 w-40"
              disabled={mintLoading}
            />
            <button
              onClick={mintUSDC}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              disabled={mintLoading || !isConnected}
            >
              Mint USDC
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">You can mint any amount of USDC tokens to your wallet to repay your loans.</p>
        </div>
      </div>
    </div>
  );
} 