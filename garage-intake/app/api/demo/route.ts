import { randomUUID } from "node:crypto";
import { completeDemo } from "../../../lib/intelligence.mjs";
import { staffSignedIn } from "../../../lib/auth";
import { newToken,hashToken,encryptToken } from "../../../lib/security.mjs";
import { pool,mapRow } from "../../../lib/db";
import { json,failure,HttpError,assertOrigin } from "../../../lib/http";
export async function GET(){
  try{
    if(!await staffSignedIn())throw new HttpError(401,"Sign in to the garage view.");
    const result=await pool.query("SELECT id,recipient,body,return_path,created_at FROM notifications ORDER BY created_at DESC LIMIT 30");
    return json(result.rows);
  }catch(error){return failure(error);}
}
export async function POST(request:Request){
  try{
    assertOrigin(request);
    if(!await staffSignedIn())throw new HttpError(401,"Sign in to the garage view.");
    const token=newToken(),data=completeDemo();
    const result=await pool.query("INSERT INTO conversations(id,token_hash,token_ciphertext,data) VALUES($1,$2,$3,$4) RETURNING *",
      [randomUUID(),hashToken(token),encryptToken(token),JSON.stringify(data)]);
    return json({conversation:mapRow(result.rows[0]),returnPath:"/c/"+token},201);
  }catch(error){return failure(error);}
}
