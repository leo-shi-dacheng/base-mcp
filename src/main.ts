import {
  AgentKit,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  CdpWalletProvider,
  walletActionProvider,
  erc20ActionProvider,
  erc721ActionProvider,
  wowActionProvider,
} from '@hashkey/agentkit';
// import { getMcpTools } from '@coinbase/agentkit-model-context-protocol';
import { getMcpTools } from '@coinbase/agentkit-model-context-protocol';
import { Coinbase } from '@coinbase/coinbase-sdk';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import {
  createWalletClient,
  http,
  publicActions,
  type PublicActions,
  type WalletClient,
} from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { hashkeyTestnet } from 'viem/chains';
import { chainIdToCdpNetworkId, chainIdToChain } from './chains.js';
import { baseMcpTools, toolToHandler } from './tools/index.js';
import { getActionProvidersWithRequiredEnvVars } from './utils.js';
import { version } from './version.js';

export async function main() {
  dotenv.config();
  const apiKeyName =
    process.env.COINBASE_API_KEY_ID || process.env.COINBASE_API_KEY_NAME; // Previously, was called COINBASE_API_KEY_NAME
  const privateKey =
    process.env.COINBASE_API_SECRET || process.env.COINBASE_API_PRIVATE_KEY; // Previously, was called COINBASE_API_PRIVATE_KEY
  const seedPhrase = process.env.SEED_PHRASE;
  const chainId = process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : hashkeyTestnet.id;

  // TODO: stricter checks for required env vars with better error messaging
  if (!apiKeyName || !privateKey || !seedPhrase) {
    console.error(
      'Please set COINBASE_API_KEY_NAME, COINBASE_API_PRIVATE_KEY, and SEED_PHRASE environment variables',
    );
    process.exit(1);
  }

  const chain = chainIdToChain(chainId);
  if (!chain) {
    throw new Error(
      `Unsupported chainId: ${chainId}. Only Hashkey and Hashkey Sepolia are supported.`,
    );
  }

  const viemClient = createWalletClient({
    account: mnemonicToAccount(seedPhrase),
    chain,
    transport: http(),
  }).extend(publicActions) as WalletClient & PublicActions;

  const cdpWalletProvider = await CdpWalletProvider.configureWithWallet({
    mnemonicPhrase: seedPhrase,
    apiKeyName,
    apiKeyPrivateKey: privateKey,
    networkId: chainIdToCdpNetworkId[chainId],
  });
 
  const agentKit = await AgentKit.from({
    cdpApiKeyName: apiKeyName,
    cdpApiKeyPrivateKey: privateKey,
    walletProvider: cdpWalletProvider,
    actionProviders: [
      // TODO: add more action providers
      // 后续接入自己的 ens 和 kyc 服务
      // basenameActionProvider(),
      // morphoActionProvider(),
      walletActionProvider(),
      cdpWalletActionProvider({
        apiKeyName,
        apiKeyPrivateKey: privateKey,
      }),
      cdpApiActionProvider({
        apiKeyName,
        apiKeyPrivateKey: privateKey,
      }),
      erc20ActionProvider(),
      erc721ActionProvider(),
      wowActionProvider(),
      // defillamaActionProvider(),
      // alchemyTokenPricesActionProvider(),
      // TODO: add more action providers
      // acrossActionProvider(),
      ...getActionProvidersWithRequiredEnvVars(),
    ],
  });
  if (!agentKit) {
    throw new Error('Failed to create agent kit');
  }
  console.log(agentKit, 'agentKit');
  // const { tools, toolHandler } = await getMcpTools(agentKit);
  const { tools, toolHandler } = await getMcpTools(agentKit as any);
  const server = new Server(
    {
      name: 'Hashkey MCP Server',
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  Coinbase.configure({
    apiKeyName,
    privateKey,
    source: 'Hashkey MCP',
    sourceVersion: version,
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error('Received ListToolsRequest');
    return {
      tools: [...baseMcpTools.map((tool) => tool.definition), ...tools],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      // Check if the tool is Hashkey MCP tool
      const isBaseMcpTool = baseMcpTools.some(
        (tool) => tool.definition.name === request.params.name,
      );

      if (isBaseMcpTool) {
        const tool = toolToHandler[request.params.name];
        if (!tool) {
          throw new Error(`Tool ${request.params.name} not found`);
        }

        const result = await tool(viemClient, request.params.arguments);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      return toolHandler(request.params.name, request.params.arguments);
    } catch (error) {
      throw new Error(`Tool ${request.params.name} failed: ${error}`);
    }
  });

  const transport = new StdioServerTransport();
  console.error('Connecting server to transport...');
  await server.connect(transport);

  console.error('Hashkey MCP Server running on stdio');
}
