import { pool,mapRow } from "../../../lib/db";
import { staffSignedIn } from "../../../lib/auth";
import { json,failure,HttpError } from "../../../lib/http";
export async function GET(){
  try{
    if(!await staffSignedIn())throw new HttpError(401,"Sign in to the garage view.");
    const result=await pool.query("SELECT * FROM conversations WHERE data->>'status'<>'draft' ORDER BY updated_at DESC LIMIT 30");
    return json(result.rows.map(mapRow));
  }catch(error){return failure(error);}
}
