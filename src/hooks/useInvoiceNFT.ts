import { useState, useCallback, useEffect } from 'react';
import { useContract } from './useContract';
import { usePublicClient, useAccount, useWalletClient } from 'wagmi';
import { parseAmount, formatAmount } from '@/lib/utils/contracts';
import { type Address } from 'viem';
import { toast } from 'react-toastify';
import { useAnimatedValue } from './useAnimatedValue';
import { useWallets, useSendTransaction } from '@privy-io/react-auth';
import { encodeFunctionData } from 'viem';
import { useSeamlessTransaction } from './useSeamlessTransaction';

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

export function useInvoiceNFT(address?: Address) {
  console.log('useInvoiceNFT hook called with address:', address);
  const { contract: invoiceNFTContract } = useContract('invoiceNFT');
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address: currentAddress } = useAccount();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const { executeTransaction } = useSeamlessTransaction();
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const isPrivy = !!privyWallet?.address;
  const readClient = publicClient;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [userInvoices, setUserInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvoices = useCallback(async (userAddress: Address) => {
    console.log('useInvoiceNFT fetchInvoices debug:', {
      readClient,
      contractAddress: invoiceNFTContract.address,
      abi: invoiceNFTContract.abi,
      userAddress
    });
    if (!readClient || !invoiceNFTContract.address || !invoiceNFTContract.abi || !userAddress) {
      setInvoices([]);
      setError(new Error('Fetch invoices: missing address or contract.'));
      return;
    }
    try {
      // Read totalSupply
      const totalSupply = await readClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'totalSupply',
      });
      console.log('useInvoiceNFT: totalSupply result:', totalSupply);
      // For each token, get tokenId and details
      const invoicesArr = [];
      for (let i = 0; i < Number(totalSupply); i++) {
        try {
          const tokenId = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'tokenByIndex',
            args: [BigInt(i)],
          });
          console.log(`useInvoiceNFT: tokenByIndex(${i}) result:`, tokenId);
          const invoice = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'getInvoiceDetails',
          args: [tokenId],
          });
          console.log(`useInvoiceNFT: getInvoice(${tokenId}) result:`, invoice);
          invoicesArr.push({ id: tokenId, ...invoice });
        } catch (err) {
          console.error(`useInvoiceNFT: Error fetching token/index ${i}:`, err);
        }
      }
      setInvoices(invoicesArr);
      setError(null);
    } catch (err) {
      console.error('useInvoiceNFT: Error in fetchInvoices:', err);
      setInvoices([]);
      setError(err instanceof Error ? err : new Error('Unknown error fetching invoices'));
    }
  }, [readClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  const fetchUserInvoices = useCallback(async (userAddress: Address) => {
    console.log('useInvoiceNFT fetchUserInvoices debug:', {
      readClient,
      contractAddress: invoiceNFTContract.address,
      abi: invoiceNFTContract.abi,
      userAddress
    });
    if (!readClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
      setUserInvoices([]);
      setError(new Error('Fetch user invoices: missing address or contract.'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get user's balance
      const balance = await readClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'balanceOf',
        args: [userAddress],
      }) as bigint;

      const userInvoicePromises = [];

      // Fetch user's invoices
      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'tokenOfOwnerByIndex',
          args: [userAddress, i],
        }) as bigint;

        const invoiceDetails = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'getInvoiceDetails',
          args: [tokenId],
        }) as RawInvoice;

        if (invoiceDetails) {
          userInvoicePromises.push({
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

      // Remove unnecessary Promise.all, use array directly
      const formattedUserInvoices = userInvoicePromises;
      setUserInvoices(formattedUserInvoices);
      return formattedUserInvoices;
    } catch (err) {
      console.error('Error fetching user invoices:', err);
      setError(err as Error);
      setUserInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [readClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

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
      const parsedAmount = parseAmount(amount);
      const dueDateTimestamp = BigInt(Math.floor(dueDate.getTime() / 1000));
      if (isPrivy) {
        const data = encodeFunctionData({
          abi: invoiceNFTContract.abi,
          functionName: 'mintInvoiceNFT',
          args: [supplier, uniqueId, parsedAmount, dueDateTimestamp, metadata],
        });
        const hash = await executeTransaction(
          invoiceNFTContract.address,
          data,
          0n,
          publicClient?.chain.id
        );
        if (supplier) {
          await fetchInvoices(supplier);
          await fetchUserInvoices(supplier);
        }
        toast.success('Invoice NFT minted successfully!');
        return hash;
      }
      if (!walletClient || !currentAddress || !publicClient) {
        throw new Error('Wallet client, address, or public client not available.');
      }
      const { request } = await publicClient.simulateContract({
        account: currentAddress,
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'mintInvoiceNFT',
        args: [supplier, uniqueId, parsedAmount, dueDateTimestamp, metadata],
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      if (currentAddress) {
        await fetchInvoices(currentAddress);
        await fetchUserInvoices(currentAddress);
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
  }, [walletClient, currentAddress, publicClient, invoiceNFTContract.address, invoiceNFTContract.abi, isPrivy, executeTransaction, fetchInvoices, fetchUserInvoices]);

  // New function to verify invoice
  const verifyInvoice = useCallback(async (tokenId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      if (isPrivy) {
        const data = encodeFunctionData({
          abi: invoiceNFTContract.abi,
          functionName: 'verifyInvoice',
          args: [BigInt(tokenId)],
        });
        const { hash } = await sendTransaction({
          to: invoiceNFTContract.address,
          data,
          value: 0n,
          chainId: publicClient?.chain.id,
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        if (privyWallet?.address) {
          await fetchInvoices(privyWallet.address);
        }
        toast.success('Invoice verified successfully!');
        return hash;
      }
      if (!walletClient || !currentAddress || !publicClient) {
        throw new Error('Wallet client, address, or public client not available.');
      }
      const { request } = await publicClient.simulateContract({
        account: currentAddress,
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'verifyInvoice',
        args: [BigInt(tokenId)],
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      if (currentAddress) {
        await fetchInvoices(currentAddress);
      }
      toast.success('Invoice verified successfully!');
      return hash;
    } catch (err) {
      console.error('Error verifying invoice:', err);
      setError(err as Error);
      toast.error('Error verifying invoice. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, currentAddress, publicClient, invoiceNFTContract.address, invoiceNFTContract.abi, isPrivy, sendTransaction, fetchInvoices, privyWallet]);

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

      if (!walletClient || !currentAddress || !publicClient) {
        throw new Error('Wallet client, address, or public client not available.');
      }

      const { request } = await publicClient.simulateContract({
        account: currentAddress,
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
  }, [walletClient, currentAddress, publicClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

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
    console.log('useInvoiceNFT useEffect running with address:', address);
    if (address && typeof address === 'string' && address.length > 0) {
      console.log('useInvoiceNFT: Fetching invoices for address:', address);
      fetchInvoices(address);
      fetchUserInvoices(address);
    } else {
      console.log('useInvoiceNFT: Skipping fetch, missing address:', address);
      setError(new Error('Effect: missing address, not fetching invoices.'));
    }
  }, [address, fetchInvoices, fetchUserInvoices]);

  return {
    isLoading,
    error,
    invoices,
    userInvoices,
    fetchInvoices,
    fetchUserInvoices,
    createInvoice: mintInvoiceNFT, // Renamed to reflect new mint function
    verifyInvoice,
    getInvoiceDetails,
    checkVerificationStatus,
    hasVerifierRole,
    approveInvoice,
    isInvoiceApproved,
  };
} 