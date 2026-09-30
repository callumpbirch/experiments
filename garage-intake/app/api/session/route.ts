import { cookies } from "next/headers";
import { checkPassword, createSession } from "../../../lib/security.mjs";
import { assertOrigin, body, failure, json, HttpError } from "../../../lib/http";
import { z } from "zod";
const attempts=new Map<string,{count:number,until:number}>();
export async function POST(request: Request){
  try{
    assertOrigin(request);
    const input=z.object({password:z.string().min(1).max(200)}).parse(await body(request));
    const now=Date.now(),key="garage-login";
    const record=attempts.get(key);
    if(record&&record.until>now&&record.count>=10)throw new HttpError(429,"Too many attempts. Please try again in a few minutes.");
    if(!checkPassword(input.password)){
      const current=record&&record.until>now?record:{count:0,until:now+5*60*1000};
      current.count++;attempts.set(key,current);
      throw new HttpError(401,"That password wasn't recognised.");
    }
    attempts.delete(key);
    (await cookies()).set("garage_session",createSession(),{
      httpOnly:true,sameSite:"strict",secure:new URL(process.env.APP_URL||"http://localhost:3000").protocol==="https:",
      path:"/",maxAge:8*60*60
    });
    return json({ok:true});
  }catch(error){return failure(error);}
}
export async function DELETE(request: Request){
  try{assertOrigin(request);(await cookies()).delete("garage_session");return json({ok:true});}
  catch(error){return failure(error);}
}
