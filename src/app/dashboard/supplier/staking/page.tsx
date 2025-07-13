'use client';

import { StakingInterface } from '@/components/contracts/StakingInterface';
import { SupplierStakingHistory } from '@/components/dashboard/SupplierStakingHistory';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { BrowserProvider, Contract, parseUnits, keccak256, toUtf8Bytes } from 'ethers';
import faucetAbi from '@/lib/contracts/abis/Faucet.json';
import metrikAbi from '@/lib/contracts/abis/MockERC20.json';

const METRIK_ADDRESS = process.env.NEXT_PUBLIC_METRIK_TOKEN_ADDRESS!;
const FAUCET_ADDRESS = "0x2301Fccc9a7d26fCFcd281F823e0bE0dB8a18622";

const MINTER_ROLE = keccak256(toUtf8Bytes("MINTER_ROLE"));

function GrantMinterRoleButton({ address }: { address: string }) {
  const [loading, setLoading] = useState(false);
  const handleGrantRole = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/grant-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: MINTER_ROLE, address }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Minter role granted! Tx: ' + data.txHash);
      } else {
        alert('Error: ' + data.error);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={handleGrantRole} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 mb-4">
      {loading ? 'Granting...' : 'Get Minter Role'}
    </button>
  );
}

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function mintMetrik() {
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
      const decimals = 18;
      const amt = parseUnits(amount, decimals);
      const tx = await faucet.claim(METRIK_ADDRESS, amt);
      await tx.wait();
      alert(`Minted ${amount} METRIK to your wallet!`);
    } catch (err: any) {
      alert(err.message || "Mint failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {address && <GrantMinterRoleButton address={address} />}
      <StakingInterface />
      <SupplierStakingHistory />
      <div className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold mb-2">Faucet: Mint Metrik</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Amount of Metrik"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="border rounded px-3 py-2 mb-2 w-40"
            disabled={loading}
          />
          <button
            onClick={mintMetrik}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            disabled={loading || !isConnected}
          >
            Mint Metrik
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">You can mint any amount of Metrik tokens to your wallet.</p>
      </div>
    </div>
  );
} 