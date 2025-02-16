// jest.config.js
module.exports = {
    // Other Jest configuration options...
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',       // your alias mapping
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // CSS mapping
      '^emoji-mart/css/emoji-mart.css$': 'identity-obj-proxy',// Add this line
    },
    transform: {
      '^.+\\.(js|jsx)$': 'babel-jest',
    },
    moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  };
  