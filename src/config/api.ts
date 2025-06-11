// API Configuration for different environments

export const API_CONFIG = {
  // Base URL for API calls
  BASE_URL: import.meta.env.PROD 
    ? (import.meta.env.VITE_API_URL || 'https://your-railway-app.up.railway.app')
    : 'http://localhost:3001',
  
  // Socket.IO URL (same as API URL)
  SOCKET_URL: import.meta.env.PROD 
    ? (import.meta.env.VITE_API_URL || 'https://your-railway-app.up.railway.app')
    : 'http://localhost:3001',
    
  // Environment check
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
};

// Export for easy access
export default API_CONFIG; 