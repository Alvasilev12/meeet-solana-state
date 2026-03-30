/**
 * Spix Communication Hub — API Client
 *
 * Provides typed methods for agent communication actions:
 * phone calls ($0.10/min), email ($0.02), SMS ($0.04), bulk email ($1.00).
 *
 * All actions are routed through the `agent-spix` edge function,
 * which handles billing, Spix API integration, and action logging.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────

export interface SpixCallPayload {
  phone_number: string;
  message: string;
}

export interface SpixEmailPayload {
  to_email: string;
  subject: string;
  body: string;
}

export interface SpixBulkEmailPayload {
  recipients: string[];
  subject: string;
  body: string;
}

export interface SpixSmsPayload {
  phone_number: string;
  message: string;
}

export interface SpixResult<T = Record<string, unknown>> {
  success: boolean;
  error?: string;
  call?: T;
  email?: T;
  sms?: T;
  bulk?: T;
  actions?: T[];
}

export interface SpixActionRecord {
  id: string;
  agent_id: string;
  user_id: string;
  action_type: string;
  cost_usd: number;
  details: Record<string, unknown>;
  created_at: string;
}

// ── Pricing constants ───────────────────────────────────────────────

export const SPIX_PRICING = {
  phone_call: 0.10,
  email_send: 0.02,
  sms_send: 0.04,
  bulk_email: 1.00,
} as const;

// ── Client ──────────────────────────────────────────────────────────

async function invoke<T = Record<string, unknown>>(
  action: string,
  userId: string,
  agentId: string,
  payload: Record<string, unknown> = {} as Record<string, unknown>,
): Promise<SpixResult<T>> {
  const { data, error } = await supabase.functions.invoke("agent-spix", {
    body: { action, user_id: userId, agent_id: agentId, ...payload },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as SpixResult<T>;
}

/** Initiate a phone call from the agent. Cost: $0.10/min */
export function makeCall(userId: string, agentId: string, payload: SpixCallPayload) {
  return invoke("make_call", userId, agentId, { ...payload });
}

/** Send an email on behalf of the agent. Cost: $0.02 */
export function sendEmail(userId: string, agentId: string, payload: SpixEmailPayload) {
  return invoke("send_email", userId, agentId, { ...payload });
}

/** Send bulk emails on behalf of the agent. Cost: $1.00 */
export function sendBulkEmail(userId: string, agentId: string, payload: SpixBulkEmailPayload) {
  return invoke("bulk_email", userId, agentId, { ...payload });
}

/** Send an SMS from the agent. Cost: $0.04 */
export function sendSms(userId: string, agentId: string, payload: SpixSmsPayload) {
  return invoke("send_sms", userId, agentId, { ...payload });
}

/** Fetch recent action history for the user. */
export function getActionHistory(userId: string, agentId: string) {
  return invoke<SpixActionRecord>("action_history", userId, agentId);
}
