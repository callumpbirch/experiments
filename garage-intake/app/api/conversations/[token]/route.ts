import { answer, revise, setContact, submit, addMessage } from "../../../../lib/intelligence.mjs";
import { findConversation, mutate } from "../../../../lib/db";
import { hashToken } from "../../../../lib/security.mjs";
import { tokenSchema, customerCommand } from "../../../../lib/validation";
import { assertOrigin, body, json, failure, HttpError } from "../../../../lib/http";
import { validatePhoto } from "../../../../lib/photo";
type Context={params:Promise<{token:string}>};
export const runtime="nodejs";
export async function GET(_request: Request, context: Context) {
  try{
    const token=tokenSchema.parse((await context.params).token);
    return json(await findConversation(hashToken(token)));
  }catch(error){return failure(error);}
}
export async function POST(request: Request, context: Context) {
  try{
    assertOrigin(request);
    const token=tokenSchema.parse((await context.params).token);
    const command=customerCommand.parse(await body(request));
    const result=await mutate("token_hash",hashToken(token),data=>{
      if(command.action==="message"){
        if(data.messages.some(m=>m.id===command.messageId))return;
        const before=data.messages.length;
        if(data.stage==="questions")answer(data,command.text);
        else if(data.stage==="review"&&data.status==="draft")revise(data,command.text);
        else throw new HttpError(409,"Use the proposal reply controls for this conversation.");
        const customerMessage=data.messages.slice(before).find(m=>m.role==="customer");
        if(customerMessage)customerMessage.id=command.messageId;
      }
      if(command.action==="contact"){
        if(data.stage==="review"&&JSON.stringify(data.customer)===JSON.stringify(command.customer))return;
        if(data.stage!=="contact")throw new HttpError(409,"Contact details aren't needed at this point.");
        setContact(data,command.customer,command.vehicle);
      }
      if(command.action==="submit"){
        if(data.status==="submitted")return;
        if(data.stage!=="review"||data.status!=="draft")throw new HttpError(409,"This request isn't ready to send.");
        submit(data);
      }
      if(command.action==="photo"){
        if(data.status!=="draft")throw new HttpError(409,"Photos can be attached before sending.");
        if(data.photos.some(p=>p.id===command.photoId))return;
        if(data.photos.length>=3)throw new HttpError(400,"You can attach up to 3 photos.");
        if(command.issueId&&!data.issues.some(i=>i.id===command.issueId))throw new HttpError(400,"That concern wasn't found.");
        validatePhoto(command.dataUrl);
        data.photos.push({id:command.photoId,name:command.name,dataUrl:command.dataUrl,issueId:command.issueId});
      }
      if(command.action==="removePhoto"){
        if(data.status!=="draft")throw new HttpError(409,"This request has already been sent.");
        data.photos=data.photos.filter(p=>p.id!==command.photoId);
      }
      if(command.action==="accept"||command.action==="change"){
        if(!data.proposal||data.proposal.id!==command.proposalId)throw new HttpError(409,"The garage has sent a newer proposal. Refresh to read it.");
        if(command.action==="accept"&&data.status==="accepted")return;
        if(data.status!=="proposed")throw new HttpError(409,"This proposal has already received a response.");
        const text=command.action==="accept"?"I've accepted the proposed next step.":command.text;
        data.proposal.response=text;
        data.proposal.status=command.action==="accept"?"accepted":"change_requested";
        data.status=data.proposal.status;
        addMessage(data,"customer",text);
        addMessage(data,"assistant",command.action==="accept"
          ?"Thank you. The garage still needs to confirm an appointment and any charges. No repairs are authorised."
          :"Your change request is with the garage.");
      }
    });
    return json(result);
  }catch(error){return failure(error);}
}
