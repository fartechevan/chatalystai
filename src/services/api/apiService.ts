interface ApiRequestOptions extends RequestInit {
  logRequests?: boolean; // Flag to enable/disable logging for this specific request
}

interface FileUploadResponse {
  success: boolean;
  message?: string;
  fileUrl?: string;
  error?: string;
  text_content?: string;
  session_id?: string;
  image_urls?: string[];
}

interface ApiServiceConfig {
  enableLoggingByDefault?: boolean; // Global flag to enable/disable logging
}

class ApiService {
  private config: ApiServiceConfig;

  constructor(config: ApiServiceConfig = {}) {
    this.config = {
      enableLoggingByDefault: config.enableLoggingByDefault ?? false, // Default to false if not provided
    };
  }

  async request<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
    const { logRequests, ...fetchOptions } = options;
    const shouldLog = logRequests ?? this.config.enableLoggingByDefault;

    if (shouldLog) {
      console.log(`--- ApiService Request ---`);
      console.log(`URL: ${url}`);
      console.log(`Method: ${fetchOptions.method || 'GET'}`);
      if (fetchOptions.headers) {
        console.log(`Headers: ${JSON.stringify(fetchOptions.headers)}`);
      }
      if (fetchOptions.body) {
        // Avoid logging sensitive data in production if necessary
        console.log(`Body: ${fetchOptions.body}`);
      }
      console.log(`-------------------------`);
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (shouldLog) {
        console.log(`--- ApiService Response ---`);
        console.log(`URL: ${url}`);
        console.log(`Status: ${response.status} ${response.statusText}`);
        // Consider logging response headers if needed
      }

      if (!response.ok) {
        let errorText = `Status: ${response.status} ${response.statusText}`;
        let errorDetails = '';
        try {
          // Attempt to parse error details from the response body
          const errorJson = await response.clone().json(); // Clone response to read body multiple times if needed
          errorDetails = errorJson.message || errorJson.error || JSON.stringify(errorJson);
          errorText += ` - ${errorDetails}`;
        } catch (e) {
          // Fallback if response is not JSON or parsing fails
          try {
            errorDetails = await response.text();
            errorText += ` - ${errorDetails}`;
          } catch (textError) {
             errorText += ` - (Failed to read error response body)`;
          }
        }

        if (shouldLog) {
          console.error(`Error Details: ${errorDetails}`);
          console.log(`--------------------------`);
        }
        throw new Error(`API request failed: ${errorText}`);
      }

      // Attempt to parse JSON, handle cases with no content
      const contentType = response.headers.get('content-type');
      let data: T;
      if (contentType && contentType.includes('application/json')) {
         data = await response.json();
      } else if (response.status === 204 || response.headers.get('content-length') === '0') {
         // Handle No Content response
         data = null as T; // Or appropriate representation for no content
      }
       else {
         // Handle non-JSON responses if necessary, e.g., text
         data = await response.text() as unknown as T;
      }


      if (shouldLog) {
         // Log the full response data
         console.log(`Response Data: ${JSON.stringify(data)}`);
         console.log(`--------------------------`);
      }

      return data;

    } catch (error) {
      if (shouldLog) {
        console.error(`--- ApiService Error ---`);
        console.error(`URL: ${url}`);
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        console.log(`-----------------------`);
      }
      // Re-throw the error to be handled by the caller
      throw error;
    }
  }

  // Method to update logging configuration if needed later
  setLogging(enable: boolean) {
    this.config.enableLoggingByDefault = enable;
    console.log(`ApiService logging ${enable ? 'enabled' : 'disabled'} by default.`); // Also uncomment the config change log
  }

  // Method to upload PDF files to a specific endpoint
  async uploadPdfFile(file: File, endpoint: string): Promise<FileUploadResponse> {
    if (!file || file.type !== "application/pdf") {
      throw new Error("Invalid file type. Please provide a PDF file.");
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.request<FileUploadResponse>(endpoint, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header as it will be automatically set with the boundary parameter
      logRequests: true, // Enable logging for file uploads
    });
  }
}

// Export a singleton instance or allow creating instances
// Singleton approach:
const apiServiceInstance = new ApiService({ enableLoggingByDefault: import.meta.env.DEV }); // Enable logging in dev mode by default

export { ApiService, apiServiceInstance };
