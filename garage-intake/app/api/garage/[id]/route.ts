import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool,mapRow,mutate } from "../../../../lib/db";
import { staffSignedIn } from "../../../../lib/auth";
import { decryptToken } from "../../../../lib/security.mjs";
import { notificationAdapter } from "../../../../lib/notifications";
import { garageCommand } from "../../../../lib/validation";
import { addMessage } from "../../../../lib/intelligence.mjs";
import { json,failure,HttpError,assertOrigin,body } from "../../../../lib/http";
type Context={params:Promise<{id:string}>};
export async function GET(_request: Request,context:Context){
  try{
    if(!await staffSignedIn())throw new HttpError(401,"Sign in to the garage view.");
    const id=z.string().uuid().parse((await context.params).id);
    const result=await pool.query("SELECT * FROM conversations WHERE id=$1 AND data->>'status'<>'draft'",[id]);
    if(!result.rows[0])throw new HttpError(404,"Request not found.");
    return json(mapRow(result.rows[0]));
  }catch(error){return failure(error);}
}
export async function POST(request:Request,context:Context){
  try{
    assertOrigin(request);
    if(!await staffSignedIn())throw new HttpError(401,"Sign in to the garage view.");
    const id=z.string().uuid().parse((await context.params).id);
    const command=garageCommand.parse(await body(request));
    const result=await mutate("id",id,async(data,row,client)=>{
      if(data.status==="draft")throw new HttpError(409,"The customer hasn't sent this request.");
      if(row.revision!==command.revision)throw new HttpError(409,"This intake changed. Reload before saving to avoid losing another update.");
      if(command.action==="save"){
        const ids=data.issues.map(i=>i.id).sort().join(",");
        if(command.issues.map(i=>i.id).sort().join(",")!==ids)throw new HttpError(400,"Keep all reported concerns in this intake.");
        data.issues=[...command.issues].sort((a,b)=>a.priority-b.priority).map((i,index)=>({...i,priority:index+1}));
        data.preferences.availability=command.availability;
        data.preferences.constraints=command.constraints;
        data.preferences.excludedWork=command.excludedWork;
      }else{
        data.proposal={id:randomUUID(),text:command.text,sentAt:new Date().toISOString(),status:"pending",response:"",
          decisions:data.issues.map(i=>({issueId:i.id,decision:i.decision}))};
        data.status="proposed";
        addMessage(data,"garage",command.text);
        await notificationAdapter.queue(client,id,data.customer.mobile,decryptToken(row.token_ciphertext));
      }
    });
    return json(result);
  }catch(error){return failure(error);}
}
