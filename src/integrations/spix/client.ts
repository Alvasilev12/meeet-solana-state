/**
 * Spix Communication Hub — API Client
 *
 * Provides typed methods for agent communication actions:
 * phone calls ($0.10/min), email ($0.02), SMS ($0.04), bulk email ($1.00).
 *
 * Backend: Spix REST API — https://api.spix.sh/v1 (Bearer token auth)
 * All actions are routed through the `agent-spix` edge function,
 * which handles billing, Spix API calls, and action logging.
 *
 * ── Main Endpoints ──────────────────────────────────────────────────
 *
 *  POST /v1/calls       — Initiate an outbound phone call  (scope: calls:write)
 *    Body: { playbook_id, source_number, destination_number, metadata }
 *
 *  POST /v1/email       — Send a single email  (scope: email:write)
 *    Body: { to, subject, body, from_name }
 *
 *  POST /v1/email/draft — Create an email draft  (scope: email:write)
 *    Body: { to, subject, body, from_name }
 *
 *  POST /v1/email/bulk  — Send bulk emails (up to 1000 recipients)  (scope: email:write)
 *    Body: { recipients, subject, body, from_name }
 *
 *  POST /v1/sms         — Send an SMS message  (scope: sms:write)
 *    Body: { to, message }
 *
 *  GET  /v1/calls/{id}/transcript — Get call transcript  (scope: calls:read)
 *  GET  /v1/calls/{id}/summary   — Get AI summary of a call  (scope: calls:read)
 *
 *  POST /v1/email/threads/{id}/reply — Reply in an email thread  (scope: email:write)
 *    Body: { body, from_name }
 *
 *  GET  /v1/email/threads/{id}   — Get full email thread  (scope: email:read)
 *
 *  All requests require header: Authorization: Bearer <SPIX_API_KEY>
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────

export interface SpixCallPayload {
  playbook_id: string;
  source_number: string;
  destination_number: string;
  metadata?: Record<string, unknown>;
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

export interface SpixThreadReplyPayload {
  thread_id: string;
  body: string;
}

export interface SpixResult<T = Record<string, unknown>> {
  success: boolean;
  error?: string;
  call?: T;
  email?: T;
  sms?: T;
  bulk?: T;
  transcript?: T;
  summary?: T;
  thread?: T;
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

/** Create an email draft (not sent). Free. */
export function createEmailDraft(userId: string, agentId: string, payload: SpixEmailPayload) {
  return invoke("email_draft", userId, agentId, { ...payload });
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

/** Get call transcript. */
export function getCallTranscript(userId: string, agentId: string, callId: string) {
  return invoke("call_transcript", userId, agentId, { call_id: callId });
}

/** Get AI summary of a call. */
export function getCallSummary(userId: string, agentId: string, callId: string) {
  return invoke("call_summary", userId, agentId, { call_id: callId });
}

/** Reply in an email thread. */
export function replyToThread(userId: string, agentId: string, payload: SpixThreadReplyPayload) {
  return invoke("thread_reply", userId, agentId, { ...payload });
}

/** Get full email thread. */
export function getThread(userId: string, agentId: string, threadId: string) {
  return invoke("get_thread", userId, agentId, { thread_id: threadId });
}
