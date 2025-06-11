// API Configuration for different environments

// API Configuration
const getApiBaseUrl = (): string => {
  // Priority: Environment variable > Production Railway URL > Development localhost
  return import.meta.env.VITE_SERVER_URL || 
         (import.meta.env.PROD ? 'https://server-production-d7dd.up.railway.app' : 'http://localhost:3001')
}

export const API_BASE_URL = getApiBaseUrl()

// Helper function to make API calls with the correct base URL
export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${endpoint}`
  return fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for authentication
  })
}

export default API_BASE_URL 