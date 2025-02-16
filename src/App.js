// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import EnhancedFinanceManager from './EnhancedFinanceManager';
import LoginPage from './LoginPage';
import sessionManager from './sessionManager';
import LiveAgentChat from './LiveAgentChat';
// A simple PrivateRoute component to protect your main app route.
const PrivateRoute = ({ element }) => {
  const { isAuthenticated, isLoading } = useAuth0();
  const [auth, setAuth] = useState(isAuthenticated);

  useEffect(() => {
    setAuth(isAuthenticated);
  }, [isAuthenticated]);

  if (isLoading) return <div>Loading...</div>;
  return auth ? element : <LoginPage />;
};

function App() {
  // Replace these values with your Auth0 credentials.
  const domain = process.env.REACT_APP_OKTA_DOMAIN;
  const clientId = process.env.REACT_APP_OKTA_CLIENT_ID;

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      redirectUri={window.location.origin}
    >
      <Router>
        <Routes>
          <Route path="/" element={<PrivateRoute element={<EnhancedFinanceManager />} />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
        <LiveAgentChat 
          brandColor="#2563eb"
          websiteName="My Website Chat"
        />
      </Router>
    </Auth0Provider>
  );
}

export default App;