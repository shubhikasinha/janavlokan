import { vi } from 'vitest';

// Mock environment variables for testing
process.env.GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'test-project';
process.env.GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || 'test@test.iam.gserviceaccount.com';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
