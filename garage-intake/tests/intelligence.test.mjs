import test from "node:test";
import assert from "node:assert/strict";
import { SCENARIO,start,answer,nextQuestion,completeDemo,triage,revise,setContact,submit,draftProposal } from "../lib/intelligence.mjs";

test("Skoda scenario preserves three separate faults and excluded dealer work",()=>{
  const data=start(SCENARIO);
  assert.deepEqual(data.issues.map(i=>i.id),["lights","knock","boot"]);
  assert.deepEqual(data.preferences.excludedWork,["MOT","Service"]);
  assert.equal(data.issues[2].workType,"inspect-and-quote");
  assert.equal(data.issues[2].decision,"quote");
  assert.ok(data.issues.every(i=>i.uncertainties.length));
  assert.equal(data.vehicle.registration,"");
  assert.equal(data.customer.name,"");
});
test("only useful follow-ups are asked; boot symptom already suffices",()=>{
  const data=start(SCENARIO),asked=[];
  let q;
  while((q=nextQuestion(data))){asked.push(q.key);answer(data,q.example);}
  assert.deepEqual(asked,["lights","knock","availability","forgotten"]);
  assert.equal(data.stage,"contact");
  assert.equal(data.issues.length,3);
});
test("details supplied in the opening are not asked again",()=>{
  const data=start("Amber warning lights, braking and steering normal. A knock over bumps.");
  assert.equal(nextQuestion(data).key,"availability");
});
test("no red or flashing lights does not trigger urgent triage",()=>{
  assert.equal(triage("Amber ABS lights. No red or flashing lights. Brakes feel normal."),"reported-normal");
  assert.equal(triage("I'm not sure."),"unknown");
  assert.equal(triage("A red brake light is on."),"urgent");
  assert.equal(triage("My steering has changed and feels heavy."),"urgent");
});
test("an initial urgent report is not silently downgraded by a later answer",()=>{
  const data=start("Warning lights, including a red light, came on.");
  answer(data,"Amber now. Brakes and steering feel normal.");
  assert.equal(data.safety,"urgent");
});
test("uncertain answers are retained without inventing a diagnosis",()=>{
  const data=start(SCENARIO);
  answer(data,"I'm not sure.");
  assert.equal(data.safety,"unknown");
  assert.equal(nextQuestion(data).key,"knock");
  assert.ok(data.issues[0].symptoms.includes("I'm not sure."));
  assert.match(data.issues[0].uncertainties.join(" "),/unconfirmed/);
});
test("forgotten work is kept as its own concern",()=>{
  const data=start(SCENARIO);
  let q;
  while((q=nextQuestion(data))){
    answer(data,q.key==="forgotten"?"The air conditioning isn't cold.":q.example);
  }
  assert.ok(data.issues.some(i=>i.id==="aircon"));
});
test("a quote preference does not become a made-up fault",()=>{
  const data=start(SCENARIO);
  let q;
  while((q=nextQuestion(data)))answer(data,q.key==="forgotten"?"Please quote before repairs.":q.example);
  assert.equal(data.issues.length,3);
});
test("customer corrections remain visible as source evidence",()=>{
  const data=start(SCENARIO);
  while(nextQuestion(data))answer(data,nextQuestion(data).example);
  setContact(data,{name:"Sam",mobile:"07700900123"},{description:"",registration:""});
  revise(data,"The knocking is at the rear, not the front.");
  assert.ok(data.issues.find(i=>i.id==="knock").symptoms.includes("The knocking is at the rear, not the front."));
  submit(data);
  assert.equal(data.status,"submitted");
});
test("proposal honours staff actions and does not book or authorise repairs",()=>{
  const data=completeDemo();
  data.issues[1].decision="later";
  const text=draftProposal(data);
  assert.match(text,/later visit for knocking/i);
  assert.match(text,/MOT and Service remain outside/);
  assert.match(text,/confirm an appointment/);
  assert.match(text,/approval before repairs/);
});
