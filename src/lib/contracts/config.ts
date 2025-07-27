import { type Address } from 'viem';
import stakingAbi from '../../lib/contracts/abis/Staking.json';
import lendingPoolAbi from '../../lib/contracts/abis/LendingPool.json';
import invoiceNFTAbi from '../../lib/contracts/abis/InvoiceNFT.json';
import mockERC20Abi from '../../lib/contracts/abis/MockERC20.json';
import borrowRegistryAbi from '../../lib/contracts/abis/BorrowRegistry.json';

// These addresses will be updated after deployment for avalanche
// export const CONTRACT_ADDRESSES = {
//   STAKING: '0x3DA451190a75215c41267263eE8913c1a993F0C6' as Address,
//   LENDING_POOL: '0xd004bC86719274c6fE8Bd40B5117E417F0899687' as Address,
//   INVOICE_NFT: '0xC12b08bf710d825C733ED6169f81fF24806f9F2c' as Address,
//   METRIK_TOKEN: '0x1318B4eC51774271e56D2A7DE244E8d51A2528b9' as Address,
//   USDC: '0x02F47A52AC94d1D51cC21865e730Cf314fF5C01B' as Address,
// } as const;


// These addresses will be updated after deployment for citrea
export const CONTRACT_ADDRESSES = {
  STAKING: '0x8892011F931Ee2C62f2B1f223e3c268fF55806f4' as Address,
  LENDING_POOL: '0x6eAbf347D839b1F8750CA394f336a146760442B6' as Address,
  INVOICE_NFT: '0x35110B34642351061F2Cd310bB2668AE36f6F645' as Address,
  METRIK_TOKEN: '0x246a76Ea8C192FD6E75D01F1B089f9153D3Ce695' as Address,
  USDC: '0x75123FAc449707a5536e5c4f8954dB9bdF45B4DF' as Address,
  BORROW_REGISTRY: '0xd5bA4a3C184187d2C4cCb26da3B4675328578650' as Address,
} as const;

export const CONTRACT_ABIS = {
  STAKING: stakingAbi.abi,
  LENDING_POOL: lendingPoolAbi.abi,
  INVOICE_NFT: invoiceNFTAbi.abi,
  MOCK_ERC20: mockERC20Abi.abi,
  BORROW_REGISTRY: borrowRegistryAbi.abi,
} as const;

export const SUPPORTED_CHAINS = [
  // {
  //   id: 43113,
  //   name: 'Avalanche Fuji',
  //   network: 'avalanche-fuji',
  //   nativeCurrency: {
  //     name: 'Avalanche',
  //     symbol: 'AVAX',
  //     decimals: 18,
  //   },
  //   rpcUrls: {
  //     default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
  //     public: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
  //   },
  //   blockExplorers: {
  //     default: { name: 'SnowTrace', url: 'https://testnet.snowtrace.io' },
  //   },
  // },
  {
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
  },
] as const; 