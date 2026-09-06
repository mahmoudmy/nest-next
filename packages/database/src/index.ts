import { PrismaClient, Prisma } from '@prisma/client';
export * from '@prisma/client';
export const database = new PrismaClient();
export type Transaction = Prisma.TransactionClient;
/** Retry the entire atomic command, never just its last write. */
export async function atomic<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await database.$transaction(fn, { isolationLevel: 'Serializable', timeout: 15000 }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 10 * 2 ** attempt));
    }
  }
}
