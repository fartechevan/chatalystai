import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface FileUploadOptions {
  bucket?: string;
  folder?: string;
  fileName?: string;
  cacheControl?: string;
  upsert?: boolean;
}

/**
 * Upload a file to Supabase Storage using Edge Function
 * @param file - File object or base64 string
 * @param options - Upload options
 * @returns Promise<FileUploadResult>
 */
export async function uploadFileToStorage(
  file: File | string,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  try {
    const {
      bucket = 'assets',
      folder = 'whatsapp-attachments',
      fileName,
    } = options;

    let fileData: string;
    let finalFileName: string;
    let mimeType: string;
    let fileSize: number;

    if (file instanceof File) {
      // Handle File object - convert to base64
      fileData = await fileToBase64(file);
      finalFileName = fileName || file.name;
      mimeType = file.type;
      fileSize = file.size;
    } else {
      // Handle base64 string
      fileData = file;
      finalFileName = fileName || `${Date.now()}-attachment`;
      mimeType = getMimeTypeFromBase64(file);
      fileSize = 0; // Can't determine size from base64 without decoding
    }

    // Call the Edge Function for file upload
    const response = await fetch(`${supabaseUrl}/functions/v1/upload-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        fileName: finalFileName,
        fileData: fileData,
        bucket: bucket,
        folder: folder
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge Function upload error:', errorData);
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const result = await response.json();

    return {
      success: true,
      url: result.publicUrl,
      fileName: finalFileName,
      fileSize,
      mimeType
    };

  } catch (error: any) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param filePath - Path to the file in storage
 * @param bucket - Storage bucket name
 * @returns Promise<boolean>
 */
export async function deleteFileFromStorage(
  filePath: string,
  bucket: string = 'assets'
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('File deletion error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('File deletion service error:', error);
    return false;
  }
}

/**
 * Get MIME type from base64 string
 * @param base64String - Base64 encoded file
 * @returns MIME type string
 */
function getMimeTypeFromBase64(base64String: string): string {
  if (base64String.startsWith('data:')) {
    const mimeMatch = base64String.match(/data:([^;]+);/);
    if (mimeMatch) {
      return mimeMatch[1];
    }
  }

  // Default fallback based on common patterns
  const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
  const firstBytes = atob(base64Data.substring(0, 20));
  
  // Check for common file signatures
  if (firstBytes.startsWith('\xFF\xD8\xFF')) return 'image/jpeg';
  if (firstBytes.startsWith('\x89PNG')) return 'image/png';
  if (firstBytes.startsWith('GIF8')) return 'image/gif';
  if (firstBytes.startsWith('%PDF')) return 'application/pdf';
  if (firstBytes.includes('WEBP')) return 'image/webp';
  
  return 'application/octet-stream';
}

/**
 * Convert File to base64 string
 * @param file - File object
 * @returns Promise<string>
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Get file extension from MIME type
 * @param mimeType - MIME type string
 * @returns File extension
 */
export function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'video/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav'
  };

  return mimeToExt[mimeType] || '';
}