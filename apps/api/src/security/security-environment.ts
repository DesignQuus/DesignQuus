const FORBIDDEN_PRODUCTION_SECRETS = new Set([
  '',
  'change-me',
  'development-only',
  'development-only-change-me',
  'secret',
]);

export type SecurityEnvironment = {
  nodeEnv: string;
  authMode: string;
  authSharedSecret: string;
};

export function readSecurityEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): SecurityEnvironment {
  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    authMode: env.AUTH_MODE ?? 'development',
    authSharedSecret: env.AUTH_SHARED_SECRET ?? '',
  };
}

export function validateSecurityEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): SecurityEnvironment {
  const config = readSecurityEnvironment(env);

  if (config.nodeEnv !== 'production') {
    if (!['development', 'trusted_gateway'].includes(config.authMode)) {
      throw new Error(`Unsupported AUTH_MODE: ${config.authMode}`);
    }
    return config;
  }

  if (config.authMode !== 'trusted_gateway') {
    throw new Error(
      'Production startup blocked: AUTH_MODE must be trusted_gateway',
    );
  }

  if (
    config.authSharedSecret.length < 32 ||
    FORBIDDEN_PRODUCTION_SECRETS.has(config.authSharedSecret.toLowerCase())
  ) {
    throw new Error(
      'Production startup blocked: AUTH_SHARED_SECRET must be at least 32 characters and must not be a default value',
    );
  }

  return config;
}
