import { useState, useCallback, useEffect } from 'react';
import { useContract } from './useContract';
import { usePublicClient, useAccount, useWalletClient } from 'wagmi';
import { parseAmount, formatAmount } from '@/lib/utils/contracts';
import { type Address } from 'viem';
import { toast } from 'react-toastify';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';

export interface Invoice {
  id: string;
  invoiceId: string;
  supplier: Address;
  buyer: Address;
  creditAmount: string;
  dueDate: Date;
  ipfsHash: string;
  gatewayUrl?: string;
  isVerified: boolean;
}

interface RawInvoice {
  invoiceId: string;
  supplier: Address;
  buyer: Address;
  creditAmount: bigint;
  dueDate: bigint;
  ipfsHash: string;
  isVerified: boolean;
}

// New interface for invoice details with metadata
export interface InvoiceDetails {
  invoiceId: string;
  supplier: Address;
  buyer: Address;
  creditAmount: bigint;
  dueDate: bigint;
  ipfsHash: string;
  isVerified: boolean;
  metadata?: string; // Additional metadata field
}

export function useInvoiceNFT() {
  const { contract: invoiceNFTContract } = useContract('invoiceNFT');
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvoices = useCallback(async (userAddress: Address) => {
    if (!publicClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
      setInvoices([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get total supply first
      const totalSupply = await publicClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'totalSupply',
      }) as bigint;

      const invoicePromises = [];

      // Fetch all invoices
      for (let i = 0; i < Number(totalSupply); i++) {
        const tokenId = await publicClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'tokenByIndex',
          args: [i],
        }) as bigint;

        const invoiceDetails = await publicClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'getInvoiceDetails',
          args: [tokenId],
        }) as RawInvoice;

        if (invoiceDetails) {
          invoicePromises.push({
            id: tokenId.toString(),
            invoiceId: invoiceDetails.invoiceId,
            supplier: invoiceDetails.supplier,
            buyer: invoiceDetails.buyer,
            creditAmount: formatAmount(invoiceDetails.creditAmount),
            dueDate: new Date(Number(invoiceDetails.dueDate) * 1000),
            ipfsHash: invoiceDetails.ipfsHash,
            isVerified: invoiceDetails.isVerified
          });
        }
      }

      const formattedInvoices = await Promise.all(invoicePromises);
      setInvoices(formattedInvoices);
      return formattedInvoices;
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // New function to mint invoice NFT with metadata
  const mintInvoiceNFT = useCallback(async (
    supplier: Address,
    uniqueId: string,
    amount: string,
    dueDate: Date,
    metadata: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!walletClient || !address || !publicClient) {
        throw new Error('Wallet client, address, or public client not available.');
      }

      const parsedAmount = parseAmount(amount);
      const dueDateTimestamp = BigInt(Math.floor(dueDate.getTime() / 1000));

      const { request } = await publicClient.simulateContract({
        account: address,
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'mintInvoiceNFT',
        args: [supplier, uniqueId, parsedAmount, dueDateTimestamp, metadata],
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      // Refresh invoices list
      if (address) {
        await fetchInvoices(address);
      }

      toast.success('Invoice NFT minted successfully!');
      return hash;
    } catch (err) {
      console.error('Error minting invoice NFT:', err);
      setError(err as Error);
      toast.error('Error minting invoice NFT. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, address, publicClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // New function to verify invoice
  const verifyInvoice = useCallback(async (tokenId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!walletClient || !address || !publicClient) {
        throw new Error('Wallet client, address, or public client not available.');
      }

      const { request } = await publicClient.simulateContract({
        account: address,
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'verifyInvoice',
        args: [BigInt(tokenId)],
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      // Refresh invoices list
      if (address) {
        await fetchInvoices(address);
      }

      toast.success('Invoice verified successfully!');
      return hash;
    } catch (err: any) {
      let shortMsg = 'Error verifying invoice. Please try again.';
      if (err && err.message && err.message.includes('Invoice already verified')) {
        shortMsg = 'Invoice is already verified.';
      }
      setError(new Error(shortMsg));
      toast.error(shortMsg);
      // Do not throw the full error to avoid UI breakage
    } finally {
      setIsLoading(false);
      // Always refresh invoices after any attempt
      if (address) {
        await fetchInvoices(address);
      }
    }
  }, [walletClient, address, publicClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // New function to get invoice details
  const getInvoiceDetails = useCallback(async (tokenId: string): Promise<InvoiceDetails | null> => {
    try {
      if (!publicClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return null;
      }

      const result = await publicClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'getInvoiceDetails',
        args: [BigInt(tokenId)],
      });

      return result as InvoiceDetails;
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      return null;
    }
  }, [publicClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  const checkVerificationStatus = useCallback(async (tokenId: string) => {
    try {
      if (!publicClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return false;
      }

      const isVerified = await publicClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'isVerified',
        args: [tokenId],
      }) as boolean;

      return isVerified;
    } catch (err) {
      console.error('Error checking verification status:', err);
      throw err;
    }
  }, [publicClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  const hasVerifierRole = useCallback(async (userAddress: Address) => {
    try {
      if (!publicClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return false;
      }

      const VERIFIER_ROLE = await publicClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'VERIFIER_ROLE',
      }) as string;

      const hasRole = await publicClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'hasRole',
        args: [VERIFIER_ROLE, userAddress],
      }) as boolean;

      return hasRole;
    } catch (err) {
      console.error('Error checking verifier role:', err);
      return false;
    }
  }, [publicClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  const approveInvoice = useCallback(async (tokenId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!walletClient || !address || !publicClient) {
        throw new Error('Wallet client, address, or public client not available.');
      }

      const { request } = await publicClient.simulateContract({
        account: address,
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.LENDING_POOL, tokenId],
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (err) {
      console.error('Error approving invoice:', err);
      setError(err as Error);
      toast.error('Error approving invoice. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, address, publicClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  const isInvoiceApproved = useCallback(async (tokenId: string) => {
    try {
      if (!publicClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return false;
      }

      const approvedAddress = await publicClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'getApproved',
        args: [tokenId],
      }) as string;

      return approvedAddress.toLowerCase() === CONTRACT_ADDRESSES.LENDING_POOL?.toLowerCase();
    } catch (err) {
      console.error('Error checking invoice approval:', err);
      return false;
    }
  }, [publicClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // Effect to fetch invoices when address changes
  useEffect(() => {
    if (address) {
      fetchInvoices(address);
    }
  }, [address, fetchInvoices]);

  return {
    isLoading,
    error,
    invoices,
    fetchInvoices,
    createInvoice: mintInvoiceNFT, // Renamed to reflect new mint function
    verifyInvoice,
    getInvoiceDetails,
    checkVerificationStatus,
    hasVerifierRole,
    approveInvoice,
    isInvoiceApproved,
  };
} 