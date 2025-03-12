
export type ChunkingMethod = 
  | 'lineBreak' 
  | 'paragraph' 
  | 'page' 
  | 'custom' 
  | 'header'
  | 'customLineBreak';

export interface ChunkingOptions {
  method: ChunkingMethod;
  customChunkSize?: number;
  customLineBreakPattern?: string;
  headerLevels?: number[];
}

export const splitByLineBreak = (content: string): string[] => {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
};

export const splitByCustomLineBreak = (content: string, pattern: string): string[] => {
  // Escape any special regex characters in the pattern
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedPattern, 'g');
  
  return content
    .split(regex)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0);
};

export const splitByParagraph = (content: string): string[] => {
  return content
    .split(/\n\s*\n/)
    .map(para => para.trim())
    .filter(para => para.length > 0);
};

export const splitByPage = (content: string): string[] => {
  // Simple simulation - we'll consider double line breaks as page boundaries
  // In a real implementation with PDF.js, you would use actual page information
  return content
    .split(/\n\s*\n\s*\n\s*\n/)
    .map(page => page.trim())
    .filter(page => page.length > 0);
};

export const splitByHeader = (content: string, headerLevels: number[] = [1, 2, 3]): string[] => {
  // Create regex pattern for markdown headers of specified levels
  const headerPattern = headerLevels
    .map(level => `^#{${level}}\\s+.+$`)
    .join('|');
  
  const headerRegex = new RegExp(headerPattern, 'gm');
  
  // Find all headers
  const headers: { index: number; text: string; }[] = [];
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    headers.push({
      index: match.index,
      text: match[0]
    });
  }
  
  if (headers.length === 0) {
    return [content.trim()];
  }
  
  // Split content by headers
  const chunks: string[] = [];
  
  // Add content before first header if it exists
  if (headers[0].index > 0) {
    chunks.push(content.substring(0, headers[0].index).trim());
  }
  
  // Add content between headers
  for (let i = 0; i < headers.length; i++) {
    const startIdx = headers[i].index;
    const endIdx = i < headers.length - 1 ? headers[i + 1].index : content.length;
    const chunk = content.substring(startIdx, endIdx).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
  }
  
  return chunks.filter(chunk => chunk.length > 0);
};

export const splitByCustomSize = (content: string, size: number): string[] => {
  const chunks: string[] = [];
  let currentChunk = '';
  
  content.split(/\s+/).forEach(word => {
    if (currentChunk.length + word.length + 1 > size) {
      chunks.push(currentChunk.trim());
      currentChunk = word;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + word;
    }
  });
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
};

export const generateChunks = (
  content: string, 
  options: ChunkingOptions
): string[] => {
  switch (options.method) {
    case 'lineBreak':
      return splitByLineBreak(content);
    case 'customLineBreak':
      return splitByCustomLineBreak(content, options.customLineBreakPattern || '\\n\\n\\n');
    case 'paragraph':
      return splitByParagraph(content);
    case 'page':
      return splitByPage(content);
    case 'header':
      return splitByHeader(content, options.headerLevels || [1, 2, 3]);
    case 'custom':
      return splitByCustomSize(content, options.customChunkSize || 500);
    default:
      return splitByLineBreak(content);
  }
};
