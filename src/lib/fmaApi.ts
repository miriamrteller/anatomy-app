/**
 * FMA (Foundational Model of Anatomy) API Client
 * 
 * Dual-source architecture:
 * 1. PRIMARY: BioPortal API (faster, structured results) - 500 queries/day
 * 2. FALLBACK: SPARQL endpoint (unlimited, more complex) - when rate limited
 * 
 * Features:
 * - In-memory caching to avoid duplicate requests
 * - Rate limit tracking and automatic fallback
 * - Graceful degradation if both sources fail
 */

interface FMAResult {
  id: string;
  prefLabel: string;
  definition?: string;
  relationships?: {
    is_a?: string[];
    part_of?: string[];
    related_to?: string[];
  };
  source: 'bioportal' | 'sparql' | 'cache';
}

interface RateLimitInfo {
  remaining: number;
  reset: Date | null;
  isLimited: boolean;
}

class FMAClient {
  private bioPortalKey: string;
  private bioPortalUrl: string;
  private sparqlUrl: string;
  private cache: Map<string, FMAResult> = new Map();
  private rateLimitInfo: RateLimitInfo = {
    remaining: 500,
    reset: null,
    isLimited: false,
  };

  constructor() {
    this.bioPortalKey = process.env.BioPortal_API_KEY || '';
    this.bioPortalUrl = process.env.BioPortal_API_URL || '';
    this.sparqlUrl = process.env.SPARQL_ENDPOINT || '';

    if (!this.bioPortalKey) {
      console.warn('[FMA] BioPortal API key not configured');
    }
    if (!this.sparqlUrl) {
      console.warn('[FMA] SPARQL endpoint not configured');
    }
  }

  /**
   * Search for anatomical structure in FMA
   * Returns definition, relationships, and source
   */
  async search(term: string): Promise<FMAResult | null> {
    const cacheKey = `search:${term.toLowerCase()}`;

    // Return from cache if available
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return { ...cached, source: 'cache' };
    }

    console.log(`[FMA] Searching for: "${term}"`);

    try {
      // Try BioPortal first (if not rate limited)
      if (!this.rateLimitInfo.isLimited) {
        const result = await this.searchBioPortal(term);
        if (result) {
          this.cache.set(cacheKey, result);
          return result;
        }
      }

      // Fallback to SPARQL
      console.log(`[FMA] BioPortal unavailable or rate-limited, using SPARQL`);
      const result = await this.searchSPARQL(term);
      if (result) {
        this.cache.set(cacheKey, result);
        return result;
      }

      console.log(`[FMA] No results found for: "${term}"`);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FMA] Search failed: ${message}`);
      return null;
    }
  }

  /**
   * BioPortal API search (primary source)
   * Structured, fast responses. Limited to 500/day free tier.
   */
  private async searchBioPortal(term: string): Promise<FMAResult | null> {
    if (!this.bioPortalKey || !this.bioPortalUrl) {
      return null;
    }

    try {
      const searchUrl = new URL(this.bioPortalUrl);
      searchUrl.searchParams.append('q', term);
      searchUrl.searchParams.append('apikey', this.bioPortalKey);
      searchUrl.searchParams.append('pagesize', '1'); // Get top result

      const response = await fetch(searchUrl.toString(), {
        headers: {
          Accept: 'application/json',
        },
      });

      // Track rate limit from response headers
      const remaining = response.headers.get('x-rate-limit-remaining');
      if (remaining) {
        this.rateLimitInfo.remaining = parseInt(remaining, 10);
        console.log(`[FMA] Rate limit remaining: ${this.rateLimitInfo.remaining}`);

        // Flag as limited if less than 10 requests left
        if (this.rateLimitInfo.remaining < 10) {
          this.rateLimitInfo.isLimited = true;
          const reset = response.headers.get('x-rate-limit-reset');
          if (reset) {
            this.rateLimitInfo.reset = new Date(parseInt(reset, 10) * 1000);
            console.warn(
              `[FMA] Rate limit approaching. Switching to SPARQL. Reset at ${this.rateLimitInfo.reset}`
            );
          }
        }
      }

      if (!response.ok) {
        if (response.status === 429) {
          this.rateLimitInfo.isLimited = true;
          console.warn('[FMA] BioPortal rate limit exceeded. Switching to SPARQL.');
          return null;
        }
        console.error(`[FMA] BioPortal error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data.collection || data.collection.length === 0) {
        return null;
      }

      const item = data.collection[0];
      return {
        id: item['@id'] || item.id,
        prefLabel: item.prefLabel || item.name,
        definition: item.definition?.[0],
        relationships: await this.fetchBioPortalRelationships(item['@id']),
        source: 'bioportal',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FMA] BioPortal search failed: ${message}`);
      return null;
    }
  }

  /**
   * Fetch relationships for a BioPortal class
   */
  private async fetchBioPortalRelationships(classId: string): Promise<any> {
    try {
      // Parse FMA ID from URI (e.g., "http://purl.obolibrary.org/obo/FMA_7520")
      const match = classId.match(/FMA_(\d+)/);
      if (!match) return undefined;

      const fmaId = match[1];
      const url = `${this.bioPortalUrl}/${encodeURIComponent(`FMA_${fmaId}`)}?apikey=${this.bioPortalKey}`;

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) return undefined;

      const data = await response.json();
      return {
        is_a: data.parents?.map((p: any) => p.prefLabel),
        part_of: data.relations?.part_of?.map((r: any) => r.prefLabel),
        related_to: data.relations?.related?.map((r: any) => r.prefLabel),
      };
    } catch {
      return undefined;
    }
  }

  /**
   * SPARQL endpoint search (fallback source)
   * Unlimited queries, more complex syntax. Slower responses.
   */
  private async searchSPARQL(term: string): Promise<FMAResult | null> {
    if (!this.sparqlUrl) {
      return null;
    }

    try {
      // Simple SPARQL query to find class by name
      const sparqlQuery = `
        PREFIX fma: <http://purl.obolibrary.org/obo/FMA_>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        
        SELECT ?class ?label ?definition
        WHERE {
          ?class rdfs:label ?label .
          FILTER(STRSTARTS(LCASE(?label), LCASE("${term}")))
          OPTIONAL { ?class dc:description ?definition }
        }
        LIMIT 1
      `;

      const response = await fetch(`${this.sparqlUrl}?query=${encodeURIComponent(sparqlQuery)}`, {
        headers: {
          Accept: 'application/sparql-results+json',
        },
      });

      if (!response.ok) {
        console.error(`[FMA] SPARQL error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data.results?.bindings || data.results.bindings.length === 0) {
        return null;
      }

      const binding = data.results.bindings[0];
      return {
        id: binding.class?.value,
        prefLabel: binding.label?.value,
        definition: binding.definition?.value,
        source: 'sparql',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FMA] SPARQL search failed: ${message}`);
      return null;
    }
  }

  /**
   * Get detailed info about a structure (used by system prompt enrichment)
   */
  async getDetails(term: string): Promise<{
    definition: string;
    relationships: string[];
    source: string;
  } | null> {
    const result = await this.search(term);
    if (!result) return null;

    const relationships: string[] = [];
    if (result.relationships) {
      if (result.relationships.is_a) {
        relationships.push(`Is a type of: ${result.relationships.is_a.join(', ')}`);
      }
      if (result.relationships.part_of) {
        relationships.push(`Part of: ${result.relationships.part_of.join(', ')}`);
      }
    }

    return {
      definition: result.definition || '',
      relationships,
      source: result.source,
    };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  /**
   * Reset rate limit (for testing)
   */
  resetRateLimit(): void {
    this.rateLimitInfo.remaining = 500;
    this.rateLimitInfo.isLimited = false;
    this.rateLimitInfo.reset = null;
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Singleton instance
const fmaClient = new FMAClient();

export { fmaClient, FMAResult, RateLimitInfo };
