import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  testTimeout: 30000,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": "ts-jest",
  },
};

export default config;
