'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { ReactNode } from 'react';
import { WagmiProvider } from '../components/providers/WagmiProvider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PrivyProvider } from '@privy-io/react-auth';

const inter = Inter({ subsets: ["latin"] });

const citreaTestnet = {
  id: 5115,
  name: 'Citrea Testnet',
  rpcUrls: {
    default: { http: ['https://rpc.testnet.citrea.xyz'] },
    public: { http: ['https://rpc.testnet.citrea.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Citrea Explorer', url: 'https://explorer.testnet.citrea.xyz/' },
  },
  nativeCurrency: {
    name: 'Citrea',
    symbol: 'CBTC',
    decimals: 18,
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={inter.className}>
        <PrivyProvider
          appId="cmd45wlum039ql20myccjcwpv"
          config={{
            loginMethods: ['email'],
            appearance: {
              theme: 'light',
              accentColor: '#0070f3',
            },
            supportedChains: [citreaTestnet],
            // Ensure proper user isolation
            defaultChain: citreaTestnet,
            embeddedWallets: {
              createOnLogin: 'users-without-wallets',
            },
          }}
        >
        <WagmiProvider>
          <Web3Provider>
            {children}
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </Web3Provider>
        </WagmiProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}
