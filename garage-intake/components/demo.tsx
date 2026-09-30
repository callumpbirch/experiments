"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request } from "../lib/client";
import type { Conversation,Notification } from "../lib/types";
import { StaffHeader } from "./staff-header";
import { Icon } from "./icons";
export function Demo(){
  const router=useRouter();
  const [messages,setMessages]=useState<Notification[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function refresh(){try{setMessages(await request<Notification[]>("/api/demo"));}catch(e){setError(e instanceof Error?e.message:"Please try again.");}}
  useEffect(()=>{void refresh();const timer=setInterval(refresh,4000);return()=>clearInterval(timer);},[]);
  return <><StaffHeader/><main className="staff-page">
    <div className="eyebrow">Demo controls</div><h1>A conversation that survives the handover.</h1>
    <p className="demo-intro">Start the customer chat, send the intake, then review it as the garage. Send a proposal and use its SMS preview below to return to the same conversation.</p>
    <div className="demo-actions">
      <Link className="button" href="/start?from=demo&example=skoda" target="_blank">Start the Škoda conversation <Icon name="arrow" width="16" height="16"/></Link>
      <button className="button secondary" disabled={busy} onClick={async()=>{
        setBusy(true);setError("");
        try{const result=await request<{conversation:Conversation}>("/api/demo",{});router.push("/garage/"+result.conversation.id);}
        catch(e){setError(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}
      }}>Load a completed intake</button>
    </div>
    <h2>One conversation, different entry points</h2>
    <p className="demo-intro">These links open the same web intake. The source is recorded; no native messaging integration is running.</p>
    <div className="demo-links">{[["website","Website"],["google","Google profile"],["whatsapp","WhatsApp link"],["sms","SMS link"],["qr","QR destination"]].map(([source,label])=>
      <Link key={source} href={"/start?from="+source} target="_blank">{label}</Link>
    )}</div>
    {error?<p className="inline-error" role="alert">{error}</p>:null}
    <section className="sms-section" style={{marginTop:35}}>
      <div className="section-heading"><h2>SMS preview</h2><button className="text-button" onClick={refresh}>Refresh <Icon name="refresh" width="14" height="14"/></button></div>
      <p>Simulated notifications only. No SMS is sent. Each link opens the server-stored customer conversation, including in a new browser.</p>
      {!messages.length?<div className="empty-state"><p>Send a proposed next step from the garage view to create a notification.</p></div>:
      <div className="sms-list">{messages.map(message=><article className="sms-card" key={message.id}>
        <div className="sms-card-top"><span>To {message.recipient}</span><time dateTime={message.created_at}>{new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(message.created_at))}</time></div>
        <p>{message.body}</p>
        <Link className="button secondary compact" href={message.return_path} target="_blank">Open customer conversation <Icon name="arrow" width="14" height="14"/></Link>
      </article>)}</div>}
    </section>
  </main></>;
}
