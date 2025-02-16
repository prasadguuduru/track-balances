export default {
    clientId: process.env.REACT_APP_OKTA_CLIENT_ID,
    issuer: `https://${process.env.REACT_APP_OKTA_DOMAIN}/oauth2/default`,
    redirectUri: window.location.origin + '/login/callback',
    scopes: ['openid', 'profile', 'email'],
    pkce: true,
  };