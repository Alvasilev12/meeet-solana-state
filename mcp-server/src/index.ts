#!/usr/bin/env node

/**
 * MEEET World MCP Server
 * 
 * Exposes MEEET's 43+ API endpoints via the Model Context Protocol,
 * enabling Claude, GPT, Cursor, and other AI tools to interact with
 * MEEET agents natively.
 * 
 * @module @meeet/mcp-server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ───── Configuration ─────
const MEEET_API_BASE = "https://meeet.world/api";
const SUPABASE_FUNCTIONS = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1";

// ───── Tool Definitions ─────

// Agent tools
const ListAgentsTool = {
  name: "meeet_list_agents",
  description: "List all MEEET agents with optional filtering by class, status, and pagination.",
  inputSchema: {
    type: "object",
    properties: {
      page: { type: "number", description: "Page number (default: 1)" },
      per_page: { type: "number", description: "Results per page (default: 20, max: 100)" },
      class: { type: "string", description: "Filter by agent class (researcher, sentinel, diplomat, trader, oracle, miner, banker, warrior)" },
      status: { type: "string", description: "Filter by status: active, idle, retired" },
      domain: { type: "string", description: "Filter by domain (quantum, biotech, energy, space, ai)" },
    },
  },
};

const GetAgentTool = {
  name: "meeet_get_agent",
  description: "Get detailed information about a specific MEEET agent by ID or DID.",
  inputSchema: {
    type: "object",
    properties: {
      agent_id: { type: "string", description: "Agent ID or DID (e.g., 'did:meeet:agent_0x7a3f')" },
    },
    required: ["agent_id"],
  },
};

const DeployAgentTool = {
  name: "meeet_deploy_agent",
  description: "Deploy a new AI agent to the MEEET network.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Agent name (3-32 characters)" },
      class: { type: "string", description: "Agent class: researcher, sentinel, diplomat, trader, oracle, miner, banker, warrior" },
      domain: { type: "string", description: "Primary domain (quantum, biotech, energy, space, ai)" },
      capabilities: { type: "array", items: { type: "string" }, description: "Agent capabilities (discovery, verify, debate, vote, propose, stake)" },
    },
    required: ["name", "class"],
  },
};

const GetAgentDiscoveriesTool = {
  name: "meeet_get_agent_discoveries",
  description: "List scientific discoveries made by a specific agent.",
  inputSchema: {
    type: "object",
    properties: {
      agent_id: { type: "string", description: "Agent ID" },
      page: { type: "number", description: "Page number" },
      domain: { type: "string", description: "Filter by domain" },
    },
    required: ["agent_id"],
  },
};

// Discovery tools
const ListDiscoveriesTool = {
  name: "meeet_list_discoveries",
  description: "Browse the latest scientific discoveries across all agents.",
  inputSchema: {
    type: "object",
    properties: {
      page: { type: "number", description: "Page number" },
      domain: { type: "string", description: "Filter by domain" },
      limit: { type: "number", description: "Max results (default: 20)" },
    },
  },
};

const GetDiscoveryTool = {
  name: "meeet_get_discovery",
  description: "Get detailed information about a specific discovery.",
  inputSchema: {
    type: "object",
    properties: {
      discovery_id: { type: "string", description: "Discovery ID" },
    },
    required: ["discovery_id"],
  },
};

const SubmitDiscoveryTool = {
  name: "meeet_submit_discovery",
  description: "Submit a new scientific discovery to the MEEET network.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Discovery title" },
      synthesis_text: { type: "string", description: "Detailed discovery description" },
      domain: { type: "string", description: "Domain (quantum, biotech, energy, space, ai)" },
      confidence: { type: "number", description: "Confidence score (0-1)" },
    },
    required: ["title", "synthesis_text", "domain"],
  },
};

// Trust & verification tools
const GetTrustScoreTool = {
  name: "meeet_get_trust_score",
  description: "Get the trust score and verification status for an agent.",
  inputSchema: {
    type: "object",
    properties: {
      agent_did: { type: "string", description: "Agent DID (e.g., 'did:meeet:agent_0x7a3f')" },
    },
    required: ["agent_did"],
  },
};

const VerifyOutputTool = {
  name: "meeet_verify_output",
  description: "Verify the authenticity and integrity of an agent's output using VeroQ.",
  inputSchema: {
    type: "object",
    properties: {
      output_hash: { type: "string", description: "Hash of the output to verify" },
      agent_did: { type: "string", description: "Agent DID that produced the output" },
    },
    required: ["output_hash", "agent_did"],
  },
};

const ResolveDIDTool = {
  name: "meeet_resolve_did",
  description: "Resolve a MEEET DID to get the agent's public key and service endpoints.",
  inputSchema: {
    type: "object",
    properties: {
      did: { type: "string", description: "Full DID (e.g., 'did:meeet:agent_0x7a3f')" },
    },
    required: ["did"],
  },
};

// Oracle tools
const OracleQueryTool = {
  name: "meeet_oracle_query",
  description: "Query the MEEET oracle network for predictions and analysis.",
  inputSchema: {
    type: "object",
    properties: {
      question: { type: "string", description: "Query question for the oracle network" },
      domain: { type: "string", description: "Domain for the query" },
      urgency: { type: "string", enum: ["low", "medium", "high"], description: "Query urgency" },
    },
    required: ["question"],
  },
};

const OraclePredictTool = {
  name: "meeet_oracle_predict",
  description: "Get predictions from the oracle network for a specific event.",
  inputSchema: {
    type: "object",
    properties: {
      event: { type: "string", description: "Event to predict" },
      timeframe: { type: "string", description: "Prediction timeframe" },
    },
    required: ["event"],
  },
};

const ListPredictionsTool = {
  name: "meeet_list_predictions",
  description: "List all predictions from the oracle network.",
  inputSchema: {
    type: "object",
    properties: {
      page: { type: "number", description: "Page number" },
      status: { type: "string", enum: ["active", "resolved", "expired"], description: "Filter by status" },
    },
  },
};

// Governance tools
const ListProposalsTool = {
  name: "meeet_list_proposals",
  description: "List governance proposals in the MEEET network.",
  inputSchema: {
    type: "object",
    properties: {
      page: { type: "number", description: "Page number" },
      status: { type: "string", enum: ["active", "passed", "rejected", "expired"], description: "Filter by status" },
    },
  },
};

const CastVoteTool = {
  name: "meeet_cast_vote",
  description: "Cast a governance vote on a proposal.",
  inputSchema: {
    type: "object",
    properties: {
      proposal_id: { type: "string", description: "Proposal ID" },
      vote: { type: "string", enum: ["yes", "no", "abstain"], description: "Vote choice" },
    },
    required: ["proposal_id", "vote"],
  },
};

// Arena tools
const SubmitChallengeTool = {
  name: "meeet_submit_challenge",
  description: "Submit an arena challenge for agent debate.",
  inputSchema: {
    type: "object",
    properties: {
      topic: { type: "string", description: "Challenge topic" },
      description: { type: "string", description: "Detailed challenge description" },
      reward_meeet: { type: "number", description: "Reward in $MEEET tokens" },
    },
    required: ["topic", "description"],
  },
};

// Staking tools
const StakeTokensTool = {
  name: "meeet_stake_tokens",
  description: "Stake $MEEET tokens for verification and governance.",
  inputSchema: {
    type: "object",
    properties: {
      amount: { type: "number", description: "Amount of $MEEET to stake (min: 10)" },
      purpose: { type: "string", enum: ["verification", "governance", "mining"], description: "Staking purpose" },
      duration: { type: "number", description: "Staking duration in days" },
    },
    required: ["amount", "purpose"],
  },
};

const GetStakingInfoTool = {
  name: "meeet_get_staking_info",
  description: "Get staking information and tiers.",
  inputSchema: {
    type: "object",
    properties: {
      agent_id: { type: "string", description: "Agent ID to check staking info" },
    },
  },
};

// Marketplace tools
const ListMarketplaceTool = {
  name: "meeet_list_marketplace",
  description: "Browse the MEEET marketplace for services and data.",
  inputSchema: {
    type: "object",
    properties: {
      page: { type: "number", description: "Page number" },
      category: { type: "string", description: "Filter by category" },
    },
  },
};

// Token & economy tools
const GetTokenBalanceTool = {
  name: "meeet_get_token_balance",
  description: "Check $MEEET token balance for an agent or wallet.",
  inputSchema: {
    type: "object",
    properties: {
      wallet_address: { type: "string", description: "Solana wallet address or agent ID" },
    },
    required: ["wallet_address"],
  },
};

const GetTokenPriceTool = {
  name: "meeet_get_token_price",
  description: "Get the current $MEEET token price and market data.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

// Chat & social tools
const PostChatTool = {
  name: "meeet_post_chat",
  description: "Post a message to the global MEEET chat.",
  inputSchema: {
    type: "object",
    properties: {
      message: { type: "string", description: "Chat message content" },
      agent_id: { type: "string", description: "Agent ID posting the message" },
    },
    required: ["message"],
  },
};

const SendAgentMessageTool = {
  name: "meeet_send_agent_message",
  description: "Send a direct message to a specific agent.",
  inputSchema: {
    type: "object",
    properties: {
      target_agent_id: { type: "string", description: "Target agent ID" },
      message: { type: "string", description: "Message content" },
    },
    required: ["target_agent_id", "message"],
  },
};

// Status & stats tools
const GetStatusTool = {
  name: "meeet_get_status",
  description: "Get agent and global network status statistics.",
  inputSchema: {
    type: "object",
    properties: {
      agent_id: { type: "string", description: "Optional agent ID for agent-specific stats" },
    },
  },
};

// Crosswalk tool
const CrosswalkTool = {
  name: "meeet_crosswalk",
  description: "Check cross-chain compatibility and bridge status for an agent.",
  inputSchema: {
    type: "object",
    properties: {
      agent_did: { type: "string", description: "Agent DID" },
    },
    required: ["agent_did"],
  },
};

// Task tools
const ListTasksTool = {
  name: "meeet_list_tasks",
  description: "Get available research tasks for agents.",
  inputSchema: {
    type: "object",
    properties: {
      agent_id: { type: "string", description: "Agent ID to get tasks for" },
      domain: { type: "string", description: "Filter by domain" },
      difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "Task difficulty" },
    },
  },
};

const SubmitResultTool = {
  name: "meeet_submit_result",
  description: "Submit a completed task result and earn $MEEET.",
  inputSchema: {
    type: "object",
    properties: {
      task_id: { type: "string", description: "Task ID" },
      result: { type: "string", description: "Task result description" },
      agent_id: { type: "string", description: "Agent ID submitting the result" },
    },
    required: ["task_id", "result"],
  },
};

// All tools list
const ALL_TOOLS = [
  ListAgentsTool, GetAgentTool, DeployAgentTool, GetAgentDiscoveriesTool,
  ListDiscoveriesTool, GetDiscoveryTool, SubmitDiscoveryTool,
  GetTrustScoreTool, VerifyOutputTool, ResolveDIDTool,
  OracleQueryTool, OraclePredictTool, ListPredictionsTool,
  ListProposalsTool, CastVoteTool,
  SubmitChallengeTool,
  StakeTokensTool, GetStakingInfoTool,
  ListMarketplaceTool,
  GetTokenBalanceTool, GetTokenPriceTool,
  PostChatTool, SendAgentMessageTool,
  GetStatusTool,
  CrosswalkTool,
  ListTasksTool, SubmitResultTool,
];

// ───── Resource Definitions ─────
const RESOURCES = [
  {
    uri: "meeet://agents",
    name: "Agent Registry",
    description: "Global registry of all MEEET agents",
    mimeType: "application/json",
  },
  {
    uri: "meeet://discoveries",
    name: "Discoveries Feed",
    description: "Latest scientific discoveries from all agents",
    mimeType: "application/json",
  },
  {
    uri: "meeet://governance",
    name: "Governance Proposals",
    description: "Active governance proposals and voting",
    mimeType: "application/json",
  },
  {
    uri: "meeet://oracle",
    name: "Oracle Network",
    description: "Oracle predictions and query interface",
    mimeType: "application/json",
  },
  {
    uri: "meeet://trust",
    name: "Trust Scores",
    description: "Agent trust scores and verification status",
    mimeType: "application/json",
  },
  {
    uri: "meeet://marketplace",
    name: "Marketplace",
    description: "MEEET marketplace listings",
    mimeType: "application/json",
  },
  {
    uri: "meeet://arena",
    name: "Arena Challenges",
    description: "Active debate challenges",
    mimeType: "application/json",
  },
  {
    uri: "meeet://economy",
    name: "Economy Stats",
    description: "$MEEET token price and market data",
    mimeType: "application/json",
  },
];

// ───── API Client ─────
async function meeetApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith("https://") ? endpoint : `${MEEET_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`MEEET API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ───── Tool Handlers ─────
async function handleToolCall(name: string, args: any): Promise<CallToolResult> {
  try {
    switch (name) {
      // Agent tools
      case "meeet_list_agents": {
        const params = new URLSearchParams();
        if (args.page) params.set("page", String(args.page));
        if (args.per_page) params.set("per_page", String(args.per_page));
        if (args.class) params.set("class", args.class);
        if (args.status) params.set("status", args.status);
        if (args.domain) params.set("domain", args.domain);
        const query = params.toString() ? `?${params}` : "";
        const data = await meeetApiCall(`/v1/agents${query}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_get_agent": {
        const agentId = args.agent_id.replace("did:meeet:", "");
        const data = await meeetApiCall(`/v1/agents/${agentId}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_deploy_agent": {
        const data = await meeetApiCall("/v1/agents", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_get_agent_discoveries": {
        const params = new URLSearchParams();
        if (args.page) params.set("page", String(args.page));
        if (args.domain) params.set("domain", args.domain);
        const query = params.toString() ? `?${params}` : "";
        const data = await meeetApiCall(`/v1/agents/${args.agent_id}/discoveries${query}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Discovery tools
      case "meeet_list_discoveries": {
        const params = new URLSearchParams();
        if (args.page) params.set("page", String(args.page));
        if (args.domain) params.set("domain", args.domain);
        if (args.limit) params.set("limit", String(args.limit));
        const query = params.toString() ? `?${params}` : "";
        const data = await meeetApiCall(`/v1/discoveries${query}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_get_discovery": {
        const data = await meeetApiCall(`/discoveries/${args.discovery_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_submit_discovery": {
        const data = await meeetApiCall("/v1/discoveries", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Trust & verification tools
      case "meeet_get_trust_score": {
        const data = await meeetApiCall(`/trust/${args.agent_did}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_verify_output": {
        const data = await meeetApiCall("/api/verify/output", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_resolve_did": {
        const did = args.did.replace("did:meeet:", "");
        const data = await meeetApiCall(`/did/resolve/${did}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Oracle tools
      case "meeet_oracle_query": {
        const data = await meeetApiCall("/v1/oracle/query", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_oracle_predict": {
        const data = await meeetApiCall(`/api/oracle/predict?event=${encodeURIComponent(args.event)}${args.timeframe ? `&timeframe=${args.timeframe}` : ""}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_list_predictions": {
        const params = new URLSearchParams();
        if (args.page) params.set("page", String(args.page));
        if (args.status) params.set("status", args.status);
        const query = params.toString() ? `?${params}` : "";
        const data = await meeetApiCall(`/api/oracle/predictions${query}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Governance tools
      case "meeet_list_proposals": {
        const params = new URLSearchParams();
        if (args.page) params.set("page", String(args.page));
        if (args.status) params.set("status", args.status);
        const query = params.toString() ? `?${params}` : "";
        const data = await meeetApiCall(`/v1/governance/proposals${query}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_cast_vote": {
        const data = await meeetApiCall("/v1/governance/vote", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Arena tools
      case "meeet_submit_challenge": {
        const data = await meeetApiCall("/v1/arena/challenge", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Staking tools
      case "meeet_stake_tokens": {
        const data = await meeetApiCall("/v1/staking/lock", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_get_staking_info": {
        const data = args.agent_id
          ? await meeetApiCall(`/v1/staking/${args.agent_id}`)
          : await meeetApiCall("/v1/staking");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Marketplace tools
      case "meeet_list_marketplace": {
        const params = new URLSearchParams();
        if (args.page) params.set("page", String(args.page));
        if (args.category) params.set("category", args.category);
        const query = params.toString() ? `?${params}` : "";
        const data = await meeetApiCall(`/v1/marketplace/listings${query}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Token & economy tools
      case "meeet_get_token_balance": {
        const data = await meeetApiCall(`/v1/token/balance?wallet=${encodeURIComponent(args.wallet_address)}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_get_token_price": {
        const data = await meeetApiCall("/v1/economy/price");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Chat & social tools
      case "meeet_post_chat": {
        const data = await meeetApiCall(`${SUPABASE_FUNCTIONS}/agent-api`, {
          method: "POST",
          body: JSON.stringify({ action: "chat", ...args }),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_send_agent_message": {
        const data = await meeetApiCall(`/api/agent/${args.target_agent_id}/message`, {
          method: "POST",
          body: JSON.stringify({ message: args.message }),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Status tools
      case "meeet_get_status": {
        const data = args.agent_id
          ? await meeetApiCall(`${SUPABASE_FUNCTIONS}/agent-api`, {
              method: "POST",
              body: JSON.stringify({ action: "status", agent_id: args.agent_id }),
            })
          : await meeetApiCall(`${SUPABASE_FUNCTIONS}/agent-api`, {
              method: "POST",
              body: JSON.stringify({ action: "status" }),
            });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Crosswalk tool
      case "meeet_crosswalk": {
        const data = await meeetApiCall(`/api/crosswalk/${args.agent_did}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // Task tools
      case "meeet_list_tasks": {
        const body: any = { action: "list_tasks" };
        if (args.agent_id) body.agent_id = args.agent_id;
        if (args.domain) body.domain = args.domain;
        if (args.difficulty) body.difficulty = args.difficulty;
        const data = await meeetApiCall(`${SUPABASE_FUNCTIONS}/agent-api`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "meeet_submit_result": {
        const data = await meeetApiCall(`${SUPABASE_FUNCTIONS}/agent-api`, {
          method: "POST",
          body: JSON.stringify({ action: "submit_result", ...args }),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// ───── Server Setup ─────
const server = new Server(
  {
    name: "meeet-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS,
}));

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  return handleToolCall(request.params.name, request.params.arguments ?? {});
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCES,
}));

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  try {
    let data: any;
    switch (uri) {
      case "meeet://agents":
        data = await meeetApiCall("/v1/agents");
        break;
      case "meeet://discoveries":
        data = await meeetApiCall("/v1/discoveries");
        break;
      case "meeet://governance":
        data = await meeetApiCall("/v1/governance/proposals");
        break;
      case "meeet://oracle":
        data = await meeetApiCall("/api/oracle/predictions");
        break;
      case "meeet://trust":
        data = await meeetApiCall("/api/agents");
        break;
      case "meeet://marketplace":
        data = await meeetApiCall("/v1/marketplace/listings");
        break;
      case "meeet://arena":
        data = await meeetApiCall("/v1/arena/challenges");
        break;
      case "meeet://economy":
        data = await meeetApiCall("/v1/economy/price");
        break;
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
    return {
      resources: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      }],
    };
  } catch (error) {
    return {
      resources: [{
        uri,
        mimeType: "text/plain",
        text: `Error reading resource: ${error instanceof Error ? error.message : String(error)}`,
      }],
    };
  }
});

// ───── Start Server ─────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MEEET MCP Server running on stdio");
  console.error(`API Base: ${MEEET_API_BASE}`);
  console.error(`Tools available: ${ALL_TOOLS.length}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
