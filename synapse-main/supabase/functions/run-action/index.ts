import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface ActionStep {
  id: string;
  type: "navigate" | "click" | "type" | "extract" | "wait";
  label?: string;
  config: {
    url?: string;
    selector?: string;
    text?: string;
    timeout?: number;
    extractKey?: string;
  };
}

function stepsToGoal(steps: ActionStep[]): { url: string; goal: string } {
  let url = "";
  const goalParts: string[] = [];

  for (const step of steps) {
    switch (step.type) {
      case "navigate":
        url = step.config.url || url;
        break;
      case "click":
        goalParts.push(`Click on the element ${step.label ? `"${step.label}"` : `matching "${step.config.selector}"`}`);
        break;
      case "type":
        goalParts.push(`Type "${step.config.text}" into the ${step.label ? `"${step.label}"` : `element matching "${step.config.selector}"`}`);
        break;
      case "extract":
        goalParts.push(`Extract the content from ${step.label ? `"${step.label}"` : `element matching "${step.config.selector}"`}${step.config.extractKey ? ` and label it as "${step.config.extractKey}"` : ""}`);
        break;
      case "wait":
        goalParts.push(`Wait for ${step.label ? `"${step.label}"` : `element matching "${step.config.selector}"`} to appear (timeout: ${step.config.timeout || 5000}ms)`);
        break;
    }
  }

  goalParts.push("Return the results as JSON.");
  return { url: url || "about:blank", goal: goalParts.join("\n") };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via X-API-Key header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing X-API-Key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up the API key
    const { data: keyRecord, error: keyError } = await supabase
      .from("action_api_keys")
      .select("action_id")
      .eq("api_key", apiKey)
      .single();

    if (keyError || !keyRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the action
    const { data: action, error: actionError } = await supabase
      .from("actions")
      .select("*")
      .eq("id", keyRecord.action_id)
      .single();

    if (actionError || !action) {
      return new Response(
        JSON.stringify({ error: "Action not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const steps = action.steps as unknown as ActionStep[];

    // Execute via TinyFish
    const TINYFISH_API_KEY = Deno.env.get("TINYFISH_API_KEY");
    if (!TINYFISH_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Execution engine not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();
    const { url, goal } = stepsToGoal(steps);

    const tfResponse = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, goal }),
    });

    if (!tfResponse.ok) {
      const errorText = await tfResponse.text();
      return new Response(
        JSON.stringify({ error: `Execution failed: ${tfResponse.status}`, details: errorText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseText = await tfResponse.text();
    const duration = Date.now() - startTime;

    let resultJson: Record<string, unknown> | null = null;
    let finalStatus = "success";
    let errorMsg: string | undefined;

    const lines = responseText.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const eventData = JSON.parse(line.slice(6));
          if (eventData.type === "COMPLETE" && eventData.status === "COMPLETED") {
            resultJson = eventData.resultJson || eventData.result || null;
          } else if (eventData.type === "ERROR" || eventData.status === "FAILED") {
            finalStatus = "failed";
            errorMsg = eventData.error || eventData.message || "Execution failed";
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }

    // Log execution
    await supabase.from("executions").insert({
      action_id: action.id,
      action_name: action.name,
      status: finalStatus,
      completed_at: new Date().toISOString(),
      duration,
      steps: steps.map((s: ActionStep) => ({ stepId: s.id, status: finalStatus })),
      result: resultJson,
      error: errorMsg || null,
    });

    return new Response(
      JSON.stringify({
        action: action.name,
        status: finalStatus,
        duration_ms: duration,
        data: resultJson,
        ...(errorMsg ? { error: errorMsg } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
