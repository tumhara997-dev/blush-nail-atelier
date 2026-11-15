// Netlify scheduled function: every 15 minutes, expire unanswered quotes and requests whose time has passed.
export default async () => {
  const res = await fetch(`${process.env.URL}/api/cron/expire`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log("expire", res.status, await res.text());
};

export const config = { schedule: "*/15 * * * *" };
