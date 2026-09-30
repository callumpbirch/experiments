import { Pool, type PoolClient } from "pg";
import type { Conversation, Intake } from "./types";
import { HttpError } from "./http";
const singleton=globalThis as unknown as { garagePool?: Pool };
export const pool=singleton.garagePool||new Pool({connectionString:process.env.DATABASE_URL,max:5});
if(process.env.NODE_ENV!=="production")singleton.garagePool=pool;
export function mapRow(row: any): Conversation {
  return {id:row.id,revision:row.revision,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString(),data:row.data as Intake};
}
export async function findConversation(tokenHash: string) {
  const result=await pool.query("SELECT * FROM conversations WHERE token_hash=$1",[tokenHash]);
  if(!result.rows[0])throw new HttpError(404,"This conversation link wasn't found.");
  return mapRow(result.rows[0]);
}
export async function mutate(
  where: "id"|"token_hash", value: string,
  transform: (data: Intake, row: any, client: PoolClient)=>Promise<void>|void
) {
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query("SELECT * FROM conversations WHERE "+where+"=$1 FOR UPDATE",[value]);
    const row=result.rows[0];
    if(!row)throw new HttpError(404,"Conversation not found.");
    await transform(row.data,row,client);
    const updated=await client.query("UPDATE conversations SET data=$1,revision=revision+1,updated_at=now() WHERE id=$2 RETURNING *",[JSON.stringify(row.data),row.id]);
    await client.query("COMMIT");
    return mapRow(updated.rows[0]);
  }catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
}
