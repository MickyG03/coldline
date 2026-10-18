import { Mutation } from "./mutation.ts";
import { Query } from "./query.ts";
import { Subscription } from "./subscription.ts";
import { typeResolvers } from "./types.ts";

export const resolvers = { ...typeResolvers, Query, Mutation, Subscription };
