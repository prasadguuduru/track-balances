// src/sessionManager.js
class SessionManager {
    constructor() {
      this.sessionKey = 'sessionStatus';
      this.listeners = [];
      // Listen for localStorage changes in other tabs
      window.addEventListener('storage', (event) => {
        if (event.key === this.sessionKey) {
          this.notifyListeners(event.newValue);
        }
      });
    }
  
    // Register a listener for session changes
    onSessionChange(callback) {
      this.listeners.push(callback);
    }
  
    // Notify all registered listeners
    notifyListeners(status) {
      this.listeners.forEach((callback) => callback(status));
    }
  
    // Call this when a login occurs
    notifyLogin() {
      localStorage.setItem(this.sessionKey, 'loggedIn');
    }
  
    // Call this when a logout occurs
    notifyLogout() {
      localStorage.setItem(this.sessionKey, 'loggedOut');
    }
  
    // Get the current session status
    getSessionStatus() {
      return localStorage.getItem(this.sessionKey);
    }
  }
  
  const sessionManager = new SessionManager();
  export default sessionManager;