import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ActionStep } from "@/types/action";

// ── Actions CRUD ──

export interface DbAction {
  id: string;
  name: string;
  description: string | null;
  target_site: string | null;
  tags: string[];
  steps: ActionStep[];
  created_at: string;
  updated_at: string;
}

function mapAction(row: Record<string, unknown>): DbAction {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    target_site: row.target_site as string | null,
    tags: (row.tags as string[]) || [],
    steps: (row.steps as unknown as ActionStep[]) || [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchActions(): Promise<DbAction[]> {
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => mapAction(r as unknown as Record<string, unknown>));
}

export async function fetchAction(id: string): Promise<DbAction> {
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapAction(data as unknown as Record<string, unknown>);
}

export async function createAction(action: {
  name: string;
  description?: string;
  target_site?: string;
  tags?: string[];
  steps: ActionStep[];
}): Promise<DbAction> {
  const { data, error } = await supabase
    .from("actions")
    .insert({
      name: action.name,
      description: action.description || null,
      target_site: action.target_site || null,
      tags: action.tags || [],
      steps: action.steps as unknown as Json,
    })
    .select()
    .single();
  if (error) throw error;
  return mapAction(data as unknown as Record<string, unknown>);
}

export async function updateAction(
  id: string,
  updates: {
    name?: string;
    description?: string;
    target_site?: string;
    tags?: string[];
    steps?: ActionStep[];
  }
): Promise<DbAction> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.target_site !== undefined) payload.target_site = updates.target_site;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  if (updates.steps !== undefined) payload.steps = updates.steps as unknown as Json;

  const { data, error } = await supabase
    .from("actions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapAction(data as unknown as Record<string, unknown>);
}

export async function deleteAction(id: string): Promise<void> {
  const { error } = await supabase.from("actions").delete().eq("id", id);
  if (error) throw error;
}

// ── API Keys ──

export async function getOrCreateApiKey(actionId: string): Promise<string> {
  // Check for existing key
  const { data: existing } = await supabase
    .from("action_api_keys")
    .select("api_key")
    .eq("action_id", actionId)
    .limit(1)
    .single();

  if (existing?.api_key) return existing.api_key;

  // Create new key
  const { data, error } = await supabase
    .from("action_api_keys")
    .insert({ action_id: actionId })
    .select("api_key")
    .single();

  if (error) throw error;
  return data.api_key;
}

// ── Executions ──

export interface DbExecution {
  id: string;
  action_id: string | null;
  action_name: string;
  status: "running" | "success" | "failed";
  started_at: string;
  completed_at: string | null;
  duration: number | null;
  steps: Array<{
    stepId: string;
    status: string;
    duration?: number;
    error?: string;
  }>;
  result: Record<string, unknown> | null;
  error: string | null;
}

export async function fetchExecutions(): Promise<DbExecution[]> {
  const { data, error } = await supabase
    .from("executions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    action_id: r.action_id,
    action_name: r.action_name,
    status: r.status as DbExecution["status"],
    started_at: r.started_at,
    completed_at: r.completed_at,
    duration: r.duration,
    steps: (r.steps as unknown as DbExecution["steps"]) || [],
    result: r.result as unknown as Record<string, unknown> | null,
    error: r.error,
  }));
}

// ── Execute Action via Edge Function ──

export async function executeAction(params: {
  actionId?: string;
  actionName: string;
  steps: ActionStep[];
}): Promise<{
  executionId: string;
  status: string;
  duration?: number;
  result?: Record<string, unknown>;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke("execute-action", {
    body: params,
  });
  if (error) throw error;
  return data;
}
