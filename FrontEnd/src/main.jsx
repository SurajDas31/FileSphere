import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'allotment/dist/style.css'

// Global Fetch Interceptor to inject JWT Bearer Token automatically
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (!options.headers) {
      options.headers = {};
    }
    if (options.headers instanceof Headers) {
      options.headers.set('Authorization', `Bearer ${token}`);
    } else if (Array.isArray(options.headers)) {
      options.headers.push(['Authorization', `Bearer ${token}`]);
    } else {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  try {
    const response = await originalFetch(url, options);
    const urlStr = typeof url === 'string' ? url : (url.url || '');
    if (response.status === 401 && !urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/signup')) {
      window.dispatchEvent(new Event('unauthorized-api-call'));
    }
    return response;
  } catch (error) {
    throw error;
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
