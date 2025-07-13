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
  STAKING: '0x7B9F3f7e4DB63810122b81E4E721850eD1F06Fe1' as Address,
  LENDING_POOL: '0xA6A6360B686B9c82f6AdD080284A964B79bF66ba' as Address,
  INVOICE_NFT: '0x914dE02C017228f51eeaEa278a41536644FC0406' as Address,
  METRIK_TOKEN: '0xc1655e1B6820d86e8c947E86e78a7D2ed47909C5' as Address,
  USDC: '0x008cD4B0AFF52E1f08D94dd7bdC3548e7c5b52ba' as Address,
  BORROW_REGISTRY: '0x6A77ef46B401eA64B8429a2056B9e0dD90944f7b' as Address,
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