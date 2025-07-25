import { NextRequest, NextResponse } from 'next/server';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';
import { encodeFunctionData } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, amount, userAddress } = await request.json();

    if (!invoiceId || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: invoiceId, amount, userAddress' },
        { status: 400 }
      );
    }

    // Convert values to proper types
    const tokenId = BigInt(invoiceId);
    const borrowAmount = BigInt(Math.floor(parseFloat(amount) * 1e6)); // USDC has 6 decimals

    console.log('🔄 Preparing batch borrow transaction for:', {
      invoiceId,
      amount: `${amount} USDC`,
      tokenId: tokenId.toString(),
      borrowAmount: borrowAmount.toString(),
      userAddress
    });

    // Step 1: NFT Approval transaction data
    const nftApprovalData = encodeFunctionData({
      abi: [
        {
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.LENDING_POOL as `0x${string}`, tokenId],
    });

    // Step 2: Borrow transaction data
    const borrowData = encodeFunctionData({
      abi: [
        {
          inputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'borrow',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      functionName: 'borrow',
      args: [tokenId, borrowAmount],
    });

    // Step 3: Prepare batch transaction calls
    const batchCalls = [
      {
        to: CONTRACT_ADDRESSES.INVOICE_NFT,
        data: nftApprovalData,
        value: '0',
        description: 'Approve Invoice NFT for LendingPool'
      },
      {
        to: CONTRACT_ADDRESSES.LENDING_POOL,
        data: borrowData,
        value: '0',
        description: 'Borrow USDC against invoice'
      }
    ];

    console.log('✅ Batch borrow transaction prepared:', {
      totalCalls: batchCalls.length,
      nftApprovalTo: CONTRACT_ADDRESSES.INVOICE_NFT,
      borrowTo: CONTRACT_ADDRESSES.LENDING_POOL
    });

    return NextResponse.json({
      success: true,
      batchCalls,
      summary: {
        action: 'Borrow USDC',
        amount: `${amount} USDC`,
        invoiceId: invoiceId,
        steps: [
          'Approve Invoice NFT for LendingPool contract',
          'Borrow USDC against invoice collateral'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error preparing batch borrow transaction:', error);
    return NextResponse.json(
      { 
        error: 'Failed to prepare batch borrow transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 