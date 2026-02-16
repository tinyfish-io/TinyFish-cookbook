import { z } from "zod";

export const StepTypeEnum = z.enum([
  "navigate",
  "click",
  "type",
  "extract",
  "wait",
]);

export type StepType = z.infer<typeof StepTypeEnum>;

export const ActionStepSchema = z.object({
  id: z.string(),
  type: StepTypeEnum,
  label: z.string().optional(),
  config: z.object({
    url: z.string().optional(),
    selector: z.string().optional(),
    text: z.string().optional(),
    timeout: z.number().optional(),
    extractKey: z.string().optional(),
  }),
});

export type ActionStep = z.infer<typeof ActionStepSchema>;

export const ActionDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  targetSite: z.string().optional(),
  tags: z.array(z.string()).optional(),
  steps: z.array(ActionStepSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ActionDefinition = z.infer<typeof ActionDefinitionSchema>;

export type StepStatus = "pending" | "running" | "success" | "failed";

export interface ExecutionStep {
  stepId: string;
  status: StepStatus;
  duration?: number;
  error?: string;
}

export interface ExecutionResult {
  id: string;
  actionId: string;
  actionName: string;
  status: "success" | "failed" | "running";
  startedAt: string;
  completedAt?: string;
  duration?: number;
  steps: ExecutionStep[];
  result?: Record<string, unknown>;
  error?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

export const STEP_LABELS: Record<StepType, string> = {
  navigate: "Navigate to URL",
  click: "Click Element",
  type: "Type Text",
  extract: "Extract Data",
  wait: "Wait for Element",
};

export const STEP_ICONS: Record<StepType, string> = {
  navigate: "Globe",
  click: "MousePointerClick",
  type: "Keyboard",
  extract: "Download",
  wait: "Clock",
};
