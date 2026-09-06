import { Injectable } from '@nestjs/common';
import { database,type Prisma } from '@qms/database';
export type LoginUser=Prisma.UserGetPayload<{include:{memberships:true}}>;
export type StoredSession=Prisma.SessionGetPayload<{include:{user:true;membership:{include:{organization:true;site:true}}}}>;
@Injectable()
export class AuthRepository {
  userByEmail(email:string):Promise<LoginUser|null>{return database.user.findUnique({where:{email},include:{memberships:{where:{active:true,organization:{active:true,deletedAt:null},OR:[{siteId:null},{site:{active:true,deletedAt:null}}]},orderBy:{createdAt:'asc'}}}});}
  session(hash:string):Promise<StoredSession|null>{return database.session.findUnique({where:{tokenHash:hash},include:{user:true,membership:{include:{organization:true,site:true}}}});}
}
