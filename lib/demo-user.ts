// The single account everything belongs to until auth lands. Shared by the
// app (lib/current-user.ts) and the seed script, so both use the same row.
export const DEMO_USER = {
  email: "demo@example.com",
  name: "Buzz P.",
};
