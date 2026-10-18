import { createServer, type Server } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";
import { maskError, useRequestLogger } from "../middleware/index.ts";
import { resolvers } from "../resolvers/index.ts";
import { typeDefs } from "../schemas/index.ts";
import { env } from "../utils/env.ts";

// GraphQL API (graphql-yoga). Subscriptions are served over SSE on the same /graphql endpoint.

export const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/graphql",
  maskedErrors: { maskError },
  plugins: [useRequestLogger()],
  logging: false, // middleware logs operations and unexpected errors
});

export function startGraphQL(): Promise<Server | undefined> {
  const port = Number(env("COLDLINE_API_PORT") ?? 4000);
  const server = createServer(yoga);
  return new Promise((resolve) => {
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code !== "EADDRINUSE") throw err;
      console.warn(`[graphql] port ${port} in use; API not started in this process (is the backend already running?)`);
      resolve(undefined);
    });
    server.listen(port, () => {
      console.log(`[graphql] http://localhost:${port}/graphql`);
      resolve(server);
    });
  });
}
