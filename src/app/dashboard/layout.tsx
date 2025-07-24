'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from 'react-toastify';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { ready, authenticated, logout } = usePrivy();
  const pathname = usePathname();

  const { wallets } = useWallets();
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = privyWallet?.address;
  const [copied, setCopied] = useState(false);

  // Derive role from pathname
  const role = pathname && pathname.includes('/dashboard/supplier') ? 'supplier' 
    : pathname && pathname.includes('/dashboard/lp') ? 'lp'
    : pathname && pathname.includes('/dashboard/owner') ? 'verifier'
    : null;

  useEffect(() => {
    console.log('Dashboard layout auth check:', {
      role,
      ready,
      authenticated,
      isConnected,
      pathname
    });
    
    if (role === 'supplier') {
      if (ready && !authenticated) {
        console.log('Supplier not authenticated, redirecting to home');
        router.push('/');
        return;
      }
    } else {
    if (!isConnected) {
      console.log('Non-supplier not connected, redirecting to home');
      router.push('/');
      return;
      }
    }
    // If a role can't be determined from the pathname and the path is within /dashboard, redirect to home
    if (!role && pathname && pathname.startsWith('/dashboard')) {
      console.log('No role determined, redirecting to home');
      router.push('/');
      return;
    }
  }, [isConnected, role, router, pathname, ready, authenticated]);

  if ((role === 'supplier' && (!ready || !authenticated)) || (role !== 'supplier' && !isConnected) || !role) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const supplierNavItems = [
    { name: 'Staking', href: '/dashboard/supplier/staking' },
    { name: 'Invoice', href: '/dashboard/supplier/invoice' },
    { name: 'Borrow', href: '/dashboard/supplier/borrow' },
    { name: 'Repay', href: '/dashboard/supplier/repay' },
  ];

  const lpNavItems = [
    { name: 'Deposit', href: '/dashboard/lp/deposit' },
    { name: 'Withdraw', href: '/dashboard/lp/withdraw' },
  ];

  const ownerNavItems = [
    { name: 'Verify Invoices', href: '/dashboard/owner' },
  ];

  const navItems = role === 'supplier' ? supplierNavItems 
    : role === 'lp' ? lpNavItems 
    : ownerNavItems;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-900">
                  Metrik Protocol
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname === item.href
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {role === 'supplier' && ready && authenticated && address && (
                <>
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md">
                    <span className="font-mono text-xs text-indigo-700">{address.slice(0, 8)}...{address.slice(-4)}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(address);
                        setCopied(true);
                        toast.success('Copied Privy Wallet Address!');
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="text-xs px-2 py-1 bg-indigo-200 hover:bg-indigo-300 rounded transition"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition"
                  >
                    Logout
                  </button>
                </>
              )}
              {role !== 'supplier' && <ConnectButton />}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 