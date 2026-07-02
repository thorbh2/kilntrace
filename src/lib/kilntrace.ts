import { createAccount, createClient } from 'genlayer-js';
import { studionet as genlayerStudionet } from 'genlayer-js/chains';
import { TransactionStatus, type TransactionHash } from 'genlayer-js/types';

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xb828C57ED73B72A516Ed97c3403fA0b5C9EC3b58').trim();
export const EXPLORER = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER || 'https://explorer-studio.genlayer.com';
export const NETWORK = 'studionet';

export type KilnFiring = {
  id: string;
  title: string;
  studio: string;
  kiln: string;
  coneTarget: string;
  claim: string;
  sourceUrl: string;
  status: string;
  verdict: string;
  confidenceBps: number;
  heatMatchBps?: number;
  materialRiskBps?: number;
  materialScoreBps: number;
  glazeScoreBps: number;
  heatScoreBps: number;
  summary: string;
  riskFlags: string[];
};

export type Bootstrap = {
  contract: string;
  recentFirings: KilnFiring[];
  stats: Record<string, number>;
  quality: { qualityBps: number; reason: string };
};

export type TxToast = {
  kind: 'idle' | 'pending' | 'ok' | 'error';
  title: string;
  hash?: string;
  detail?: string;
};

export function hasContract(): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS) && !/^0x0{40}$/i.test(CONTRACT_ADDRESS);
}

export function explorerTx(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function explorerContract(): string {
  return `${EXPLORER}/contracts/${CONTRACT_ADDRESS}`;
}

export function shortHex(value: string, front = 6, back = 4): string {
  if (!value) return 'not connected';
  return `${value.slice(0, front)}...${value.slice(-back)}`;
}

function parseObj<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || raw.trim() === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

let readClient: ReturnType<typeof createClient> | null = null;

function reader() {
  if (!readClient) readClient = createClient({ chain: genlayerStudionet, account: createAccount() });
  return readClient;
}

async function call(functionName: string, args: unknown[] = []) {
  if (!hasContract()) throw new Error('contract_not_deployed');
  return reader().readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName,
    args: args as never[],
  });
}

export async function getBootstrap(): Promise<Bootstrap | null> {
  if (!hasContract()) return null;
  return parseObj<Bootstrap | null>(await call('get_frontend_bootstrap'), null);
}

export async function getRecentFirings(limit = 8): Promise<KilnFiring[]> {
  if (!hasContract()) return [];
  return parseObj<KilnFiring[]>(await call('get_recent_firings', [limit]), []);
}

export async function writeMethod(
  connectedAddress: `0x${string}`,
  functionName: string,
  args: unknown[],
): Promise<`0x${string}`> {
  if (!hasContract()) throw new Error('contract_not_deployed');
  const client = createClient({ chain: genlayerStudionet, account: connectedAddress });
  await client.connect(NETWORK as never);
  return client.writeContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName,
    args: args as never[],
    value: BigInt(0),
  }) as Promise<`0x${string}`>;
}

export async function waitAccepted(connectedAddress: `0x${string}`, hash: `0x${string}`): Promise<void> {
  const client = createClient({ chain: genlayerStudionet, account: connectedAddress });
  await client.waitForTransactionReceipt({
    hash: hash as unknown as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 90,
  });
}

export function friendlyError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const lower = text.toLowerCase();
  if (lower.includes('execution slots') || lower.includes('server busy') || lower.includes('busy')) {
    return 'Studionet is busy. Wait a moment and retry.';
  }
  if (lower.includes('contract_not_deployed')) {
    return 'Contract address is not configured yet.';
  }
  if (lower.includes('user rejected')) {
    return 'Wallet confirmation was rejected.';
  }
  return text;
}
