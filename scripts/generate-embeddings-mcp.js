import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

// Sample chunks from the database query
const sampleChunks = [
  {
    id: "cc9ab109-c7a4-47ff-baa4-e5d889b47872",
    content: "[HIGH RELEVANCE] Image (photo): The image features a group of four people gathered around a tablet. They appear to be engaged in a discussion or presentation. The background includes abstract geometric shapes in shades of red, adding a modern and dynamic feel to the image. | Key elements: group of people, tablet, discussion, geometric shapes, red background | Searchable terms: group meeting, tablet discussion, business presentation, modern design, teamwork | (Source: ce7c1d85-a798-4743-abdb-1ca36ec7ab05_doc1_page1_img1.png, Relevance: 8/10) | Image URL: https://storage.googleapis.com/chatalyst-storage/Company_Name_4/ce7c1d85-a798-4743-abdb-1ca36ec7ab05/images/ce7c1d85-a798-4743-abdb-1ca36ec7ab05_doc1_page1_img1.png"
  },
  {
    id: "841af061-1917-495f-92a5-3a39fa5c0395",
    content: "HEALTH\nHealth Screening\nBenefit & Yearly\nCash Bonus\nA-Life Essential Critical Care\nwith\nESSENTIAL HEALTHCARE\nPROTECTION FOR THE\nCRITICAL MOMENTS\nThe benefit(s) payable under eligible policy/product is(are) protected by Perbadanan \nInsurans Deposit Malaysia (\"PIDM\") up to limits. Please refer to PIDM's Takaful and \nInsurance Benefits Protection System (\"TIPS\") Brochure or contact AIA Bhd. or PIDM \n(visit www.pidm.gov.my).\nAIA Bhd.\nMember of PIDM"
  },
  {
    id: "46e3177f-bb26-464f-91ee-bad9f167a0f0",
    content: "[MINIMAL RELEVANCE] Image (design element): The image is a black rounded rectangle with no visible text or additional elements. It appears to be a placeholder or a design element without specific content. | Key elements: black rounded rectangle, placeholder | Searchable terms: black rectangle, rounded rectangle, placeholder image, design element | (Source: ce7c1d85-a798-4743-abdb-1ca36ec7ab05_doc1_page1_img2.png, Relevance: 3/10) | Image URL: https://storage.googleapis.com/chatalyst-storage/Company_Name_4/ce7c1d85-a798-4743-abdb-1ca36ec7ab05/images/ce7c1d85-a798-4743-abdb-1ca36ec7ab05_doc1_page1_img2.png"
  },
  {
    id: "39b65627-7e9d-4deb-889a-9b951f61c3be",
    content: "A-Life Essential Critical Care\nBenefits at a glance"
  },
  {
    id: "4ad1cfde-e103-44a6-8662-d4b46f22ee16",
    content: "[MEDIUM RELEVANCE] Image (screenshot): The image is a PowerPoint slide featuring a promotional design for flexible insurance solutions by AIA. It includes a photo of two people collaborating over a laptop, with a prominent pink geometric design and the AIA logo. A yellow box on the left lists color codes for different insurance categories, such as health, protection, and investment. | Key elements: PowerPoint slide, insurance promotion, AIA logo, people collaborating, color codes list | Searchable terms: AIA insurance, flexible insurance solutions, PowerPoint slide, insurance color codes, business collaboration | (Source: ce7c1d85-a798-4743-abdb-1ca36ec7ab05_doc1_page2_img1.png, Relevance: 7/10) | Image URL: https://storage.googleapis.com/chatalyst-storage/Company_Name_4/ce7c1d85-a798-4743-abdb-1ca36ec7ab05/images/ce7c1d85-a798-4743-abdb-1ca36ec7ab05_doc1_page2_img1.png"
  }
];

async function generateEmbeddingsForSampleChunks() {
  console.log('Generating embeddings for sample chunks...');
  
  for (const chunk of sampleChunks) {
    try {
      console.log(`Generating embedding for chunk ${chunk.id}...`);
      const embedding = await generateEmbedding(chunk.content);
      
      console.log(`✓ Generated embedding for chunk ${chunk.id}`);
      console.log(`Embedding (first 5 values): [${embedding.slice(0, 5).join(', ')}, ...]`);
      console.log(`SQL to update: UPDATE knowledge_chunks SET embedding = '[${embedding.join(',')}]' WHERE id = '${chunk.id}';`);
      console.log('---');
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing chunk ${chunk.id}:`, error.message);
    }
  }
  
  console.log('\n✅ Sample embedding generation complete!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateEmbeddingsForSampleChunks().catch(console.error);
}

export { generateEmbeddingsForSampleChunks };