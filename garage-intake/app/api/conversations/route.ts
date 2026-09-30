import { randomUUID } from "node:crypto";
import { start } from "../../../lib/intelligence.mjs";
import { pool, mapRow } from "../../../lib/db";
import { newToken, hashToken, encryptToken, decryptToken } from "../../../lib/security.mjs";
import { startSchema } from "../../../lib/validation";
import { assertOrigin, body, json, failure } from "../../../lib/http";
export const runtime="nodejs";
export async function POST(request: Request) {
  try{
    assertOrigin(request);
    const input=startSchema.parse(await body(request));
    const token=newToken();
    const data=start(input.text,input.source);
    const key=hashToken("start:"+input.requestKey);
    await pool.query("INSERT INTO conversations(id,token_hash,token_ciphertext,request_key_hash,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(request_key_hash) DO NOTHING",
      [randomUUID(),hashToken(token),encryptToken(token),key,JSON.stringify(data)]);
    const result=await pool.query("SELECT * FROM conversations WHERE request_key_hash=$1",[key]);
    return json({conversation:mapRow(result.rows[0]),token:decryptToken(result.rows[0].token_ciphertext)},201);
  }catch(error){return failure(error);}
}
