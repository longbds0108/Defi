/**
 * Circle CCTP V2 (Cross-Chain Transfer Protocol) — testnet.
 *
 * Bridges native USDC by burn-and-mint: approve -> depositForBurn on the source
 * chain, fetch Circle's attestation from the public Iris API, then receiveMessage
 * on the destination chain. No API key is needed in the browser (Iris is public).
 *
 * Contracts (same deterministic address on every testnet chain) and domains are
 * from https://developers.circle.com/cctp. Verified on-chain for Arc Testnet,
 * Ethereum Sepolia and Base Sepolia.
 */
export const TOKEN_MESSENGER = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' as const;
export const MESSAGE_TRANSMITTER = '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' as const;
export const IRIS_BASE = 'https://iris-api-sandbox.circle.com';
export const USDC_DECIMALS = 6;
export const STANDARD_FINALITY = 2000; // minFinalityThreshold for a standard (free) transfer

export type CctpChain = {
  chainId: number;
  domain: number;
  name: string;
  short: string;
  usdc: `0x${string}`;
  logo: string;
};

export const CCTP_CHAINS: CctpChain[] = [
  { chainId: 5042002, domain: 26, name: 'Arc Testnet', short: 'Arc', usdc: '0x3600000000000000000000000000000000000000', logo: '/assets/arc-logo.jpg' },
  { chainId: 11155111, domain: 0, name: 'Ethereum Sepolia', short: 'Sepolia', usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { chainId: 84532, domain: 6, name: 'Base Sepolia', short: 'Base', usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', logo: '/assets/base-chain.png' },
];

export const tokenMessengerAbi = [
  {
    type: 'function',
    name: 'depositForBurn',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
    ],
    outputs: [],
  },
] as const;

export const messageTransmitterAbi = [
  {
    type: 'function',
    name: 'receiveMessage',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
] as const;

/** 20-byte EVM address -> left-padded bytes32. */
export function addressToBytes32(addr: string): `0x${string}` {
  return `0x000000000000000000000000${addr.slice(2).toLowerCase()}`;
}

export const ZERO_BYTES32 = `0x${'0'.repeat(64)}` as `0x${string}`;

export type Attestation = { message: `0x${string}`; attestation: `0x${string}` };

/**
 * Poll Iris for the attestation of a burn tx. Returns null while still pending
 * so the caller can retry.
 */
export async function fetchAttestation(sourceDomain: number, burnTxHash: string): Promise<Attestation | null> {
  try {
    const res = await fetch(`${IRIS_BASE}/v2/messages/${sourceDomain}?transactionHash=${burnTxHash}`);
    if (!res.ok) return null;
    const data = await res.json();
    const m = data?.messages?.[0];
    if (!m || m.status !== 'complete' || !m.message || !m.attestation || m.attestation === 'PENDING') return null;
    return { message: m.message as `0x${string}`, attestation: m.attestation as `0x${string}` };
  } catch {
    return null;
  }
}
