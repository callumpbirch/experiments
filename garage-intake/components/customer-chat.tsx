"use client";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SCENARIO,QUESTIONS } from "../lib/intelligence.mjs";
import type { Conversation,Photo,Question } from "../lib/types";
import { request } from "../lib/client";
import { Brand,Icon } from "./icons";
import { PhotoDialog } from "./photo-dialog";

type Props={token?:string;initial?:Conversation;source?:string;demo?:boolean};
type PendingPhoto={id:string;name:string;dataUrl:string};
export function CustomerChat({token:initialToken,initial,source="website",demo=false}:Props){
  const router=useRouter();
  const [conversation,setConversation]=useState<Conversation|null>(initial||null);
  const [token,setToken]=useState(initialToken||"");
  const [text,setText]=useState(demo?SCENARIO:"");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [pendingPhotos,setPendingPhotos]=useState<PendingPhoto[]>([]);
  const [resume,setResume]=useState("");
  const [change,setChange]=useState(false);
  const [changeText,setChangeText]=useState("");
  const [lightbox,setLightbox]=useState<Photo|PendingPhoto|null>(null);
  const bottom=useRef<HTMLDivElement>(null),textarea=useRef<HTMLTextAreaElement>(null);
  const messageAttempt=useRef<{text:string;id:string}|null>(null);
  const data=conversation?.data;
  const q=data?.questionKey?QUESTIONS[data.questionKey as keyof typeof QUESTIONS] as Question:undefined;

  useEffect(()=>{
    try{
      if(token)localStorage.setItem("north-street-return",token);
      else setResume(localStorage.getItem("north-street-return")||"");
    }catch{}
  },[token]);
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth",block:"end"});},
    [data?.messages.length,data?.stage,data?.photos.length,pendingPhotos.length]);
  useEffect(()=>{
    const field=textarea.current;
    if(field){field.style.height="auto";field.style.height=Math.min(field.scrollHeight,180)+"px";}
  },[text,data?.stage]);
  useEffect(()=>{
    if(!token||!data||data.status==="draft")return;
    let active=true;
    const timer=setInterval(async()=>{
      try{
        const fresh=await request<Conversation>("/api/conversations/"+token);
        if(active)setConversation(current=>!current||fresh.revision>current.revision?fresh:current);
      }catch{/* A transient refresh failure never discards the saved conversation. */}
    },4000);
    return ()=>{active=false;clearInterval(timer);};
  },[token,data?.status]);

  async function command(payload:unknown){
    const next=await request<Conversation>("/api/conversations/"+token,payload);
    setConversation(next);return next;
  }
  async function run(action:()=>Promise<void>){
    if(busy)return;setBusy(true);setError("");
    try{await action();}catch(e){setError(e instanceof Error?e.message:"Please try again.");}
    finally{setBusy(false);}
  }
  async function send(value:string){
    const message=value.trim();if(!message)return;
    await run(async()=>{
      if(!conversation){
        let attempt:{text:string;source:string;requestKey:string}|null=null;
        try{attempt=JSON.parse(sessionStorage.getItem("north-street-start")||"null");}catch{}
        if(!attempt||attempt.text!==message||attempt.source!==source)
          attempt={text:message,source,requestKey:crypto.randomUUID()};
        try{sessionStorage.setItem("north-street-start",JSON.stringify(attempt));}catch{}
        const result=await request<{conversation:Conversation;token:string}>("/api/conversations",attempt);
        let current=result.conversation;
        setToken(result.token);setConversation(current);
        let uploadError="";
        for(const photo of pendingPhotos){
          try{
            current=await request<Conversation>("/api/conversations/"+result.token,{
              action:"photo",photoId:photo.id,name:photo.name,dataUrl:photo.dataUrl,issueId:null
            });
          }catch(e){uploadError=e instanceof Error?e.message:"A photo couldn't be attached.";}
        }
        setConversation(current);setPendingPhotos([]);setText("");
        try{sessionStorage.removeItem("north-street-start");localStorage.setItem("north-street-return",result.token);}catch{}
        router.replace("/c/"+result.token);
        if(uploadError)setError(uploadError);
      }else{
        if(!messageAttempt.current||messageAttempt.current.text!==message)
          messageAttempt.current={text:message,id:crypto.randomUUID()};
        await command({action:"message",text:message,messageId:messageAttempt.current.id});
        messageAttempt.current=null;setText("");
      }
    });
  }
  async function attach(files:FileList|null){
    if(!files)return;
    await run(async()=>{
      const currentCount=(data?.photos.length||0)+pendingPhotos.length;
      if(currentCount+files.length>3)throw new Error("You can attach up to 3 photos.");
      const prepared:PendingPhoto[]=[];
      for(const file of Array.from(files)){
        if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Choose a JPG, PNG or WebP photo.");
        if(file.size>2*1024*1024)throw new Error("Please choose a photo under 2 MB.");
        const dataUrl=await new Promise<string>((resolve,reject)=>{
          const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);
        });
        prepared.push({id:crypto.randomUUID(),name:file.name,dataUrl});
      }
      if(!conversation)setPendingPhotos(p=>[...p,...prepared]);
      else{
        let latest=conversation;
        for(const p of prepared)latest=await command({action:"photo",photoId:p.id,name:p.name,dataUrl:p.dataUrl,issueId:null});
        setConversation(latest);
      }
    });
  }
  const editable=!data||data.status==="draft";
  const showComposer=!data||data.stage==="questions"||data.stage==="review";
  const photos:(Photo|PendingPhoto)[]=data?.photos||pendingPhotos;

  return <div className="chat-shell">
    <header className="chat-header">
      <Brand/>
      <div><h1>North Street Garage <span className="verified" aria-label="Garage"><Icon name="check" width="12" height="12"/></span></h1>
        <p>Before your visit <span>·</span> Intake assistant</p>
      </div>
    </header>
    <main className="thread" aria-label="Conversation with the garage">
      <div className="thread-date">Your car, in your own words</div>
      {!data?<div className="chat-row incoming"><Brand small/><div className="bubble">
        <p>Hi. What’s going on with your car?</p>
        <p className="bubble-secondary">Big problems, small niggles—tell us everything.</p>
      </div></div>:data.messages.map((message,index)=>{
        const incoming=message.role!=="customer";
        const lastRole=index?data.messages[index-1].role:"";
        return <div className={"chat-row "+(incoming?"incoming":"outgoing")} key={message.id}>
          {incoming?<Brand small/>:null}
          <div className={"bubble "+(message.role==="garage"?"staff-bubble":"")}>
            {message.role==="garage"&&lastRole!=="garage"?<div className="staff-label">A reply from the garage</div>:null}
            <p>{message.text}</p>
          </div>
        </div>;
      })}
      {!data&&resume?<Link className="resume-link" href={"/c/"+resume}>Continue your saved conversation <Icon name="arrow" width="14" height="14"/></Link>:null}
      {q?<div className="quick-replies" aria-label="Suggested answers">{q.choices.map(choice=>
        <button key={choice.label} disabled={busy} onClick={()=>send(choice.value)}>{choice.label}</button>
      )}</div>:null}
      {data?.stage==="contact"?<ContactCard disabled={busy} onSubmit={values=>run(async()=>{await command({action:"contact",...values});})}/>:null}
      {photos.length?<div className="chat-photos" aria-label="Attached photos">{photos.map(photo=>
        <div className="photo-thumb" key={photo.id}>
          <button className="photo-open" onClick={()=>setLightbox(photo)} aria-label={"Open "+photo.name}><img src={photo.dataUrl} alt={photo.name}/></button>
          {editable?<button className="photo-remove" disabled={busy} aria-label={"Remove "+photo.name} onClick={()=>{
            if(!conversation)setPendingPhotos(p=>p.filter(x=>x.id!==photo.id));
            else void run(async()=>{await command({action:"removePhoto",photoId:photo.id});});
          }}><Icon name="close" width="12" height="12"/></button>:null}
        </div>
      )}</div>:null}
      {data?.status==="submitted"?<div className="thread-receipt"><Icon name="check" width="16" height="16"/>Request received. The garage will review it.</div>:null}
      {data?.status==="proposed"&&data.proposal?<div className="proposal-response">
        <p>Does this approach work for you?</p>
        <button className="button" disabled={busy} onClick={()=>run(async()=>{await command({action:"accept",proposalId:data.proposal!.id});})}>Accept next step <Icon name="check" width="16" height="16"/></button>
        <button className="text-button" onClick={()=>setChange(!change)}>Ask for a change</button>
        <span className="fine-print">An appointment and any charges still need confirming.</span>
        {change?<form onSubmit={e=>{e.preventDefault();void run(async()=>{await command({action:"change",proposalId:data.proposal!.id,text:changeText});setChange(false);});}}>
          <label htmlFor="change-message">What would work better?</label><textarea id="change-message" required value={changeText} onChange={e=>setChangeText(e.target.value)} maxLength={2000}/>
          <button className="button secondary" disabled={busy}>Send change request</button>
        </form>:null}
      </div>:null}
      {busy?<div className="saving-indicator" role="status">Saving…</div>:null}
      {error?<div className="inline-error" role="alert">{error}</div>:null}
      <div ref={bottom}/>
    </main>
    {showComposer?<div className="composer-wrap">
      {data?.stage==="review"?<div className="send-request-bar">
        <span>Ready for garage review</span>
        <button className="button compact" disabled={busy} onClick={()=>run(async()=>{
          if(text.trim())throw new Error("Send your extra detail first, or clear it before sending the request.");
          await command({action:"submit"});
        })}>Send request <Icon name="arrow" width="16" height="16"/></button>
      </div>:null}
      <form className="message-composer" onSubmit={e=>{e.preventDefault();void send(text);}}>
        <textarea ref={textarea} aria-label="Your message" placeholder={data?.stage==="review"?"Add something we've missed…":data?"Type your reply…":"Describe what's going on…"} value={text} onChange={e=>setText(e.target.value)} maxLength={4000} rows={1}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send(text);}}}/>
        <div className="composer-tools">
          <label className={"attach-button "+(busy?"disabled":"")} title="Attach a photo">
            <Icon name="attach"/><span className="sr-only">Attach a photo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e=>{void attach(e.target.files);e.target.value="";}}/>
          </label>
          <button className="send-button" aria-label="Send message" disabled={busy||!text.trim()}><Icon name="send"/></button>
        </div>
      </form>
      <p className="composer-caption">No mechanical vocabulary needed. <span>Photos are optional.</span></p>
    </div>:<div className="conversation-footer">Your conversation is saved. Keep this private link to return.</div>}
    <PhotoDialog photo={lightbox} onClose={()=>setLightbox(null)}/>
  </div>;
}
function ContactCard({disabled,onSubmit}:{disabled:boolean;onSubmit:(values:{customer:{name:string;mobile:string};vehicle:{description:string;registration:string}})=>Promise<void>}){
  return <form className="contact-card" onSubmit={e=>{
    e.preventDefault();const values=new FormData(e.currentTarget);
    void onSubmit({customer:{name:String(values.get("name")).trim(),mobile:String(values.get("mobile")).trim()},
      vehicle:{registration:String(values.get("registration")).trim().toUpperCase(),description:String(values.get("description")||"").trim()}});
  }}>
    <label htmlFor="contact-name">Your name</label><input id="contact-name" name="name" autoComplete="name" required maxLength={100}/>
    <label htmlFor="contact-mobile">Mobile number</label><input id="contact-mobile" name="mobile" type="tel" autoComplete="tel" required maxLength={25}/>
    <label htmlFor="contact-registration">Registration <span>optional</span></label><input id="contact-registration" name="registration" className="registration-input" maxLength={20}/>
    <details><summary>Add the model or year, if you know it</summary><label className="sr-only" htmlFor="contact-description">Vehicle description</label><input id="contact-description" name="description" placeholder="For example, 2016 Škoda Octavia" maxLength={150}/></details>
    <p>Used for this request and the garage’s reply.</p>
    <button className="button" disabled={disabled}>Continue <Icon name="arrow" width="16" height="16"/></button>
  </form>;
}
