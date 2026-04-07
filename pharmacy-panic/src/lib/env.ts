import { z } from "zod";

const envSchema = z.object({
  TINYFISH_API_KEY: z.string().min(1, "TINYFISH_API_KEY is required"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("must be a valid URL").optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;
let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const missing = Object.entries(formatted)
      .map(([key, errors]) => `  ${key}: ${errors?.join(", ")}`)
      .join("\n");
    throw new Error(`Missing or invalid environment variables:\n${missing}`);
  }
  _env = result.data;
  return _env;
}
