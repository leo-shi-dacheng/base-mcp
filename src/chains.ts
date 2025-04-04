import { hashkey, hashkeyTestnet } from 'viem/chains';

export const chainIdToChain = (chainId: string | number) => {
  if (String(chainId) === String(hashkeyTestnet.id)) {
    return hashkeyTestnet;
  }
  if (String(chainId) === String(hashkey.id)) {
    return hashkey;
  }
  return null;
};

export const chainIdToCdpNetworkId: Record<number, string> = {
  [hashkeyTestnet.id]: 'hashkey-testnet',
  [hashkey.id]: 'hashkey-mainnet',
};
