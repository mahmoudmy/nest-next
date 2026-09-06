import { PrismaClient,Prisma } from './generated/client';
export * from './generated/client';
export const database=new PrismaClient();
export type Transaction=Prisma.TransactionClient;
export async function atomic<T>(fn:(tx:Transaction)=>Promise<T>):Promise<T>{
  for(let attempt=0;;attempt++){
    try{return await database.$transaction(fn,{isolationLevel:'Serializable',timeout:15000});}
    catch(error){if(!(error instanceof Prisma.PrismaClientKnownRequestError)||error.code!=='P2034'||attempt>=3)throw error;await new Promise(resolve=>setTimeout(resolve,10*2**attempt));}
  }
}
