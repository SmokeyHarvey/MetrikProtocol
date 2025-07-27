import { useCallback, useState } from 'react';
import { useSendTransaction, usePrivy } from '@privy-io/react-auth';
import { toast } from 'react-toastify';

export function useOneClickInvoice(wallets?: any[]) {
  const { authenticated } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const [isExecuting, setIsExecuting] = useState(false);

  const executeOneClickInvoiceCreation = useCallback(async (
    supplier: string,
    uniqueId: string,
    amount: string,
    dueDate: string,
    metadata?: string
  ) => {
    if (!authenticated) {
      toast.error('Please login first');
      return;
    }

    if (!wallets || wallets.length === 0) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!supplier || !uniqueId || !amount || !dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsExecuting(true);
    
    try {
      // Use the specific privy wallet address, not just the first wallet
      const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
      const userAddress = privyWallet?.address || wallets[0]?.address;
      
      // Step 1: Prepare invoice creation transaction on backend
      console.log('🔄 Preparing one-click invoice creation...');
      const response = await fetch('/api/prepare-batch-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier,
          uniqueId,
          amount,
          dueDate,
          metadata,
          userAddress
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to prepare transaction');
      }

      const { batchCalls, summary } = await response.json();
      
      console.log('✅ Invoice creation transaction prepared:', summary);
      console.log('📋 Calls to execute:', batchCalls);

      // Step 2: Show user what will happen (only notification)
      toast.info(
        `🚀 Creating seamless invoice: ${summary.invoiceId} for ${summary.amount}`,
        { autoClose: 3000 }
      );
      
      // Debug: Log user's current state
      console.log('📊 Debug info before invoice creation:', {
        userAddress,
        supplier,
        uniqueId,
        amount: `${amount} USDC`,
        dueDate: summary.dueDate,
        invoiceContract: batchCalls[0].to
      });

      // Step 3: Execute invoice minting transaction (COMPLETELY HIDDEN)
      console.log('🚀 Minting Invoice NFT silently...');
      const mintTx = await sendTransaction(
        {
          to: batchCalls[0].to as `0x${string}`,
          data: batchCalls[0].data as `0x${string}`,
          value: batchCalls[0].value,
        },
        {
          uiOptions: {
            showWalletUIs: false, // COMPLETELY HIDE WALLET UI
          }
        }
      );

      console.log('✅ Invoice NFT minted silently:', mintTx.hash);

      // Success feedback with all details
      toast.success(
        `🎉 SEAMLESS INVOICE CREATION COMPLETED! 
        📄 Invoice: ${summary.invoiceId}
        💰 Amount: ${summary.amount}
        📅 Due: ${summary.dueDate}
        🔗 Transaction: ${mintTx.hash.slice(0, 8)}...
        ✨ Zero user interaction required!`,
        { 
          autoClose: 10000,
          onClick: () => {
            window.open(`https://sepolia.etherscan.io/tx/${mintTx.hash}`, '_blank');
          }
        }
      );

      // Also show a separate toast for easier clicking
      toast.info(
        `🔍 View on Explorer: ${mintTx.hash.slice(0, 12)}...`,
        {
          autoClose: 8000,
          onClick: () => {
            window.open(`https://explorer.testnet.citrea.xyz/tx/${mintTx.hash}`, '_blank');
          }
        }
      );

      return {
        success: true,
        mintHash: mintTx.hash,
        summary
      };

    } catch (error) {
      console.error('❌ Seamless invoice creation failed:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.warn('Seamless invoice creation cancelled');
        } else if (error.message.includes('insufficient funds')) {
          toast.error('Insufficient funds for invoice creation');
        } else if (error.message.includes('vd') || error.message.includes('execution reverted')) {
          toast.error(
            `❌ Invoice creation transaction failed! 
            💡 Possible causes:
            • Insufficient METRIK balance for gas
            • Contract validation failed
            • Network congestion on Citrea testnet
            🏠 Try: Go to Home page → Claim more tokens
            🔄 Or use traditional invoice creation method below`,
            { autoClose: 12000 }
          );
        } else {
          toast.error(`Seamless invoice creation failed: ${error.message}`);
        }
      } else {
        toast.error('Seamless invoice creation failed. Please try again.');
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

    } finally {
      setIsExecuting(false);
    }
  }, [authenticated, wallets, sendTransaction]);

  return {
    executeOneClickInvoiceCreation,
    isExecuting
  };
}