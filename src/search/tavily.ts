import { tavily } from '@tavily/core';

export interface SearchResult {
  answer: string;
  results: Array<{ title: string; url: string; content: string }>;
}

export function createTavilyClient(apiKey?: string) {
  const client = apiKey ? tavily({ apiKey }) : null;

  async function search(query: string): Promise<SearchResult | null> {
    if (!client) {
      return null;
    }

    try {
      const response = await client.search(query, {
        searchDepth: 'basic',
        includeAnswer: 'basic',
        maxResults: 3,
      });

      return {
        answer: response.answer ?? '',
        results: response.results.map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        })),
      };
    } catch (err) {
      console.error('Tavily search error:', err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  return { search, isAvailable: !!client };
}
