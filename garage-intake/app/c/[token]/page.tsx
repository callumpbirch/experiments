import { notFound } from "next/navigation";
import { CustomerChat } from "../../../components/customer-chat";
import { findConversation } from "../../../lib/db";
import { hashToken } from "../../../lib/security.mjs";
import { tokenSchema } from "../../../lib/validation";
export const dynamic="force-dynamic";
export default async function ConversationPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  if(!tokenSchema.safeParse(token).success)notFound();
  let conversation;
  try{conversation=await findConversation(hashToken(token));}
  catch(error){if((error as {status?:number}).status===404)notFound();throw error;}
  return <CustomerChat token={token} initial={conversation}/>;
}
