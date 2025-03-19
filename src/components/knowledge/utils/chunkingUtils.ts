
export type ChunkingMethod = 
  | 'lineBreak' 
  | 'paragraph';

export interface ChunkingOptions {
  method: ChunkingMethod;
  lineBreakPattern?: string;
}

export const splitByLineBreak = (content: string, pattern: string = '\n'): string[] => {
  // Escape any special regex characters in the pattern
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedPattern, 'g');
  
  return content
    .split(regex)
    .map(line => line.trim())
    .filter(line => line.length > 0);
};

export const splitByParagraph = (content: string): string[] => {
  return content
    .split(/\n\s*\n/)
    .map(para => para.trim())
    .filter(para => para.length > 0);
};

export const generateChunks = (
  content: string, 
  options: ChunkingOptions
): string[] => {
  switch (options.method) {
    case 'lineBreak':
      return splitByLineBreak(content, options.lineBreakPattern);
    case 'paragraph':
      return splitByParagraph(content);
    default:
      return splitByLineBreak(content);
  }
};
