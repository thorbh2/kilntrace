import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC || 'https://studio.genlayer.com/api';
const explorerUrl = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER || 'https://explorer-studio.genlayer.com';

export const studionetChainId = Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || 61999);

export const studionet = defineChain({
  id: studionetChainId,
  name: 'GenLayer Studionet',
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'GenLayer Studio Explorer', url: explorerUrl },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'KilnTrace',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'kilntrace-local-dev',
  chains: [studionet],
  ssr: true,
});
