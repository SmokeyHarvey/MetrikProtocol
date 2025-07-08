'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits } from "ethers";
import metrikAbi from "@/lib/contracts/abis/MockERC20.json";
import usdcAbi from "@/lib/contracts/abis/MockERC20.json";
import faucetAbi from "@/lib/contracts/abis/Faucet.json";

const METRIK_ADDRESS = process.env.NEXT_PUBLIC_METRIK_TOKEN_ADDRESS!;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS!;
const FAUCET_ADDRESS = "0x047B41c1E11331f7C8BB8Cc2343b34Ec1336772D";

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [selectedRole, setSelectedRole] = useState<'supplier' | 'lp' | 'verifier' | null>(null);
  const [metrikAmount, setMetrikAmount] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("");
  const [faucetLoading, setFaucetLoading] = useState(false);

  const handleRoleSelect = (role: 'supplier' | 'lp' | 'verifier') => {
    setSelectedRole(role);
  };

  useEffect(() => {
    if (isConnected && selectedRole) {
      if (selectedRole === 'supplier') {
        router.push('/dashboard/supplier/staking');
      } else if (selectedRole === 'lp') {
        router.push('/dashboard/lp/deposit');
      } else if (selectedRole === 'verifier') {
        router.push('/dashboard/owner');
      }
    }
  }, [isConnected, selectedRole, router]);

  async function claimToken(token: "metrik" | "usdc") {
    if (!window.ethereum || !address) {
      alert("Connect your wallet first.");
      return;
    }
    setFaucetLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const faucet = new Contract(FAUCET_ADDRESS, faucetAbi, signer);
      const tokenAddress = token === "metrik" ? METRIK_ADDRESS : USDC_ADDRESS;
      const amountStr = token === "metrik" ? metrikAmount : usdcAmount;
      if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
        alert("Enter a valid amount");
        setFaucetLoading(false);
        return;
      }
      const decimals = token === "metrik" ? 18 : 6;
      const amount = parseUnits(amountStr, decimals);
      const tx = await faucet.claim(tokenAddress, amount);
      await tx.wait();
      alert(`${token.toUpperCase()} claimed from faucet!`);
    } catch (err: any) {
      alert(err.message || "Claim failed");
    } finally {
      setFaucetLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Metrik Protocol
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Decentralized invoice financing and lending platform
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <div className="space-y-6">
            <p className="text-gray-600">Select your role to continue</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={() => handleRoleSelect('supplier')}
                className={`group relative flex flex-col items-center p-6 bg-white border ${
                  selectedRole === 'supplier' 
                    ? 'border-indigo-500 ring-2 ring-indigo-500' 
                    : 'border-gray-200 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500'
                } rounded-lg transition-all`}
              >
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Supplier</h3>
                <p className="mt-2 text-sm text-gray-500">Create and manage invoices</p>
              </button>

              <button
                onClick={() => handleRoleSelect('lp')}
                className={`group relative flex flex-col items-center p-6 bg-white border ${
                  selectedRole === 'lp' 
                    ? 'border-indigo-500 ring-2 ring-indigo-500' 
                    : 'border-gray-200 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500'
                } rounded-lg transition-all`}
              >
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Liquidity Provider</h3>
                <p className="mt-2 text-sm text-gray-500">Provide liquidity and earn interest</p>
              </button>

              <button
                onClick={() => handleRoleSelect('verifier')}
                className={`group relative flex flex-col items-center p-6 bg-white border ${
                  selectedRole === 'verifier' 
                    ? 'border-indigo-500 ring-2 ring-indigo-500' 
                    : 'border-gray-200 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500'
                } rounded-lg transition-all`}
              >
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Verifier</h3>
                <p className="mt-2 text-sm text-gray-500">Verify invoices and manage protocol</p>
              </button>
            </div>

            {selectedRole && (
              <div className="space-y-4">
                <p className="text-gray-600">Now connect your wallet to continue as a {selectedRole}</p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            )}

            {/* Faucet Section */}
            <div className="mt-8 border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Faucet: Mint Test Tokens</h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Amount of Metrik"
                    value={metrikAmount}
                    onChange={e => setMetrikAmount(e.target.value)}
                    className="border rounded px-3 py-2 mb-2 w-40"
                    disabled={faucetLoading}
                  />
                  <button
                    onClick={() => claimToken("metrik")}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                    disabled={faucetLoading || !isConnected}
                  >
                    Mint Metrik
                  </button>
                </div>
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Amount of USDC"
                    value={usdcAmount}
                    onChange={e => setUsdcAmount(e.target.value)}
                    className="border rounded px-3 py-2 mb-2 w-40"
                    disabled={faucetLoading}
                  />
                  <button
                    onClick={() => claimToken("usdc")}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    disabled={faucetLoading || !isConnected}
                  >
                    Mint USDC
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">You can mint any amount of test tokens to your wallet.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
