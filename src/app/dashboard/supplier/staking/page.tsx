'use client';

import { StakingInterface } from '@/components/contracts/StakingInterface';
import { SupplierStakingHistory } from '@/components/dashboard/SupplierStakingHistory';
import { useState, useEffect } from 'react';
import * as Privy from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { BrowserProvider, Contract, parseUnits, keccak256, toUtf8Bytes } from 'ethers';
import faucetAbi from '@/lib/contracts/abis/Faucet.json';
import metrikAbi from '@/lib/contracts/abis/MockERC20.json';
import { useSendTransaction } from '@privy-io/react-auth';
import { encodeFunctionData } from 'viem';
import { useDisconnect } from 'wagmi';
import { useSeamlessTransaction } from '@/hooks/useSeamlessTransaction';

console.log('Staking page loaded');
console.log('Privy exports:', Privy);

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

function PrivyAddressDebug() {
  const { ready, authenticated, user } = Privy.usePrivy();
  const { wallets } = Privy.useWallets();
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = privyWallet?.address;

  console.log('Privy wallets:', wallets);
  console.log('Privy user:', user);

  if (!ready) return <div>Loading Privy...</div>;
  if (!authenticated) return <div>Not authenticated</div>;

  return (
    <div style={{background: '#e6f7ff', color: '#005580', padding: '12px', borderRadius: '4px', marginBottom: '12px'}}>
      <div><strong>User Email:</strong> {user?.email?.address || 'N/A'}</div>
      <div><strong>Privy Wallet Address:</strong> {address || 'N/A'}</div>
      <div><strong>Wallet Type:</strong> {privyWallet?.walletClientType || 'N/A'}</div>
    </div>
  );
}

export default function StakingPage() {
  const { ready, authenticated } = Privy.usePrivy();
  const { wallets } = Privy.useWallets();
  const { sendTransaction } = useSendTransaction();
  const { executeTransaction } = useSeamlessTransaction();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = privyWallet?.address;

  useEffect(() => {
    // Disconnect injected wallets for suppliers
    disconnect();
    console.log('Privy ready:', ready, 'authenticated:', authenticated);
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router, disconnect]);

  if (!ready) return <div>Loading...</div>;
  if (!authenticated) return null;

  async function mintMetrik() {
    if (!address) {
      alert("Login first.");
      return;
    }
    setLoading(true);
    try {
      const decimals = 18;
      const amt = BigInt(parseUnits(amount, decimals).toString());
      const data = encodeFunctionData({
        abi: faucetAbi,
        functionName: 'claim',
        args: [METRIK_ADDRESS, amt],
      });
      
      // Use seamless transaction for suppliers
      const hash = await executeTransaction(
        FAUCET_ADDRESS,
        data,
        0n,
        5115 // Citrea Testnet
      );
      
      alert(`Minted ${amount} METRIK to your Privy wallet (${address})! Tx: ${hash}`);
    } catch (err: any) {
      alert(err.message || "Mint failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PrivyAddressDebug />
      <div style={{background: '#fffae6', color: '#b26a00', padding: '8px', borderRadius: '4px', marginBottom: '12px'}}>
        <strong>DEBUG:</strong> Privy ready: {String(ready)}, authenticated: {String(authenticated)}, address: {address || 'N/A'}
      </div>
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
            disabled={loading || !address}
          >
            Mint Metrik
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">You can mint any amount of Metrik tokens to your wallet.</p>
      </div>
    </div>
  );
} 