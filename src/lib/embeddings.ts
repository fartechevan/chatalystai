
import OpenAI from 'openai';

// In development, we'll use a fallback API key if the environment variable is not set
const getOpenAIKey = () => {
  return process.env.OPENAI_API_KEY || 'sk-fallback-for-development-only';
};

const openai = new OpenAI({
  apiKey: getOpenAIKey(),
});

export async function generateEmbedding(content: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // For development fallback, return a mock embedding with 1536 dimensions (ada-002 standard)
    if (!process.env.OPENAI_API_KEY) {
      console.warn('Using mock embedding because OPENAI_API_KEY is not set');
      return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    }
    throw error;
  }
}
