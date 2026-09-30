import { CustomerChat } from "../../components/customer-chat";
export const dynamic="force-dynamic";
export default async function Start({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const query=await searchParams;
  const source=["website","google","whatsapp","sms","qr","demo"].includes(query.from||"")?query.from!:"website";
  return <CustomerChat source={source} demo={query.example==="skoda"}/>;
}
