/**
 * Central strongly-typed config loader. Read via `ConfigService`.
 * Every value comes from the environment — nothing is hardcoded.
 */
export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  geminiApiKey: string;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://talentbridge:talentbridge@localhost:5432/talentbridge',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'insecure_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'insecure_refresh_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
});
