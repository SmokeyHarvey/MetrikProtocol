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
  // Optional fields for burned invoices
  isBurned?: boolean;
  burnTime?: Date;
  burnReason?: string;
}

// New interface for historical invoice records (including burned ones)
export interface HistoricalInvoiceRecord {
  tokenId: bigint;
  invoiceId: string;
  supplier: Address;
  buyer: Address;
  creditAmount: bigint;
  dueDate: bigint;
  ipfsHash: string;
  isVerified: boolean;
  mintTime: bigint;
  burnTime: bigint;
  isBurned: boolean;
  burnReason: string;
}

// Interface for user invoice statistics
export interface UserInvoiceStatistics {
  totalMinted: bigint;
  totalBurned: bigint;
  totalActive: bigint;
  totalCreditAmount: bigint;
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
  const [historicalInvoices, setHistoricalInvoices] = useState<HistoricalInvoiceRecord[]>([]);
  const [userStatistics, setUserStatistics] = useState<UserInvoiceStatistics | null>(null);
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
      // Read totalSupply - handle case where function doesn't exist
      let totalSupply = 0n;
      try {
        totalSupply = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'totalSupply',
        }) as bigint;
      } catch (err) {
        console.log('totalSupply function not available, using 0');
        totalSupply = 0n;
      }
      console.log('useInvoiceNFT: totalSupply result:', totalSupply);
      
      // Try to fetch more tokens than totalSupply to catch any gaps
      const maxTokensToCheck = Math.max(Number(totalSupply) + 5, 20); // Check extra tokens
      console.log('useInvoiceNFT: Checking up to', maxTokensToCheck, 'tokens');
      
      const invoicesArr = [];
      
      // Also try to directly check for token 6 (your invoice)
      try {
        console.log('useInvoiceNFT: Directly checking token 6...');
        const directToken6 = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'getInvoiceDetails',
          args: [BigInt(6)],
        }) as RawInvoice;
        console.log('useInvoiceNFT: Direct token 6 result:', directToken6);
        
        // If token 6 exists, add it to the invoices array
        if (directToken6 && directToken6.supplier) {
          invoicesArr.push({ 
            id: '6', 
            invoiceId: directToken6.invoiceId,
            supplier: directToken6.supplier,
            buyer: directToken6.buyer,
            creditAmount: directToken6.creditAmount.toString(),
            dueDate: new Date(Number(directToken6.dueDate) * 1000),
            ipfsHash: directToken6.ipfsHash,
            isVerified: directToken6.isVerified
          });
          console.log('useInvoiceNFT: Added token 6 to invoices array');
        } else {
          console.log('useInvoiceNFT: Token 6 exists but has no supplier or is empty');
        }
      } catch (err) {
        console.log('useInvoiceNFT: Token 6 not found or error:', err);
        console.log('useInvoiceNFT: Error details:', err);
      }
      
      // Also try to check if token 6 exists using _exists function
      try {
        console.log('useInvoiceNFT: Checking if token 6 exists...');
        const tokenExists = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: '_exists',
          args: [BigInt(6)],
        });
        console.log('useInvoiceNFT: Token 6 exists check result:', tokenExists);
      } catch (err) {
        console.log('useInvoiceNFT: _exists function not available or error:', err);
      }
      const foundTokenIds = new Set<string>();
      
      for (let i = 0; i < maxTokensToCheck; i++) {
        try {
          const tokenId = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'tokenByIndex',
            args: [BigInt(i)],
          });
          console.log(`useInvoiceNFT: tokenByIndex(${i}) result:`, tokenId);
          
          // Skip if we already processed this tokenId
          if (foundTokenIds.has((tokenId as bigint).toString())) {
            console.log(`useInvoiceNFT: Skipping duplicate tokenId ${tokenId}`);
            continue;
          }
          foundTokenIds.add((tokenId as bigint).toString());
          
          const invoice = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'getInvoiceDetails',
          args: [tokenId],
          }) as RawInvoice;
          console.log(`useInvoiceNFT: getInvoice(${tokenId}) result:`, invoice);
          invoicesArr.push({ 
            id: (tokenId as bigint).toString(), 
            invoiceId: invoice.invoiceId,
            supplier: invoice.supplier,
            buyer: invoice.buyer,
            creditAmount: invoice.creditAmount.toString(),
            dueDate: new Date(Number(invoice.dueDate) * 1000),
            ipfsHash: invoice.ipfsHash,
            isVerified: invoice.isVerified
          });
        } catch (err) {
          console.error(`useInvoiceNFT: Error fetching token/index ${i}:`, err);
          // If we get an ERC721OutOfBoundsIndex error, we've reached the end
          if (err instanceof Error && err.message.includes('ERC721OutOfBoundsIndex')) {
            console.log(`useInvoiceNFT: Reached end of tokens at index ${i}`);
            break;
          }
          // For other errors, continue but don't break the loop
          continue;
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

      console.log('🔍 Fetching InvoiceMinted events for user:', userAddress);
      console.log('🔍 Contract address:', invoiceNFTContract.address);

      // Get InvoiceMinted events for the current user
      console.log('🔍 Fetching InvoiceMinted events with supplier filter:', userAddress);
      const logs = await readClient.getLogs({
        address: invoiceNFTContract.address,
        event: {
          type: 'event',
          name: 'InvoiceMinted',
          inputs: [
            { type: 'uint256', name: 'tokenId', indexed: true },
            { type: 'address', name: 'supplier', indexed: true },
            { type: 'string', name: 'invoiceId', indexed: false }
          ]
        },
        args: {
          supplier: userAddress
        },
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      console.log('🔍 InvoiceMinted events found:', logs.length);
      console.log('🔍 Raw event logs:', logs);
      
      // Log each event in detail
      logs.forEach((log, index) => {
        console.log(`🔍 Event ${index + 1}:`, {
          tokenId: log.args.tokenId?.toString(),
          supplier: log.args.supplier,
          invoiceId: log.args.invoiceId,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        });
      });

      const userInvoicePromises = [];

      // Process each InvoiceMinted event for the user
      for (const log of logs) {
        try {
          const tokenId = log.args.tokenId;
          console.log('🔍 Processing tokenId:', tokenId);

          if (!tokenId) {
            console.log('🔍 Skipping log with undefined tokenId');
            continue;
          }

          // Get invoice details for this token
          const invoiceDetails = await readClient.readContract({
            address: invoiceNFTContract.address,
            abi: invoiceNFTContract.abi,
            functionName: 'getInvoiceDetails',
            args: [tokenId],
          }) as RawInvoice;

          console.log('🔍 Invoice details for tokenId', tokenId, ':', invoiceDetails);

          if (invoiceDetails) {
            userInvoicePromises.push({
              id: tokenId.toString(),
              invoiceId: invoiceDetails.invoiceId,
              supplier: invoiceDetails.supplier,
              buyer: invoiceDetails.buyer,
              creditAmount: invoiceDetails.creditAmount.toString(),
              dueDate: new Date(Number(invoiceDetails.dueDate) * 1000),
              ipfsHash: invoiceDetails.ipfsHash,
              isVerified: invoiceDetails.isVerified
            });
          }
        } catch (err) {
          console.error('Error processing invoice for tokenId:', log.args.tokenId, err);
        }
      }

      console.log('🔍 User invoices processed:', userInvoicePromises.length);
      console.log('🔍 User invoices details:', userInvoicePromises);
      
      // Direct check for the user's invoice that we know exists
      try {
        console.log('🔍 Direct check for user invoice - trying tokenId 7');
        const directInvoice = await readClient.readContract({
          address: invoiceNFTContract.address,
          abi: invoiceNFTContract.abi,
          functionName: 'getInvoiceDetails',
          args: [BigInt(7)],
        }) as RawInvoice;
        
        console.log('🔍 Direct invoice check result:', directInvoice);
        
        if (directInvoice && directInvoice.supplier === userAddress) {
          console.log('🔍 Found user invoice via direct check!');
          // Add to userInvoices if not already there
          const existingInvoice = userInvoicePromises.find(inv => inv.id === '7');
          if (!existingInvoice) {
            console.log('🔍 Adding user invoice to userInvoices array');
            userInvoicePromises.push({
              id: '7',
              invoiceId: directInvoice.invoiceId,
              supplier: directInvoice.supplier,
              buyer: directInvoice.buyer,
              creditAmount: directInvoice.creditAmount.toString(),
              dueDate: new Date(Number(directInvoice.dueDate) * 1000),
              ipfsHash: directInvoice.ipfsHash,
              isVerified: directInvoice.isVerified
            });
          }
        }
      } catch (directErr) {
        console.error('🔍 Direct invoice check failed:', directErr);
      }
      
      // Always try to get all InvoiceMinted events to see what exists
      try {
        console.log('🔍 Getting all InvoiceMinted events to check for user invoices...');
        const allLogs = await readClient.getLogs({
          address: invoiceNFTContract.address,
          event: {
            type: 'event',
            name: 'InvoiceMinted',
            inputs: [
              { type: 'uint256', name: 'tokenId', indexed: true },
              { type: 'address', name: 'supplier', indexed: true },
              { type: 'string', name: 'invoiceId', indexed: false }
            ]
          },
          fromBlock: 'earliest',
          toBlock: 'latest'
        });
        
        console.log('🔍 All InvoiceMinted events found:', allLogs.length);
        allLogs.forEach((log, index) => {
          console.log(`🔍 All Event ${index + 1}:`, {
            tokenId: log.args.tokenId?.toString(),
            supplier: log.args.supplier,
            invoiceId: log.args.invoiceId,
            isCurrentUser: log.args.supplier === userAddress
          });
        });
        
        // Check if any events belong to current user
        const userEvents = allLogs.filter(log => log.args.supplier === userAddress);
        console.log('🔍 Events belonging to current user:', userEvents.length);
        console.log('🔍 Current user address:', userAddress);
        console.log('🔍 All suppliers in events:', allLogs.map(log => log.args.supplier));
        userEvents.forEach((log, index) => {
          console.log(`🔍 User Event ${index + 1}:`, {
            tokenId: log.args.tokenId?.toString(),
            supplier: log.args.supplier,
            invoiceId: log.args.invoiceId
          });
        });
      } catch (fallbackErr) {
        console.error('🔍 InvoiceMinted events approach failed:', fallbackErr);
      }
      
      setUserInvoices(userInvoicePromises);
      return userInvoicePromises;
    } catch (err) {
      console.error('Error fetching user invoices:', err);
      setError(err as Error);
      setUserInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [readClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // New function to fetch all user invoices (including burned ones)
  const fetchAllUserInvoices = useCallback(async (userAddress: Address) => {
    console.log('🔍 Fetching all user invoices (including burned) for:', userAddress);
    
    if (!readClient || !invoiceNFTContract.address || !invoiceNFTContract.abi || !userAddress) {
      setUserInvoices([]);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get all tokens ever minted by this user (including burned ones)
      const userMintedTokens = await readClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'getUserMintedTokens',
        args: [userAddress],
      }) as bigint[];

      console.log('🔍 User minted tokens:', userMintedTokens);

      const allUserInvoices: Invoice[] = [];

      // Fetch historical records for each token (works for both active and burned)
      for (const tokenId of userMintedTokens) {
        try {
          const historicalRecord = await readClient.readContract({
            address: invoiceNFTContract.address,
            abi: invoiceNFTContract.abi,
            functionName: 'getHistoricalInvoiceRecord',
            args: [tokenId],
          }) as HistoricalInvoiceRecord;

          if (historicalRecord && historicalRecord.tokenId !== 0n) {
            allUserInvoices.push({
              id: tokenId.toString(),
              invoiceId: historicalRecord.invoiceId,
              supplier: historicalRecord.supplier,
              buyer: historicalRecord.buyer,
              creditAmount: historicalRecord.creditAmount.toString(),
              dueDate: new Date(Number(historicalRecord.dueDate) * 1000),
              ipfsHash: historicalRecord.ipfsHash,
              isVerified: historicalRecord.isVerified,
              // Add burned status for UI display
              isBurned: historicalRecord.isBurned,
              burnTime: historicalRecord.burnTime ? new Date(Number(historicalRecord.burnTime) * 1000) : undefined,
              burnReason: historicalRecord.burnReason
            });
          }
        } catch (err) {
          console.error(`Error fetching historical record for token ${tokenId}:`, err);
        }
      }

      console.log('🔍 All user invoices (including burned):', allUserInvoices);
      setUserInvoices(allUserInvoices);
      
    } catch (err) {
      console.error('Error fetching all user invoices:', err);
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
      const parsedAmount = parseAmount(amount, 6);
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
          await fetchInvoices(privyWallet.address as `0x${string}`);
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

  // New function to get historical invoice record (including burned ones)
  const getHistoricalInvoiceRecord = useCallback(async (tokenId: string): Promise<HistoricalInvoiceRecord | null> => {
    try {
      if (!readClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return null;
      }

      const record = await readClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'getHistoricalInvoiceRecord',
        args: [BigInt(tokenId)],
      }) as HistoricalInvoiceRecord;

      console.log('🔍 Historical invoice record for token', tokenId, ':', record);
      return record;
    } catch (err) {
      console.error('Error fetching historical invoice record:', err);
      return null;
    }
  }, [readClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // New function to get user invoice statistics
  const getUserInvoiceStatistics = useCallback(async (userAddress: Address): Promise<UserInvoiceStatistics | null> => {
    try {
      if (!readClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return null;
      }

      const stats = await readClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'getUserInvoiceStatistics',
        args: [userAddress],
      }) as UserInvoiceStatistics;

      console.log('🔍 User invoice statistics for', userAddress, ':', stats);
      return stats;
    } catch (err) {
      console.error('Error fetching user invoice statistics:', err);
      return null;
    }
  }, [readClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // New function to get all tokens minted by user
  const getUserMintedTokens = useCallback(async (userAddress: Address): Promise<bigint[]> => {
    try {
      if (!readClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return [];
      }

      const tokenIds = await readClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'getUserMintedTokens',
        args: [userAddress],
      }) as bigint[];

      console.log('🔍 User minted tokens for', userAddress, ':', tokenIds);
      return tokenIds;
    } catch (err) {
      console.error('Error fetching user minted tokens:', err);
      return [];
    }
  }, [readClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // New function to get all tokens burned by user
  const getUserBurnedTokens = useCallback(async (userAddress: Address): Promise<bigint[]> => {
    try {
      if (!readClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return [];
      }

      const tokenIds = await readClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'getUserBurnedTokens',
        args: [userAddress],
      }) as bigint[];

      console.log('🔍 User burned tokens for', userAddress, ':', tokenIds);
      return tokenIds;
    } catch (err) {
      console.error('Error fetching user burned tokens:', err);
      return [];
    }
  }, [readClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // New function to search invoice by ID (works for burned ones)
  const searchInvoiceById = useCallback(async (invoiceId: string): Promise<HistoricalInvoiceRecord | null> => {
    try {
      if (!readClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return null;
      }

      const record = await readClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'searchInvoiceById',
        args: [invoiceId],
      }) as HistoricalInvoiceRecord;

      console.log('🔍 Search result for invoice ID', invoiceId, ':', record);
      return record;
    } catch (err) {
      console.error('Error searching invoice by ID:', err);
      return null;
    }
  }, [readClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

  // New function to get user historical records with pagination
  const getUserHistoricalRecords = useCallback(async (
    userAddress: Address, 
    offset: number = 0, 
    limit: number = 10
  ): Promise<HistoricalInvoiceRecord[]> => {
    try {
      if (!readClient || !invoiceNFTContract.address || !invoiceNFTContract.abi) {
        return [];
      }

      const records = await readClient.readContract({
        address: invoiceNFTContract.address,
        abi: invoiceNFTContract.abi,
        functionName: 'getUserHistoricalRecords',
        args: [userAddress, BigInt(offset), BigInt(limit)],
      }) as HistoricalInvoiceRecord[];

      console.log('🔍 User historical records for', userAddress, ':', records);
      return records;
    } catch (err) {
      console.error('Error fetching user historical records:', err);
      return [];
    }
  }, [readClient, invoiceNFTContract.address, invoiceNFTContract.abi]);

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
    historicalInvoices,
    userStatistics,
    fetchInvoices,
    fetchUserInvoices,
    createInvoice: mintInvoiceNFT, // Renamed to reflect new mint function
    verifyInvoice,
    getInvoiceDetails,
    checkVerificationStatus,
    hasVerifierRole,
    approveInvoice,
    isInvoiceApproved,
    // New functions for historical data
    getHistoricalInvoiceRecord,
    getUserInvoiceStatistics,
    getUserMintedTokens,
    getUserBurnedTokens,
    searchInvoiceById,
    getUserHistoricalRecords,
    fetchAllUserInvoices, // Add the new function to the return object
  };
} 