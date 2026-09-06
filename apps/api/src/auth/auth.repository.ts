import { Injectable } from '@nestjs/common';
import { database } from '@qms/database';
@Injectable()
export class AuthRepository {
  userByEmail(email:string) { return database.user.findUnique({where:{email},include:{memberships:{where:{active:true,organization:{active:true,deletedAt:null},OR:[{siteId:null},{site:{active:true,deletedAt:null}}]},orderBy:{createdAt:'asc'}}}}); }
  session(hash:string) { return database.session.findUnique({where:{tokenHash:hash},include:{user:true,membership:{include:{organization:true,site:true}}}}); }
}
