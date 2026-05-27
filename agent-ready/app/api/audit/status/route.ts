import { NextRequest } from "next/server";
import { getAuditEvents, subscribeToAudit } from "@/app/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auditId = request.nextUrl.searchParams.get("auditId");

  if (!auditId) {
    return new Response("auditId query parameter is required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send any events that already happened (client might have missed them)
      const existingEvents = getAuditEvents(auditId);
      for (const event of existingEvents) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // Check if audit is already complete
      const isComplete = existingEvents.some(
        (e) => e.testId === "complete" || (e.testId === "system" && e.status === "error")
      );

      if (isComplete) {
        controller.close();
        return;
      }

      // Subscribe to new events
      const unsubscribe = subscribeToAudit(auditId, (event) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));

          // Close stream when audit is complete
          if (event.testId === "complete" || (event.testId === "system" && event.status === "error")) {
            setTimeout(() => {
              unsubscribe();
              controller.close();
            }, 100);
          }
        } catch {
          unsubscribe();
        }
      });

      // Cleanup on abort
      request.signal.addEventListener("abort", () => {
        unsubscribe();
      });

      // Safety timeout (5 minutes max)
      setTimeout(() => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }, 300000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
