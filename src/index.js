// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Fetch runtime configuration from /config.json
fetch('/config.json')
  .then((res) => res.json())
  .then((config) => {
    // Set the config in a global variable
    window._env_ = config;
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((err) => {
    console.error('Failed to load runtime config:', err);
    window._env_ = {}; // fallback to empty config
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });

// Report web vitals
reportWebVitals();