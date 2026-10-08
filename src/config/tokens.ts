import { arcTestnet } from './wagmi';

export type Token = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  logo: string;
  chainId: number;
  /** CoinGecko id for the reference price shown in the UI (cirBTC tracks BTC). */
  coingeckoId: string;
};

/**
 * Circle tokens on Arc Testnet (testnet only).
 * Addresses from Circle docs (https://developers.circle.com/) and verified
 * on-chain via the Arc RPC (symbol() / decimals()).
 *   USDC   0x3600…0000  · 6 decimals
 *   EURC   0x89B5…D72a  · 6 decimals
 *   cirBTC 0xf0C4…32BF  · 8 decimals
 */
export const ARC_TESTNET_TOKENS: Token[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3600000000000000000000000000000000000000',
    decimals: 6,
    logo: '/assets/usdc-logo.png',
    chainId: arcTestnet.id,
    coingeckoId: 'usd-coin',
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    decimals: 6,
    logo: '/assets/eurc-logo.png',
    chainId: arcTestnet.id,
    coingeckoId: 'euro-coin',
  },
  {
    symbol: 'cirBTC',
    name: 'Circle Wrapped Bitcoin',
    address: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF',
    decimals: 8,
    logo: '/assets/cirbtc-logo.png',
    chainId: arcTestnet.id,
    coingeckoId: 'bitcoin',
  },
];
