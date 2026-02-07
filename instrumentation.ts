import type { Instrumentation } from 'next';
import './sentry.server.config';

export const register: Instrumentation['register'] = () => {
  // Sentry init is handled by import side-effect above when DSN is set.
};
