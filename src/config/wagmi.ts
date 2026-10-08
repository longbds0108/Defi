import { getDefaultConfig, type Chain } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

/**
 * Arc Testnet — the network Hedgora targets.
 * Params: https://docs.arc.io/arc/references/connect-to-arc
 *   Chain ID 5042002 · gas token USDC (18 decimals)
 *   RPC https://rpc.testnet.arc.io (ws wss://rpc.testnet.arc.io)
 *   Explorer https://explorer.testnet.arc.io · Faucet https://faucet.circle.com
 *
 * `iconUrl` / `iconBackground` are read by RainbowKit to render the chain logo
 * in the network switcher (custom chains have no built-in icon).
 */
export const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  iconUrl: '/assets/arc-logo.jpg',
  iconBackground: '#0a2a4d',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.io'],
      webSocket: ['wss://rpc.testnet.arc.io'],
    },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.testnet.arc.io' },
  },
  testnet: true,
} as const satisfies Chain;

/**
 * Robinhood Chain Testnet — an Arbitrum-based L2 (ETH gas).
 * Docs: https://docs.robinhood.com/chain/connecting
 *   Chain ID 46630 · public RPC https://rpc.testnet.chain.robinhood.com/rpc
 *   Explorer https://explorer.testnet.chain.robinhood.com
 */
export const robinhoodTestnet = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  iconUrl: '/assets/robinhood-chain.png',
  iconBackground: '#c9f31d',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.chain.robinhood.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Robinhood Explorer', url: 'https://explorer.testnet.chain.robinhood.com' },
  },
  testnet: true,
} as const satisfies Chain;

/**
 * wagmi + RainbowKit configuration.
 *
 * TESTNET ONLY — this app never uses mainnet chains or tokens. Arc Testnet is
 * listed first (the app's default); Robinhood Chain Testnet and Sepolia keep the
 * network switcher populated. Do not add mainnet chains here.
 *
 * No `transports` map is needed: `getDefaultConfig` creates an http() transport
 * per chain from each chain's default RPC (Arc uses the RPC defined above).
 *
 * Get a free WalletConnect project id at https://cloud.reown.com and put it in
 * `.env.local` as VITE_WALLETCONNECT_PROJECT_ID. Without it, injected wallets
 * (MetaMask, Rabby, Coinbase extension) still work.
 */
export const config = getDefaultConfig({
  appName: 'Hedgora',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID',
  chains: [arcTestnet, robinhoodTestnet, sepolia],
  ssr: false,
});
