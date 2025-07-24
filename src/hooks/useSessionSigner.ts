import { useCallback } from 'react';
import { usePrivy, useSessionSigners } from '@privy-io/react-auth';
import { toast } from 'react-toastify';
import { encodeFunctionData } from 'viem';

export function useSessionSigner() {
  const { getAccessToken } = usePrivy();
  const { addSessionSigners } = useSessionSigners();

  const executeSeamlessTransaction = useCallback(async (
    to: string,
    data: string,
    value: bigint = 0n,
    chainId: number = 5115
  ) => {
    try {
      const identityToken = await getAccessToken();
      
      if (!identityToken) {
        throw new Error('No identity token available');
      }

      console.log('Debug - Session signer transaction:', {
        to,
        data,
        value: value.toString(),
        chainId,
        identityToken: identityToken ? 'present' : 'missing',
      });

      // For now, we'll use the server-side approach as a fallback
      // In the future, we can implement the client-side session signers
      const response = await fetch('/api/session-signer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identityToken,
          action: 'signTransaction',
          transaction: {
            to,
            data,
            value: value.toString(),
            chainId,
          },
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('Session signer API error response:', errorData);
        
        // Provide more specific error messages
        if (response.status === 500) {
          throw new Error('Server error: Session signers not configured. Please install @privy-io/server-auth and configure PRIVY_APP_SECRET.');
        } else if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request');
        } else {
          throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Transaction failed`);
        }
      }

      const result = await response.json();
      console.log('Session signer API success response:', result);
      
      if (result.success) {
        toast.success('Transaction completed successfully!');
        return result.hash;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Seamless transaction error:', error);
      toast.error(error instanceof Error ? error.message : 'Transaction failed');
      throw error;
    }
  }, [getAccessToken]);

  const executeSeamlessBatchTransactions = useCallback(async (
    transactions: Array<{
      to: string;
      data: string;
      value?: bigint;
    }>,
    chainId: number = 5115
  ) => {
    try {
      const identityToken = await getAccessToken();
      
      if (!identityToken) {
        throw new Error('No identity token available');
      }

      const response = await fetch('/api/session-signer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identityToken,
          action: 'signBatchTransactions',
          batchTransactions: {
            transactions: transactions.map(tx => ({
              to: tx.to,
              data: tx.data,
              value: (tx.value || 0n).toString(),
            })),
            chainId,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Batch transaction failed');
      }

      const result = await response.json();
      
      const successfulTransactions = result.results.filter((r: any) => r.success);
      const failedTransactions = result.results.filter((r: any) => !r.success);

      if (successfulTransactions.length > 0) {
        toast.success(`${successfulTransactions.length} transactions completed successfully!`);
      }

      if (failedTransactions.length > 0) {
        toast.warning(`${failedTransactions.length} transactions failed`);
      }

      return result.results;
    } catch (error) {
      console.error('Seamless batch transaction error:', error);
      toast.error(error instanceof Error ? error.message : 'Batch transaction failed');
      throw error;
    }
  }, [getAccessToken]);

  // Helper function to add session signers to a wallet
  const addSessionSignerToWallet = useCallback(async (address: string) => {
    try {
      console.log('Adding session signers to wallet:', address);
      
      // Try the simpler approach first
      try {
        await addSessionSigners({
          address,
          // Don't specify signers array to use default configuration
        });
        
        toast.success('Session signers added to wallet successfully!');
        console.log('Session signers added successfully');
        return;
      } catch (error) {
        console.log('First approach failed, trying alternative...', error);
        
        // Alternative approach: try with embedded wallet session signers
        await addSessionSigners({
          address,
          signers: [{
            signerId: 'embedded', // Try embedded wallet signer
            policyIds: []
          }]
        });
        
        toast.success('Session signers added to wallet successfully!');
        console.log('Session signers added successfully (alternative method)');
      }
    } catch (error) {
      console.error('Error adding session signers:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('key quorums do not belong to the app')) {
          toast.error('Authorization key not properly configured. Please check your Privy dashboard settings.');
        } else if (error.message.includes('Invalid Privy app ID')) {
          toast.error('App ID configuration issue. Please verify your app settings.');
        } else {
          toast.error(`Failed to add session signers: ${error.message}`);
        }
      } else {
        toast.error('Failed to add session signers. Please try again.');
      }
      throw error;
    }
  }, [addSessionSigners]);

  // Helper function to encode approval transactions
  const encodeApproval = useCallback((tokenAddress: string, spenderAddress: string, amount: bigint) => {
    return encodeFunctionData({
      abi: [
        {
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      functionName: 'approve',
      args: [spenderAddress as `0x${string}`, amount],
    });
  }, []);

  // Helper function to encode staking transactions
  const encodeStake = useCallback((amount: bigint, duration: bigint) => {
    return encodeFunctionData({
      abi: [
        {
          inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'duration', type: 'uint256' }
          ],
          name: 'stake',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      functionName: 'stake',
      args: [amount, duration],
    });
  }, []);

  // Helper function to encode borrowing transactions
  const encodeBorrow = useCallback((invoiceId: string, amount: bigint) => {
    return encodeFunctionData({
      abi: [
        {
          inputs: [
            { name: 'invoiceId', type: 'uint256' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'borrow',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      functionName: 'borrow',
      args: [BigInt(invoiceId), amount],
    });
  }, []);

  // Helper function to encode repayment transactions
  const encodeRepay = useCallback((loanId: string, amount: bigint) => {
    return encodeFunctionData({
      abi: [
        {
          inputs: [
            { name: 'loanId', type: 'uint256' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'repay',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      functionName: 'repay',
      args: [BigInt(loanId), amount],
    });
  }, []);

  return {
    executeSeamlessTransaction,
    executeSeamlessBatchTransactions,
    addSessionSignerToWallet,
    encodeApproval,
    encodeStake,
    encodeBorrow,
    encodeRepay,
  };
} 