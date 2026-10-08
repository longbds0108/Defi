// Seed a USDC/cirBTC liquidity pool on Arc Testnet via the Arc Swap V2 router.
// Creates the pair (if missing) and adds the first liquidity, which sets the
// initial price = USDC_AMOUNT / CIRBTC_AMOUNT. After it runs, USDC<->cirBTC is
// swappable on the app's Swap page.
//
// Usage (TESTNET wallet only — never a mainnet / real key):
//   PRIVATE_KEY=0x... USDC_AMOUNT=100 CIRBTC_AMOUNT=0.001 node scripts/seed-pool.mjs
//
// The private key is read from the environment on your machine only; it is never
// printed or sent anywhere except to sign the transactions against the Arc RPC.

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = process.env.ARC_RPC || 'https://rpc.testnet.arc.io';
const CHAIN_ID = 5042002;
const ROUTER = '0xe27d5d256b370604f1ff060fb489c6a8e3f8a6d9';
const FACTORY = '0x7483847d46db2920dd64efa676cf72dcf765814f';
const USDC = '0x3600000000000000000000000000000000000000';
const CIRBTC = '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF';
const SLIPPAGE_BPS = 50n;

const USDC_HUMAN = process.env.USDC_AMOUNT || '100';
const CIRBTC_HUMAN = process.env.CIRBTC_AMOUNT || '0.001';

const pkRaw = process.env.PRIVATE_KEY;
if (!pkRaw) {
  console.error('✗ Missing PRIVATE_KEY. Use a TESTNET wallet key.');
  console.error('  PRIVATE_KEY=0x... USDC_AMOUNT=100 CIRBTC_AMOUNT=0.001 node scripts/seed-pool.mjs');
  process.exit(1);
}
const account = privateKeyToAccount(pkRaw.startsWith('0x') ? pkRaw : `0x${pkRaw}`);

const arc = {
  id: CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

const pub = createPublicClient({ chain: arc, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: arc, transport: http(RPC) });

const erc20Abi = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
];
const routerAbi = [
  {
    type: 'function', name: 'addLiquidity', stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' }, { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' }, { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
  },
];
const factoryAbi = [
  { type: 'function', name: 'getPair', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'address' }] },
];
const pairAbi = [
  { type: 'function', name: 'getReserves', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint112' }, { type: 'uint112' }, { type: 'uint32' }] },
];

function gasHeadroom(estimate) {
  const floor = 4_000_000n;
  const doubled = estimate ? estimate * 2n : 0n;
  return doubled > floor ? doubled : floor;
}

async function ensureApprove(token, symbol, raw) {
  const allowance = await pub.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [account.address, ROUTER] });
  if (allowance >= raw) {
    console.log(`  ${symbol}: already approved`);
    return;
  }
  console.log(`  ${symbol}: approving…`);
  const hash = await wallet.writeContract({ address: token, abi: erc20Abi, functionName: 'approve', args: [ROUTER, raw], gas: 2_000_000n });
  await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${symbol}: approved (${hash})`);
}

async function main() {
  const chainId = await pub.getChainId();
  if (chainId !== CHAIN_ID) throw new Error(`RPC chainId ${chainId} != Arc Testnet ${CHAIN_ID}`);

  const [usdcDec, cirDec] = await Promise.all([
    pub.readContract({ address: USDC, abi: erc20Abi, functionName: 'decimals' }),
    pub.readContract({ address: CIRBTC, abi: erc20Abi, functionName: 'decimals' }),
  ]);
  const rawUsdc = parseUnits(USDC_HUMAN, usdcDec);
  const rawCir = parseUnits(CIRBTC_HUMAN, cirDec);

  console.log(`Wallet: ${account.address}`);
  console.log(`Seeding USDC/cirBTC pool: ${USDC_HUMAN} USDC + ${CIRBTC_HUMAN} cirBTC`);
  console.log(`Initial price: 1 cirBTC = ${(Number(USDC_HUMAN) / Number(CIRBTC_HUMAN)).toLocaleString('en-US')} USDC`);

  const [balU, balC] = await Promise.all([
    pub.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] }),
    pub.readContract({ address: CIRBTC, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] }),
  ]);
  console.log(`Balances: ${formatUnits(balU, usdcDec)} USDC · ${formatUnits(balC, cirDec)} cirBTC`);
  if (balU < rawUsdc) throw new Error(`Not enough USDC (need ${USDC_HUMAN}). Get some at https://faucet.circle.com`);
  if (balC < rawCir) throw new Error(`Not enough cirBTC (need ${CIRBTC_HUMAN}).`);

  console.log('Approvals:');
  await ensureApprove(USDC, 'USDC', rawUsdc);
  await ensureApprove(CIRBTC, 'cirBTC', rawCir);

  const minU = rawUsdc - (rawUsdc * SLIPPAGE_BPS) / 10_000n;
  const minC = rawCir - (rawCir * SLIPPAGE_BPS) / 10_000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const args = [USDC, CIRBTC, rawUsdc, rawCir, minU, minC, account.address, deadline];

  console.log('Adding liquidity…');
  await pub.simulateContract({ account, address: ROUTER, abi: routerAbi, functionName: 'addLiquidity', args });
  let gas;
  try {
    gas = gasHeadroom(await pub.estimateContractGas({ account, address: ROUTER, abi: routerAbi, functionName: 'addLiquidity', args }));
  } catch {
    gas = gasHeadroom();
  }
  const hash = await wallet.writeContract({ address: ROUTER, abi: routerAbi, functionName: 'addLiquidity', args, gas });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log(`✓ addLiquidity confirmed in block ${receipt.blockNumber} (${hash})`);

  const pair = await pub.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'getPair', args: [USDC, CIRBTC] });
  const reserves = await pub.readContract({ address: pair, abi: pairAbi, functionName: 'getReserves' });
  console.log(`Pool USDC/cirBTC: ${pair}`);
  console.log(`Reserves: ${reserves[0]} / ${reserves[1]} (raw)`);
  console.log('Done — USDC <-> cirBTC is now swappable on the Swap page.');
}

main().catch((e) => {
  console.error('✗ Failed:', e.shortMessage || e.message || e);
  process.exit(1);
});
