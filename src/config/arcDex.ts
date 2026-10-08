import { arcTestnet } from './wagmi';

/**
 * Arc Swap — the Uniswap-V2 DEX deployed on Arc Testnet (Circle ecosystem).
 * Verified on-chain: Router.factory() and the USDC/EURC pair reserves.
 * Ecosystem submission: https://github.com/circlefin/arc-node/issues/160
 *
 * TESTNET ONLY. No Synthra, no third-party swap API — swaps execute on-chain
 * through this router.
 */
export const ARC_DEX_CHAIN_ID = arcTestnet.id;
export const ARC_SWAP_ROUTER = '0xe27d5d256b370604f1ff060fb489c6a8e3f8a6d9' as const;
export const ARC_SWAP_FACTORY = '0x7483847d46db2920dd64efa676cf72dcf765814f' as const;
export const ARC_SWAP_SLIPPAGE_BPS = 50n; // 0.50%

/** Minimal Uniswap-V2 router ABI (quote + swap). */
export const arcRouterAbi = [
  {
    type: 'function',
    name: 'getAmountsOut',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'addLiquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' },
      { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
  },
] as const;

/** Factory: look up a pair address. */
export const arcFactoryAbi = [
  {
    type: 'function',
    name: 'getPair',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
    ],
    outputs: [{ name: 'pair', type: 'address' }],
  },
] as const;

/** Pair: reserves + token ordering. */
export const arcPairAbi = [
  {
    type: 'function',
    name: 'getReserves',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
  },
  {
    type: 'function',
    name: 'token0',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/**
 * Doubles the gas estimate with a 4M floor — headroom for Arc's native-USDC
 * precompile facade, whose transfers are under-modeled by gas estimation.
 */
export function arcGasHeadroom(estimate?: bigint): bigint {
  const floor = 4_000_000n;
  const doubled = estimate != null ? estimate * 2n : 0n;
  return doubled > floor ? doubled : floor;
}
