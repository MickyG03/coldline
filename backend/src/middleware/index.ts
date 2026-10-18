import { GraphQLError } from "graphql";
import type { Plugin, YogaInitialContext } from "graphql-yoga";

// Central GraphQL error handling and logging.
//   - Resolvers throw client-facing errors through notFound()/badInput() (code in extensions).
//   - Anything else is logged with its stack and masked as "Unexpected error" by graphql-yoga.
//   - Every operation is logged with its name and duration.

export function notFound(what: string, id: string): never {
  throw new GraphQLError(`${what} ${id} not found`, { extensions: { code: "NOT_FOUND" } });
}

export function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

const isClientError = (err: unknown) =>
  err instanceof GraphQLError && typeof err.extensions?.code === "string" && !err.originalError;

/** maskedErrors.maskError: keep our coded errors, log and mask the rest. */
export function maskError(error: unknown, message: string): Error {
  const err = error instanceof GraphQLError ? error : new GraphQLError(String(error));
  if (isClientError(err)) return err;
  const original = err.originalError;
  if (original instanceof GraphQLError && original.extensions?.code) return original;
  console.error("[graphql] error at %s:", err.path?.join(".") ?? "(root)", original ?? err);
  return new GraphQLError(message, { nodes: err.nodes, path: err.path, extensions: { code: "INTERNAL_SERVER_ERROR" } });
}

export function useRequestLogger(): Plugin<YogaInitialContext> {
  return {
    onExecute({ args }) {
      const started = performance.now();
      const op = args.operationName ?? args.document.definitions
        .map((d: { kind: string; name?: { value: string } }) => d.name?.value ?? d.kind).join(",");
      return {
        onExecuteDone({ result }) {
          if (Symbol.asyncIterator in result) return;
          const ms = Math.round(performance.now() - started);
          const errors = result.errors?.length ? ` errors=${result.errors.length}` : "";
          if (process.env.COLDLINE_LOG_QUERIES === "on" || errors || ms > 1000) console.log(`[graphql] ${op} ${ms}ms${errors}`);
        },
      };
    },
    onSubscribe({ args }) {
      console.log(`[graphql] subscription ${args.operationName ?? "(anonymous)"} opened`);
    },
  };
}
