
import OpenAI from 'openai';

export async function generateEmbedding(content: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable is not set.');
    throw new Error('OpenAI API key is missing. Please make sure it is properly set in the environment variables.');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
