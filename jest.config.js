// jest.config.js
module.exports = {
    // Other Jest configuration options...
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',       // your alias mapping
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy' // CSS mapping
    },
    transform: {
      '^.+\\.(js|jsx)$': 'babel-jest',
    },
    moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  };
  