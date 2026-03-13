import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
        goalParts.push(
          `Click on the element ${step.label ? `"${step.label}"` : `matching "${step.config.selector}"`}`
        );
        break;
      case "type":
        goalParts.push(
          `Type "${step.config.text}" into the ${step.label ? `"${step.label}"` : `element matching "${step.config.selector}"`}`
        );
        break;
      case "extract":
        goalParts.push(
          `Extract the content from ${step.label ? `"${step.label}"` : `element matching "${step.config.selector}"`}${step.config.extractKey ? ` and label it as "${step.config.extractKey}"` : ""}`
        );
        break;
      case "wait":
        goalParts.push(
          `Wait for ${step.label ? `"${step.label}"` : `element matching "${step.config.selector}"`} to appear (timeout: ${step.config.timeout || 5000}ms)`
        );
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
    const TINYFISH_API_KEY = Deno.env.get("TINYFISH_API_KEY");
    if (!TINYFISH_API_KEY) {
      return new Response(
        JSON.stringify({ error: "TinyFish API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { actionId, actionName, steps } = await req.json() as {
      actionId?: string;
      actionName: string;
      steps: ActionStep[];
    };

    if (!steps || steps.length === 0) {
      return new Response(
        JSON.stringify({ error: "No steps provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create execution record
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const executionSteps = steps.map((s) => ({
      stepId: s.id,
      status: "running",
    }));

    const { data: execution, error: insertError } = await supabase
      .from("executions")
      .insert({
        action_id: actionId || null,
        action_name: actionName,
        status: "running",
        steps: executionSteps,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to create execution record", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();

    // Convert steps to TinyFish goal
    const { url, goal } = stepsToGoal(steps);

    // Call TinyFish API (SSE endpoint, read full response)
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
      const duration = Date.now() - startTime;

      const failedSteps = steps.map((s) => ({
        stepId: s.id,
        status: "failed",
        duration: Math.round(duration / steps.length),
        error: `TinyFish API error: ${tfResponse.status}`,
      }));

      await supabase
        .from("executions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          duration,
          steps: failedSteps,
          error: `TinyFish API returned ${tfResponse.status}: ${errorText.slice(0, 500)}`,
        })
        .eq("id", execution.id);

      return new Response(
        JSON.stringify({
          executionId: execution.id,
          status: "failed",
          error: `TinyFish API error: ${tfResponse.status}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse SSE response - read all events
    const responseText = await tfResponse.text();
    const duration = Date.now() - startTime;

    // Parse SSE events to find COMPLETE
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

    const completedSteps = steps.map((s, i) => ({
      stepId: s.id,
      status: finalStatus === "failed" && i === steps.length - 1 ? "failed" : finalStatus === "failed" ? "success" : "success",
      duration: Math.round(duration / steps.length),
      ...(finalStatus === "failed" && i === steps.length - 1 ? { error: errorMsg } : {}),
    }));

    await supabase
      .from("executions")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        duration,
        steps: completedSteps,
        result: resultJson,
        error: errorMsg || null,
      })
      .eq("id", execution.id);

    return new Response(
      JSON.stringify({
        executionId: execution.id,
        status: finalStatus,
        duration,
        result: resultJson,
        error: errorMsg,
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
