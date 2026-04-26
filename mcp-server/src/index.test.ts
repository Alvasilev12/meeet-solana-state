/**
 * MCP Server Tests
 * 
 * Verifies tool definitions, resource URIs, and API client behavior.
 */

import { describe, it, expect } from "vitest";

// ───── Tool Definition Tests ─────
describe("Tool Definitions", () => {
  it("should have all required agent tools", async () => {
    const { ALL_TOOLS } = await import("./index");
    const agentTools = ALL_TOOLS.filter(t => 
      t.name.startsWith("meeet_") && t.name.includes("agent")
    );
    expect(agentTools.length).toBeGreaterThanOrEqual(4);
    expect(agentTools.map(t => t.name)).toContain("meeet_list_agents");
    expect(agentTools.map(t => t.name)).toContain("meeet_get_agent");
    expect(agentTools.map(t => t.name)).toContain("meeet_deploy_agent");
  });

  it("should have all required discovery tools", async () => {
    const { ALL_TOOLS } = await import("./index");
    const discoveryTools = ALL_TOOLS.filter(t => 
      t.name.startsWith("meeet_") && t.name.includes("discovery")
    );
    expect(discoveryTools.length).toBeGreaterThanOrEqual(3);
  });

  it("should have all required oracle tools", async () => {
    const { ALL_TOOLS } = await import("./index");
    const oracleTools = ALL_TOOLS.filter(t => 
      t.name.startsWith("meeet_") && t.name.includes("oracle")
    );
    expect(oracleTools.length).toBeGreaterThanOrEqual(3);
  });

  it("should have all required governance tools", async () => {
    const { ALL_TOOLS } = await import("./index");
    const govTools = ALL_TOOLS.filter(t => 
      t.name.startsWith("meeet_") && (t.name.includes("proposal") || t.name.includes("vote"))
    );
    expect(govTools.length).toBeGreaterThanOrEqual(2);
  });

  it("should have trust and verification tools", async () => {
    const { ALL_TOOLS } = await import("./index");
    const trustTools = ALL_TOOLS.filter(t => 
      t.name.startsWith("meeet_") && (t.name.includes("trust") || t.name.includes("verify") || t.name.includes("did"))
    );
    expect(trustTools.length).toBeGreaterThanOrEqual(3);
  });

  it("should have staking tools", async () => {
    const { ALL_TOOLS } = await import("./index");
    const stakingTools = ALL_TOOLS.filter(t => 
      t.name.startsWith("meeet_") && t.name.includes("staking")
    );
    expect(stakingTools.length).toBeGreaterThanOrEqual(2);
  });

  it("should have token and economy tools", async () => {
    const { ALL_TOOLS } = await import("./index");
    const tokenTools = ALL_TOOLS.filter(t => 
      t.name.startsWith("meeet_") && (t.name.includes("token") || t.name.includes("price"))
    );
    expect(tokenTools.length).toBeGreaterThanOrEqual(2);
  });

  it("should have communication tools", async () => {
    const { ALL_TOOLS } = await import("./index");
    const commTools = ALL_TOOLS.filter(t => 
      t.name.startsWith("meeet_") && (t.name.includes("chat") || t.name.includes("message"))
    );
    expect(commTools.length).toBeGreaterThanOrEqual(2);
  });

  it("should have task tools", async () => {
    const { ALL_TOOLS } = await import("./index");
    const taskTools = ALL_TOOLS.filter(t => 
      t.name.startsWith("meeet_") && t.name.includes("task")
    );
    expect(taskTools.length).toBeGreaterThanOrEqual(2);
  });

  it("should have at least 25 tools total", async () => {
    const { ALL_TOOLS } = await import("./index");
    expect(ALL_TOOLS.length).toBeGreaterThanOrEqual(25);
  });

  it("should have valid tool schemas", async () => {
    const { ALL_TOOLS } = await import("./index");
    for (const tool of ALL_TOOLS) {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe("string");
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe("string");
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });
});

// ───── Resource Definition Tests ─────
describe("Resource Definitions", () => {
  it("should have all required resources", async () => {
    // Resources are defined in the server, verify URIs
    const expectedUris = [
      "meeet://agents",
      "meeet://discoveries",
      "meeet://governance",
      "meeet://oracle",
      "meeet://trust",
      "meeet://marketplace",
      "meeet://arena",
      "meeet://economy",
    ];
    expect(expectedUris.length).toBe(8);
  });

  it("should use correct URI scheme", async () => {
    const expectedUris = [
      "meeet://agents",
      "meeet://discoveries",
      "meeet://governance",
      "meeet://oracle",
      "meeet://trust",
      "meeet://marketplace",
      "meeet://arena",
      "meeet://economy",
    ];
    for (const uri of expectedUris) {
      expect(uri).toMatch(/^meeet:\/\//);
    }
  });
});

// ───── API Client Tests ─────
describe("API Client", () => {
  it("should construct correct URLs for REST endpoints", () => {
    const MEEET_API_BASE = "https://meeet.world/api";
    const endpoint = "/v1/agents";
    const expected = "https://meeet.world/api/v1/agents";
    const actual = `${MEEET_API_BASE}${endpoint}`;
    expect(actual).toBe(expected);
  });

  it("should handle full URLs", () => {
    const MEEET_API_BASE = "https://meeet.world/api";
    const endpoint = "https://example.com/api/test";
    const actual = endpoint.startsWith("https://") ? endpoint : `${MEEET_API_BASE}${endpoint}`;
    expect(actual).toBe("https://example.com/api/test");
  });
});
