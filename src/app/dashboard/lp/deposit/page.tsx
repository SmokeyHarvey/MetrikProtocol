'use client';

import { LendingInterface } from '@/components/contracts/LendingInterface';
import { LPDepositHistory } from '@/components/dashboard/LPDepositHistory';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { BrowserProvider, Contract, parseUnits } from "ethers";
import faucetAbi from '@/lib/contracts/abis/Faucet.json';
import usdcAbi from '@/lib/contracts/abis/MockERC20.json';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS!;
const FAUCET_ADDRESS = "0x2301Fccc9a7d26fCFcd281F823e0bE0dB8a18622";

export default function LPDepositPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function mintUSDC() {
    if (!window.ethereum || !address) {
      alert("Connect your wallet first.");
      return;
    }
    setLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const faucet = new Contract(FAUCET_ADDRESS, faucetAbi, signer);
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        alert("Enter a valid amount");
        setLoading(false);
        return;
      }
      const decimals = 6;
      const amt = parseUnits(amount, decimals);
      const tx = await faucet.claim(USDC_ADDRESS, amt);
      await tx.wait();
      alert(`Minted ${amount} USDC to your wallet!`);
    } catch (err: any) {
      alert(err.message || "Mint failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <LendingInterface />
      <LPDepositHistory />
      <div className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold mb-2">Faucet: Mint USDC</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Amount of USDC"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="border rounded px-3 py-2 mb-2 w-40"
            disabled={loading}
          />
          <button
            onClick={mintUSDC}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            disabled={loading || !isConnected}
          >
            Mint USDC
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">You can mint any amount of USDC tokens to your wallet.</p>
      </div>
    </div>
  );
} 