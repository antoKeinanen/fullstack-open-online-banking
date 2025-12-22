import { RedisClient } from "bun";
import { z } from "zod";

import { env } from "../env";

const TransactionSchema = z.object({
  transactionId: z.string(),
  state: z.enum(["pending", "failed", "success"]),
  timestamp: z.string(),
});

type Transaction = z.infer<typeof TransactionSchema>;

console.log("Connecting to redis...");
const redisClient = new RedisClient(env.USER_BFF_REDIS_CONNECTION_STRING);
await redisClient.connect();
console.log("Connected to redis");

export async function cacheTransaction(
  userId: string,
  idempotencyKey: string,
  transactionId: string,
  state: "pending" | "failed" | "success",
): Promise<void> {
  const key = `transaction:${userId}:${idempotencyKey}`;
  await redisClient.set(
    key,
    JSON.stringify({
      transactionId,
      state,
      timestamp: Date.now().toString(),
    }),
  );

  await redisClient.expire(key, 24 * 60 * 60); // 24 hours to seconds
}

export async function getTransaction(
  userId: string,
  idempotencyKey: string,
): Promise<Transaction | null> {
  const key = `transaction:${userId}:${idempotencyKey}`;
  const transaction = await redisClient.get(key);
  return transaction ? TransactionSchema.parse(JSON.parse(transaction)) : null;
}

export async function updateTransactionState(
  userId: string,
  idempotencyKey: string,
  state: "pending" | "failed" | "success",
): Promise<void> {
  const key = `transaction:${userId}:${idempotencyKey}`;
  const transaction = await redisClient.get(key);
  if (transaction) {
    const data = TransactionSchema.parse(JSON.parse(transaction));
    await redisClient.set(key, JSON.stringify({ ...data, state }));
  }
}
