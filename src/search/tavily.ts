import { tavily } from '@tavily/core';

export interface SearchResult {
  answer: string;
  results: Array<{ title: string; url: string; content: string }>;
  /** Texto plano con toda la información concatenada para enviar al LLM */
  text: string;
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

      const results = response.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      }));

      const text = [
        response.answer,
        ...results.map((r) => r.content),
      ]
        .filter(Boolean)
        .join(' | ');

      return {
        answer: response.answer ?? '',
        results,
        text,
      };
    } catch (err) {
      console.error('Tavily search error:', err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  return { search, isAvailable: !!client };
}
