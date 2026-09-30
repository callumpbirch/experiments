"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { draftProposal } from "../lib/intelligence.mjs";
import type { Conversation,Decision,Issue,Photo } from "../lib/types";
import { request } from "../lib/client";
import { StaffHeader } from "./staff-header";
import { Icon } from "./icons";
import { PhotoDialog } from "./photo-dialog";
const ACTIONS:[Decision,string][]=[["investigate","Investigate now"],["quote","Quote"],["later","Schedule later"],["none","No action"]];
const STATUS:Record<string,string>={submitted:"Ready to review",proposed:"Awaiting customer",accepted:"Customer accepted",change_requested:"Change requested"};

export function GarageBrief({initial}:{initial:Conversation}){
  const [record,setRecord]=useState(initial),[issues,setIssues]=useState(initial.data.issues);
  const [availability,setAvailability]=useState(initial.data.preferences.availability);
  const [constraints,setConstraints]=useState(initial.data.preferences.constraints);
  const [excluded,setExcluded]=useState(initial.data.preferences.excludedWork.join(", "));
  const [editing,setEditing]=useState<string|null>(null),[editVisit,setEditVisit]=useState(false);
  const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[feedback,setFeedback]=useState(""),[newReply,setNewReply]=useState(false);
  const [proposal,setProposal]=useState(initial.data.proposal?.text||draftProposal(initial.data));
  const [proposalTouched,setProposalTouched]=useState(false),[photo,setPhoto]=useState<Photo|null>(null);
  function acceptRecord(fresh:Conversation){
    setRecord(fresh);setIssues(fresh.data.issues);
    setAvailability(fresh.data.preferences.availability);setConstraints(fresh.data.preferences.constraints);
    setExcluded(fresh.data.preferences.excludedWork.join(", "));setNewReply(false);
  }
  useEffect(()=>{
    let active=true;
    const timer=setInterval(async()=>{
      try{
        const fresh=await request<Conversation>("/api/garage/"+record.id);
        if(!active||fresh.revision<=record.revision)return;
        if(dirty||proposalTouched||editing||editVisit)setNewReply(true);
        else acceptRecord(fresh);
      }catch{}
    },4000);
    return()=>{active=false;clearInterval(timer);};
  },[record.id,record.revision,dirty,proposalTouched,editing,editVisit]);
  async function run(action:()=>Promise<void>){
    if(busy)return;setBusy(true);setError("");setFeedback("");
    try{await action();}catch(e){setError(e instanceof Error?e.message:"Please try again.");}
    finally{setBusy(false);}
  }
  function draftWith(nextIssues=issues){
    return draftProposal({...record.data,issues:nextIssues,preferences:{
      ...record.data.preferences,availability,constraints,excludedWork:excluded.split(",").map(v=>v.trim()).filter(Boolean)
    }});
  }
  function decide(id:string,decision:Decision){
    const next=issues.map(i=>i.id===id?{...i,decision}:i);
    setIssues(next);setDirty(true);
    if(!proposalTouched)setProposal(draftWith(next));
  }
  async function saveBrief(){
    const next=await request<Conversation>("/api/garage/"+record.id,{
      action:"save",revision:record.revision,issues,
      availability,constraints,excludedWork:excluded.split(",").map(v=>v.trim()).filter(Boolean)
    });
    setRecord(next);setIssues(next.data.issues);setDirty(false);setNewReply(false);
    return next;
  }
  const data=record.data;
  return <><StaffHeader/><main className="staff-page brief-page">
    <Link href="/garage" className="back-link">← Requests</Link>
    <div className="page-heading brief-heading">
      <div><h1>{data.customer.name}</h1><p className="vehicle-line">{data.vehicle.registration||"Registration not supplied"} <span>·</span> {data.vehicle.description}</p>
        <a className="contact-link" href={"tel:"+data.customer.mobile.replace(/[^\d+]/g,"")}>{data.customer.mobile}</a>
      </div>
      <span className={"status-pill "+data.status}>{STATUS[data.status]}</span>
    </div>
    {data.safety==="urgent"?<div className="triage-alert"><strong>Contact the customer before driving.</strong><p>Possible urgent warning or change in driving reported. Confirm advice and whether recovery is needed.</p></div>:null}
    {excluded?<div className="excluded-line"><Icon name="check" width="16" height="16"/><span><strong>Outside this request:</strong> {excluded}{data.preferences.exclusionReason?" · "+data.preferences.exclusionReason:""}</span></div>:null}
    <section className="brief-list" aria-label="Prioritised concerns">
      {[...issues].sort((a,b)=>a.priority-b.priority).map(issue=><article className="brief-issue" key={issue.id}>
        <div className="issue-heading"><span className="priority-number">{issue.priority}</span><h2>{issue.title}</h2>
          <button className="text-button" disabled={busy} onClick={()=>setEditing(editing===issue.id?null:issue.id)}>{editing===issue.id?"Cancel":"Edit"}</button>
        </div>
        {editing===issue.id?<IssueEditor issue={issue} onSave={next=>{
          setIssues(current=>current.map(i=>i.id===next.id?next:i));setDirty(true);setEditing(null);
        }}/>:<>
          <p className="symptom-summary">{issue.id==="lights"&&issue.onset!=="Not confirmed"?"Started "+issue.onset.toLowerCase()+". ":""}{issue.symptoms.length>1?issue.symptoms.slice(1).join(" "):issue.symptoms.join(" ")}</p>
          <p className="issue-unknown">{issue.workType==="known-work"?"Known work requested":issue.workType==="inspect-and-quote"?"Inspect before quoting":"Diagnosis required"}{issue.uncertainties.length?" · "+issue.uncertainties.join("; "):""}</p>
          <div className="decision-buttons" role="group" aria-label={"Action for "+issue.title}>{ACTIONS.map(([value,label])=>
            <button key={value} className={issue.decision===value?"selected":""} aria-pressed={issue.decision===value} disabled={busy} onClick={()=>decide(issue.id,value)}>{label}</button>
          )}</div>
        </>}
      </article>)}
    </section>
    <section className="visit-summary" aria-label="Visit details">
      <div className="section-heading"><h2>Visit details</h2><button className="text-button" onClick={()=>setEditVisit(!editVisit)}>{editVisit?"Cancel":"Edit"}</button></div>
      {editVisit?<form className="visit-editor" onSubmit={e=>{e.preventDefault();setEditVisit(false);setDirty(true);if(!proposalTouched)setProposal(draftWith());}}>
        <label htmlFor="availability">Availability</label><textarea id="availability" value={availability} onChange={e=>setAvailability(e.target.value)} maxLength={4000}/>
        <label htmlFor="constraints">Constraints and preferences</label><textarea id="constraints" value={constraints} onChange={e=>setConstraints(e.target.value)} maxLength={4000}/>
        <label htmlFor="excluded">Excluded work, separated by commas</label><input id="excluded" value={excluded} onChange={e=>setExcluded(e.target.value)}/>
        <button className="button secondary">Apply edits</button>
      </form>:<dl>
        <div><dt>Availability</dt><dd>{availability||"Not supplied"}</dd></div>
        <div><dt>Preferences</dt><dd>{constraints||"None added"}</dd></div>
        <div><dt>Approval</dt><dd>{data.preferences.approval}</dd></div>
      </dl>}
    </section>
    {dirty?<div className="save-row"><span>Unsaved intake changes</span><button className="button secondary compact" disabled={busy} onClick={()=>run(async()=>{await saveBrief();setFeedback("Intake saved.");})}>Save intake</button></div>:null}
    {data.photos.length?<section className="brief-photos"><h2>Customer photos</h2><div>{data.photos.map(p=><button key={p.id} onClick={()=>setPhoto(p)}><img src={p.dataUrl} alt={p.name}/><span>{p.name}</span></button>)}</div></section>:null}
    {data.proposal?.response?<div className="customer-response"><div className="eyebrow">Customer reply</div><p>{data.proposal.response}</p></div>:null}
    <section className="next-step">
      <div className="section-heading"><h2>Propose the next step</h2><button className="text-button" disabled={busy} onClick={()=>{setProposal(draftWith());setProposalTouched(false);}}>Draft from decisions</button></div>
      <form onSubmit={e=>{e.preventDefault();void run(async()=>{
        if(editing||editVisit)throw new Error("Apply or cancel your edits before sending.");
        const saved=dirty?await saveBrief():record;
        const next=await request<Conversation>("/api/garage/"+record.id,{action:"propose",revision:saved.revision,text:proposal});
        setRecord(next);setProposalTouched(false);setFeedback("Proposal saved. The SMS preview has the customer's return link.");
      });}}>
        <label className="sr-only" htmlFor="proposal">Message to customer</label>
        <textarea id="proposal" value={proposal} onChange={e=>{setProposal(e.target.value);setProposalTouched(true);}} required maxLength={6000}/>
        <div className="proposal-footer"><span>Customer approval before repairs.</span><button className="button" disabled={busy}>Send next step <Icon name="arrow" width="16" height="16"/></button></div>
      </form>
      {error?<div className="inline-error" role="alert">{error}</div>:null}
      {feedback?<p className="save-feedback" role="status">{feedback} <Link href="/demo">Open SMS preview →</Link></p>:null}
      {newReply?<div className="inline-error" role="status">This request has changed. Your edits are still here. <button className="text-button" onClick={()=>run(async()=>{
        if((dirty||proposalTouched)&&!window.confirm("Reload the saved request and discard your unsaved edits?"))return;
        const fresh=await request<Conversation>("/api/garage/"+record.id);acceptRecord(fresh);
        setDirty(false);setProposalTouched(false);setEditing(null);setEditVisit(false);setProposal(fresh.data.proposal?.text||draftProposal(fresh.data));
      })}>Reload saved request</button></div>:null}
    </section>
    <details className="source-conversation"><summary>Original conversation</summary>
      {data.messages.map(m=><div key={m.id}><span>{m.role==="customer"?"Customer":m.role==="garage"?"Garage":"Intake assistant"}</span><p>{m.text}</p></div>)}
    </details>
    <PhotoDialog photo={photo} onClose={()=>setPhoto(null)}/>
  </main></>;
}
function IssueEditor({issue,onSave}:{issue:Issue;onSave:(issue:Issue)=>void}){
  return <form className="issue-editor" onSubmit={e=>{
    e.preventDefault();const values=new FormData(e.currentTarget);
    onSave({...issue,title:String(values.get("title")).trim(),symptoms:String(values.get("symptoms")).split("\n").map(v=>v.trim()).filter(Boolean),
      priority:Number(values.get("priority")),onset:String(values.get("onset")).trim(),
      workType:String(values.get("type")) as Issue["workType"],
      uncertainties:String(values.get("uncertainty")).split("\n").map(v=>v.trim()).filter(Boolean)});
  }}>
    <label htmlFor={"title-"+issue.id}>Concern</label><input id={"title-"+issue.id} name="title" defaultValue={issue.title} required maxLength={150}/>
    <label htmlFor={"symptoms-"+issue.id}>Reported symptoms</label><textarea id={"symptoms-"+issue.id} name="symptoms" defaultValue={issue.symptoms.join("\n")} required maxLength={8000}/>
    <div className="editor-pair"><div><label htmlFor={"priority-"+issue.id}>Priority</label><input id={"priority-"+issue.id} name="priority" type="number" defaultValue={issue.priority} min={1} max={20} required/></div>
      <div><label htmlFor={"onset-"+issue.id}>Reported since</label><input id={"onset-"+issue.id} name="onset" defaultValue={issue.onset} maxLength={200}/></div></div>
    <label htmlFor={"type-"+issue.id}>Work classification</label><select id={"type-"+issue.id} name="type" defaultValue={issue.workType}><option value="diagnosis">Diagnosis required</option><option value="inspect-and-quote">Inspect and quote</option><option value="known-work">Known work requested</option></select>
    <label htmlFor={"unknown-"+issue.id}>Still unknown</label><textarea id={"unknown-"+issue.id} name="uncertainty" defaultValue={issue.uncertainties.join("\n")} maxLength={2000}/>
    <button className="button secondary compact">Apply edits</button>
  </form>;
}
