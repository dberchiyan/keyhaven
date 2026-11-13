/** The database the tests own — never the development one (its data would be wiped). */
export const testDatabaseUrl = (): string => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set: point it at a database the tests may reset');
  }
  return url;
};
