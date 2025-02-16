// src/LoginPage.js
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LoginPage = () => {
  const { loginWithRedirect } = useAuth0();

  const handleLogin = () => {
    // Initiate real Auth0 authentication
    loginWithRedirect();
  };

  return (
    <div className="h-screen flex justify-center items-center bg-gray-800">
      <div className="p-8 bg-gray-700 rounded shadow max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-4">Login</h2>
        <button
          onClick={handleLogin}
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
        >
          Login with Auth0
        </button>
      </div>
    </div>
  );
};

export default LoginPage;