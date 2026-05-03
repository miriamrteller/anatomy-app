import { z } from 'zod';

/**
 * Environment Configuration Validation
 * 
 * Validates all required and optional environment variables on server startup.
 * If validation fails, logs missing fields and exits with code 1.
 * 
 * Usage:
 *   import { config } from './lib/config.js'
 *   const dbUrl = config.DATABASE_URL  // Type-safe
 *   
 * Required variables:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - OPENAI_API_KEY: OpenAI API key (starts with 'sk-')
 *   
 * Optional variables (have defaults):
 *   - NODE_ENV: 'development' | 'production' | 'test' (default: 'development')
 *   - PORT: number (default: 3000)
 *   - FRONTEND_URL: URL string (default: http://localhost:5173)
 *   - LANGSMITH_API_KEY: LangSmith tracing API key
 */

const ConfigSchema = z.object({
  // REQUIRED
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid URL')
    .describe('PostgreSQL connection string'),
  OPENAI_API_KEY: z
    .string()
    .startsWith('sk-', { message: 'OpenAI API key must start with "sk-"' })
    .describe('OpenAI API key'),

  // OPTIONAL with defaults
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node environment'),
  PORT: z
    .coerce.number()
    .default(3000)
    .describe('Server port'),
  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL must be a valid URL')
    .default('http://localhost:5173')
    .describe('Frontend URL for CORS'),

  // OPTIONAL without defaults
  LANGSMITH_API_KEY: z
    .string()
    .optional()
    .describe('LangSmith API key for tracing'),
});

export type Config = z.infer<typeof ConfigSchema>;

let config: Config;

try {
  config = ConfigSchema.parse(process.env);
  console.log('✅ Configuration valid');
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   PORT: ${config.PORT}`);
  console.log(`   FRONTEND_URL: ${config.FRONTEND_URL}`);
  if (config.LANGSMITH_API_KEY) {
    console.log(`   LANGSMITH_API_KEY: configured`);
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Configuration validation failed. Missing or invalid environment variables:');
    error.errors.forEach((err) => {
      const field = err.path.join('.');
      console.error(`   - ${field}: ${err.message}`);
    });
    console.error('\n📝 Set these variables in your .env file (see .env.example for reference)');
  } else {
    console.error('❌ Unexpected error during configuration validation:', error);
  }
  process.exit(1);
}

export { config };
