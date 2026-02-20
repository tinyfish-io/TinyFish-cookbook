// ===========================================
// Wing Scout v2 — Environment Variable Validation
// ===========================================

const requiredServerEnvVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'AGENTQL_API_KEY',
] as const;

const requiredClientEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const optionalEnvVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'AGENTQL_API_URL',
] as const;

export function validateEnv(): {
    valid: boolean;
    missing: string[];
    warnings: string[];
} {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const envVar of requiredServerEnvVars) {
        if (!process.env[envVar]) missing.push(envVar);
    }

    for (const envVar of requiredClientEnvVars) {
        if (!process.env[envVar]) missing.push(envVar);
    }

    for (const envVar of optionalEnvVars) {
        if (!process.env[envVar]) warnings.push(`Optional: ${envVar} not set`);
    }

    const hasRedisUrl = !!process.env.UPSTASH_REDIS_REST_URL;
    const hasRedisToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
    if (hasRedisUrl !== hasRedisToken) {
        warnings.push('Redis: Both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set together');
    }

    return { valid: missing.length === 0, missing, warnings };
}

export function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined) return defaultValue;
        throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
}

export function getOptionalEnv(key: string): string | undefined {
    return process.env[key];
}

export function logEnvValidation(): void {
    const result = validateEnv();
    if (!result.valid) {
        console.error('MISSING REQUIRED ENVIRONMENT VARIABLES:');
        result.missing.forEach(v => console.error(`  - ${v}`));
    }
    if (result.warnings.length > 0) {
        console.warn('Environment warnings:');
        result.warnings.forEach(w => console.warn(`  - ${w}`));
    }
}
