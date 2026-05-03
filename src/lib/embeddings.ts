import { getOpenAIClient } from './openai';

/**
 * Embed text using OpenAI's text-embedding-3-small model
 * Returns a 1536-dimensional vector suitable for semantic search
 *
 * @param text - The text to embed (typically a structure description)
 * @returns A 1536-element array of numbers (the embedding vector)
 */
export async function embedText(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536, // Fixed dimension size for consistency
  });

  // OpenAI returns an array of embedding objects
  // We take the first one (single text input)
  return response.data[0].embedding;
}

/**
 * Build a rich text representation of a structure for embedding
 * Combines all relevant fields into readable prose
 *
 * More information = better embeddings = better semantic search results
 * The embedding model works best with natural language, not just keywords
 *
 * @param structure - The structure object from the database
 * @returns A formatted string combining all structure information
 */
export function buildStructureText(structure: {
  name: string;
  description: string;
  latinName: string;
  system: string;
  svgPathIds?: string[];
}): string {
  const svgIds = structure.svgPathIds?.filter(Boolean).join(', ') || 'N/A';

  return (
    `${structure.name}: ${structure.description}. ` +
    `Latin name: ${structure.latinName}. ` +
    `System: ${structure.system}. ` +
    `SVG path ids: ${svgIds}`
  );
}
