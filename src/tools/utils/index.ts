import type { Chain } from 'viem';
import { hashkey, hashkeyTestnet } from 'viem/chains';
import { chainIdToChain } from '../../chains.js';

export function constructBaseScanUrl(
  chain: Chain,
  transactionHash: `0x${string}`,
) {
  if (chain.id === hashkey.id) {
    return `https://hashkey.blockscout.com/tx/${transactionHash}`;
  }

  if (chain.id === hashkeyTestnet.id) {
    return `https://hashkeychain-testnet-explorer.alt.technology/tx/${transactionHash}`;
  }
}

export const checkToolSupportsChain = ({
  chainId,
  supportedChains,
}: {
  chainId: number | undefined;
  supportedChains: Chain[];
}) => {
  if (supportedChains.some((chain) => chain.id === chainId)) {
    return true;
  }

  const chainName = chainId
    ? (chainIdToChain(chainId)?.name ?? `chain ${chainId}`)
    : 'chain';

  throw new Error(`Not implemented on ${chainName}`);
};
