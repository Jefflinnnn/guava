import "server-only";

import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Shared setup for Neon's driver. Import it before connecting.

// Neon's driver talks to Postgres over WebSockets.
neonConfig.webSocketConstructor = ws;

// Tests run plain Postgres behind Neon's local proxy (compose.test.yaml).
// With NEON_LOCAL_PROXY set, every Neon connection goes there instead, over
// HTTP and plain WebSockets, whatever host its connection string names.
const localProxy = process.env.NEON_LOCAL_PROXY;
if (localProxy) {
  neonConfig.fetchEndpoint = `http://${localProxy}/sql`;
  neonConfig.wsProxy = `${localProxy}/v2`;
  neonConfig.useSecureWebSocket = false;
}
