"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QuestionNode = {
  id: string;
  question: string;
  status: "YES" | "NO" | "PARTIAL";
  importance: "HIGH" | "MEDIUM";
  category: string;
};

type QuestionLink = {
  source: string;
  target: string;
  strength: number;
};

interface QuestionNetworkProps {
  questions: QuestionNode[];
}

export function QuestionNetwork({ questions }: QuestionNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const stableProbability = (source: string, target: string): number => {
    const key = `${source}|${target}`;
    let h = 0;
    for (let i = 0; i < key.length; i += 1) {
      h = (h * 31 + key.charCodeAt(i)) >>> 0;
    }
    return (h % 1000) / 1000;
  };

  // Generate links based on category similarity and importance
  const links: QuestionLink[] = questions.flatMap((q1, i) =>
    questions.slice(i + 1).map((q2) => ({
      source: q1.id,
      target: q2.id,
      strength: q1.category === q2.category ? 0.8 : 0.3,
    }))
  ).filter((link) => stableProbability(link.source, link.target) < link.strength);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Node positions (force-directed layout simulation)
    const nodePositions = new Map(
      questions.map((q, i) => {
        const angle = (i / questions.length) * Math.PI * 2;
        const radius = Math.min(canvas.width, canvas.height) / 4;
        return [
          q.id,
          {
            x: canvas.width / 2 / window.devicePixelRatio + Math.cos(angle) * radius,
            y: canvas.height / 2 / window.devicePixelRatio + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
          },
        ];
      })
    );

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Apply forces
      nodePositions.forEach((pos1, id1) => {
        // Repulsion from other nodes
        nodePositions.forEach((pos2, id2) => {
          if (id1 !== id2) {
            const dx = pos2.x - pos1.x;
            const dy = pos2.y - pos1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = -50 / (dist * dist);
            pos1.vx += (dx / dist) * force;
            pos1.vy += (dy / dist) * force;
          }
        });

        // Attraction from links
        links.forEach((link) => {
          if (link.source === id1 || link.target === id1) {
            const otherId = link.source === id1 ? link.target : link.source;
            const pos2 = nodePositions.get(otherId);
            if (pos2) {
              const dx = pos2.x - pos1.x;
              const dy = pos2.y - pos1.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = dist * 0.01 * link.strength;
              pos1.vx += (dx / dist) * force;
              pos1.vy += (dy / dist) * force;
            }
          }
        });

        // Center gravity
        const centerX = width / 2;
        const centerY = height / 2;
        pos1.vx += (centerX - pos1.x) * 0.001;
        pos1.vy += (centerY - pos1.y) * 0.001;

        // Update position
        pos1.vx *= 0.9; // damping
        pos1.vy *= 0.9;
        pos1.x += pos1.vx;
        pos1.y += pos1.vy;

        // Keep in bounds
        const padding = 30;
        pos1.x = Math.max(padding, Math.min(width - padding, pos1.x));
        pos1.y = Math.max(padding, Math.min(height - padding, pos1.y));
      });

      // Draw links
      links.forEach((link) => {
        const source = nodePositions.get(link.source);
        const target = nodePositions.get(link.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = `rgba(100, 116, 139, ${0.1 + link.strength * 0.2})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Draw nodes
      questions.forEach((q) => {
        const pos = nodePositions.get(q.id);
        if (!pos) return;

        const isHovered = hoveredNode === q.id;
        const isSelected = selectedNode === q.id;
        const radius = isSelected ? 10 : isHovered ? 8 : 6;

        // Glow effect for selected/hovered
        if (isSelected || isHovered) {
          ctx.shadowBlur = 15;
          ctx.shadowColor =
            q.status === "YES"
              ? "#0d9488"
              : q.status === "PARTIAL"
              ? "#b45309"
              : "#c2414a";
        } else {
          ctx.shadowBlur = 0;
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle =
          q.status === "YES"
            ? "#0d9488"
            : q.status === "PARTIAL"
            ? "#b45309"
            : "#c2414a";
        ctx.fill();

        // Border for HIGH importance
        if (q.importance === "HIGH") {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let found = false;
      nodePositions.forEach((pos, id) => {
        const dx = pos.x - x;
        const dy = pos.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) {
          setHoveredNode(id);
          canvas.style.cursor = "pointer";
          found = true;
        }
      });

      if (!found) {
        setHoveredNode(null);
        canvas.style.cursor = "default";
      }
    };

    const handleClick = () => {
      if (hoveredNode) {
        setSelectedNode(hoveredNode === selectedNode ? null : hoveredNode);
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [questions, links, hoveredNode, selectedNode]);

  const selectedQuestion = questions.find((q) => q.id === selectedNode);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Question Relationship Network</CardTitle>
        <CardDescription>
          Interactive visualization of question connections and coverage patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg border border-border bg-muted/30"
            style={{ height: "400px" }}
          />
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-warning" />
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span>Missing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-white bg-success" />
              <span>High Importance</span>
            </div>
          </div>

          {/* Selected Question Details */}
          {selectedQuestion && (
            <div className="mt-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium">{selectedQuestion.question}</p>
                  <div className="mt-2 flex gap-2">
                    <span
                      className={`text-xs font-medium ${
                        selectedQuestion.status === "YES"
                          ? "text-success"
                          : selectedQuestion.status === "PARTIAL"
                          ? "text-warning"
                          : "text-destructive"
                      }`}
                    >
                      {selectedQuestion.status}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedQuestion.importance} Priority
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedQuestion.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
