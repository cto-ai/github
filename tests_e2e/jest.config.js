module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.e2e.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
}