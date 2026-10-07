/**
 * Token logo URLs keyed by symbol.
 * - USDC / EURC use the official Circle marks already bundled in public/assets.
 * - Other native tokens fall back to CoinGecko's coin images.
 * Sources: https://developers.circle.com/ · https://docs.coingecko.com/
 */
const LOGOS: Record<string, string> = {
  USDC: '/assets/usdc-logo.png',
  EURC: '/assets/eurc-logo.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  WETH: 'https://assets.coingecko.com/coins/images/2518/large/weth.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png',
  POL: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png',
};

/** Best-effort logo URL for a token symbol (e.g. the chain's native currency). */
export function tokenLogo(symbol?: string): string | undefined {
  if (!symbol) return undefined;
  const s = symbol.toUpperCase();
  if (LOGOS[s]) return LOGOS[s];
  if (s.includes('USDC')) return LOGOS.USDC;
  if (s.includes('EURC')) return LOGOS.EURC;
  if (s.includes('ETH')) return LOGOS.ETH;
  return undefined;
}
