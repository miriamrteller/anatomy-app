import { OpenAI } from 'openai';

/**
 * OpenAI client singleton
 * Ensures we only create one client instance across the entire application
 * Prevents unnecessary instantiation and connection overhead
 */
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set in environment variables. ' +
        'Please add it to your .env file before running the application.'
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}
