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
  STAKING: '0x7D05A56BD8b0Cc56ee1a458716c492103b91CaB9' as Address,
  LENDING_POOL: '0x23F7900995069D3FA9406A3d7E04b57d0B2C63c3' as Address,
  INVOICE_NFT: '0x44eF03F58d4787485E78f376D0e9A217d380C58E' as Address,
  METRIK_TOKEN: '0xF7D33AF061329FF299DE9Bebb95A1d2183CD0EB2' as Address,
  USDC: '0x047706312745A13d03E6D3468B642C8306dD1650' as Address,
  BORROW_REGISTRY: '0xa4626c9423630474B29CAF0E9E16071Df99Bbf73' as Address,
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