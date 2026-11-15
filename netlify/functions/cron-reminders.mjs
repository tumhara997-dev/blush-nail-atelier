// Netlify scheduled function: hourly, send WhatsApp reminders ~24h before confirmed appointments.
export default async () => {
  const res = await fetch(`${process.env.URL}/api/cron/reminders`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log("reminders", res.status, await res.text());
};

export const config = { schedule: "@hourly" };
