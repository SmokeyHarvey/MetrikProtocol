'use client';

import { WagmiProvider as WagmiProviderV2, createConfig, http } from 'wagmi';
import { type ReactNode } from 'react';

// Citrea Testnet chain config
const citreaTestnet = {
  id: 5115,
  name: 'Citrea Testnet',
  network: 'citrea-testnet',
  nativeCurrency: {
    name: 'Citrea',
    symbol: 'CBTC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.citrea.xyz'] },
    public: { http: ['https://rpc.testnet.citrea.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Citrea Explorer', url: 'https://explorer.testnet.citrea.xyz/' },
  },
};

const config = createConfig({
  chains: [citreaTestnet],
  transports: {
    [citreaTestnet.id]: http('https://rpc.testnet.citrea.xyz'),
  },
});

export function WagmiProvider({ children }: { children: ReactNode }) {
  return <WagmiProviderV2 config={config}>{children}</WagmiProviderV2>;
} 