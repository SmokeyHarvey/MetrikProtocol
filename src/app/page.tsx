'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits } from "ethers";
import metrikAbi from "@/lib/contracts/abis/MockERC20.json";
import usdcAbi from "@/lib/contracts/abis/MockERC20.json";
import faucetAbi from "@/lib/contracts/abis/Faucet.json";
import { SupplierLoginButton } from '../components/borrow/SupplierLoginButton';
import { usePrivy } from '@privy-io/react-auth';

const METRIK_ADDRESS = process.env.NEXT_PUBLIC_METRIK_TOKEN_ADDRESS!;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS!;
const FAUCET_ADDRESS = "0x2301Fccc9a7d26fCFcd281F823e0bE0dB8a18622";

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { authenticated, logout, user, ready } = usePrivy();
  const [selectedRole, setSelectedRole] = useState<'supplier' | 'lp' | 'verifier' | null>(null);
  const [metrikAmount, setMetrikAmount] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("");
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleRoleSelect = (role: 'supplier' | 'lp' | 'verifier') => {
    setSelectedRole(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedRole', role);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSelectedRole(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedRole');
        // Clear any other session data
        sessionStorage.clear();
        // Clear any cached wallet data
        if (window.ethereum) {
          try {
            await (window.ethereum as any).request({ method: 'wallet_requestPermissions', params: [] });
          } catch (e) {
            // Ignore errors
          }
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('selectedRole');
      if (storedRole) setSelectedRole(storedRole as 'supplier' | 'lp' | 'verifier');
    }
  }, []);

  useEffect(() => {
    if (authenticated && selectedRole === 'supplier' && !isRedirecting) {
      console.log('Redirecting to staking page - authenticated:', authenticated, 'selectedRole:', selectedRole);
      setIsRedirecting(true);
      router.push('/dashboard/supplier/staking');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedRole');
      }
    } else if (authenticated && !selectedRole && !isRedirecting) {
      // If user is authenticated but no role is selected, assume supplier
      console.log('User authenticated but no role selected, setting as supplier');
      setSelectedRole('supplier');
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedRole', 'supplier');
      }
    } else if (isConnected && selectedRole && !isRedirecting) {
      if (selectedRole === 'lp') {
        setIsRedirecting(true);
        router.push('/dashboard/lp/deposit');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedRole');
        }
      } else if (selectedRole === 'verifier') {
        setIsRedirecting(true);
        router.push('/dashboard/owner');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedRole');
        }
      }
    }
  }, [authenticated, isConnected, selectedRole, router, isRedirecting]);

  // Reset redirecting state after timeout
  useEffect(() => {
    if (isRedirecting) {
      const timeout = setTimeout(() => {
        console.log('Redirect timeout, resetting state');
        setIsRedirecting(false);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isRedirecting]);

  // Debug logging
  useEffect(() => {
    console.log('Auth state changed:', {
      authenticated,
      selectedRole,
      isConnected,
      user: user?.email?.address
    });
  }, [authenticated, selectedRole, isConnected, user]);

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
        {/* Logout section for authenticated suppliers */}
        {authenticated && (
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm text-gray-600">Logged in as:</p>
                <p className="font-medium text-gray-900">{user?.email?.address || 'Supplier'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors"
              >
                Switch Account
              </button>
            </div>
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <p><strong>Note:</strong> If you're still seeing the same wallet address after switching accounts, try:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Clear your browser's local storage and cookies</li>
                <li>Use an incognito/private browser window</li>
                <li>Wait a few seconds after logging out before logging in with a different email</li>
              </ul>
            </div>
          </div>
        )}

        {/* Loading indicator for authentication */}
        {!ready && (
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              <span className="text-sm text-gray-600">Initializing authentication...</span>
            </div>
          </div>
        )}

        {/* Redirecting indicator */}
        {isRedirecting && (
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
              <span className="text-sm text-gray-600">Redirecting to dashboard...</span>
            </div>
          </div>
        )}

        {/* Manual redirect button for stuck authentication */}
        {authenticated && selectedRole === 'supplier' && !isRedirecting && (
          <div className="bg-yellow-50 p-4 rounded-lg shadow-md border border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm text-yellow-800">Authentication successful!</p>
                <p className="text-xs text-yellow-600">If you're not redirected automatically, click the button below.</p>
              </div>
              <button
                onClick={() => {
                  setIsRedirecting(true);
                  router.push('/dashboard/supplier/staking');
                }}
                className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md text-sm font-medium transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

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
                  {selectedRole === 'supplier' ? (
                    <SupplierLoginButton />
                  ) : (
                  <ConnectButton />
                  )}
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
