// Scripts run outside Next.js, so load .env.local / .env ourselves.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* file not present */
  }
}
