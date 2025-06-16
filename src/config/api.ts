// API Configuration for different environments

// API Configuration
const getApiBaseUrl = (): string => {
  // Priority: Environment variable > Production Railway URL > Development localhost
  const baseUrl = import.meta.env.VITE_SERVER_URL || 
         (import.meta.env.PROD ? 'https://server-production-d7dd.up.railway.app' : 'http://localhost:3001')
  
  // Remove trailing slash if present
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

export const API_BASE_URL = getApiBaseUrl()

// Helper function to make API calls with the correct base URL
export const apiCall = async (endpoint: string, options?: RequestInit) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  const url = `${API_BASE_URL}/${cleanEndpoint}`
  
  console.log('Making API call to:', url)
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    
    // Return the response directly, let the caller handle the response
    return response
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}

export default API_BASE_URL 