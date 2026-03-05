// API Endpoints
export const MINO_API_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';
export const GITHUB_API_URL = 'https://api.github.com';
export const STACKEXCHANGE_API_URL = 'https://api.stackexchange.com/2.3';
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter LLM config
export const OPENROUTER_MODEL = 'google/gemini-2.0-flash-001';
export const OPENROUTER_TEMPERATURE = 0.2;

// Configuration
export const MAX_AGENTS = 10;
export const AGENT_TIMEOUT = 360000; // 6 minutes
export const MIN_INPUT_LENGTH = 10;
export const STACKOVERFLOW_RESULTS_PER_QUERY = 3;

// App metadata
export const APP_NAME = 'Concept Discovery System';
export const APP_DESCRIPTION =
  'Discover similar projects across multiple platforms';

// Platform display names
export const PLATFORM_INFO = {
  github: {
    name: 'GitHub',
    baseUrl: 'https://github.com',
  },
  devto: {
    name: 'Dev.to',
    baseUrl: 'https://dev.to',
  },
  stackoverflow: {
    name: 'Stack Overflow',
    baseUrl: 'https://stackoverflow.com',
  },
} as const;
