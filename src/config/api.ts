// API Configuration for different environments

// API Configuration
const getApiBaseUrl = (): string => {
  // In production, use the Railway URL directly
  if (import.meta.env.PROD) {
    return 'https://server-production-d7dd.up.railway.app';
  }
  
  // In development, use localhost
  return 'http://localhost:3001';
}

export const API_BASE_URL = getApiBaseUrl();

// Helper function to make API calls with the correct base URL
export const apiCall = async (endpoint: string, options?: RequestInit) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${API_BASE_URL}/${cleanEndpoint}`;
  
  console.log('Making API call to:', url);
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    // Return the response directly, let the caller handle the response
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

export default API_BASE_URL; 