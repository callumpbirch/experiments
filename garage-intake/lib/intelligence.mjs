
// Channel-independent mock provider. No model API is used.
// Replace this module's start/answer/revise contract with a model adapter later.
export const SCENARIO = "Loads of warning lights came on yesterday. My boot doesn’t stay up properly. There’s also a knocking noise I’ve been meaning to get checked. My MOT and service are due in November, but I want Skoda to do those because the car has a full Skoda service history.";

export const QUESTIONS = {
  lights: {
    key:"lights",
    text:"Are any lights red or flashing, or has braking or steering changed?",
    example:"Amber ABS, ESC and tyre pressure lights. No red or flashing lights. Braking and steering feel normal.",
    choices:[
      {label:"Amber only, drives normally",value:"Only amber lights. Braking and steering feel normal."},
      {label:"Red / flashing, or driving changed",value:"There are red or flashing lights, or braking or steering has changed."},
      {label:"Not sure",value:"I'm not sure which lights they are or whether driving has changed."}
    ]
  },
  knock: {
    key:"knock",text:"When do you hear the knocking?",
    example:"At the front, over bumps. It's been happening for about two months and is getting louder.",
    choices:[
      {label:"Over bumps",value:"I hear it over bumps."},
      {label:"When turning",value:"I hear it when turning."},
      {label:"When braking",value:"I hear it when braking."},
      {label:"Not sure",value:"I'm not sure when it happens."}
    ]
  },
  other: {
    key:"other",text:"When does it happen, and how does it affect the car?",
    example:"It happens most days. I'm not sure what causes it.",
    choices:[{label:"Not sure",value:"I'm not sure."}]
  },
  availability: {
    key:"availability",text:"When could you leave the car with us?",
    example:"Tuesday or Thursday morning, until 3 pm. I need it for school runs and would like help as soon as practical.",
    choices:[]
  },
  forgotten: {
    key:"forgotten",text:"Anything else you've been putting off, or anything we should work around?",
    example:"Nothing else. Please quote before doing repairs.",
    choices:[
      {label:"Nothing else",value:"Nothing else."},
      {label:"Please quote before repairs",value:"Nothing else. Please quote before doing repairs."}
    ]
  }
};

const normalise = text => text.toLowerCase().replace(/[’‘]/g,"'");
const sentenceList = text => text.match(/[^.!?]+[.!?]?/g) || [text];

export function triage(text) {
  let t=normalise(text);
  t=t.replace(/\b(?:no|not|aren't|isn't|without)\s+(?:any\s+)?(?:red|flashing)(?:\s+(?:or|and)\s+(?:red|flashing))?(?:\s+lights?)?/g,"");
  if(/\bred\b|\bflashing\b|(?:brak(?:e|es|ing)|steering).{0,30}(?:changed|worse|fail|heavy|different)|(?:lost|losing) power|overheat/.test(t))return "urgent";
  if(/amber|yellow/.test(t)&&/normal|unchanged|no change|fine/.test(t))return "reported-normal";
  return "unknown";
}

export function extractIssues(text) {
  const sentences=sentenceList(text);
  const definitions=[
    {id:"lights",test:/warning|dashboard|\babs\b|\besc\b|engine light/i,title:"Warning lights",type:"diagnosis"},
    {id:"knock",test:/knock|clunk|rattl/i,title:"Knocking noise",type:"diagnosis"},
    {id:"boot",test:/boot|tailgate/i,title:/stay|drop|fall|hold|support/i.test(text)?"Boot won't stay open":"Boot / tailgate problem",type:"inspect-and-quote"},
    {id:"aircon",test:/air conditioning|air con\b|a\/c/i,title:"Air conditioning concern",type:"diagnosis"}
  ];
  const issues=definitions.filter(d=>d.test.test(text)).map((d,index)=>({
    id:d.id,title:d.title,priority:index+1,
    symptoms:sentences.filter(s=>d.test.test(s)).map(s=>s.trim()),
    onset:d.id==="lights"&&/yesterday/i.test(text)?"Yesterday":"Not confirmed",
    workType:d.type,urgency:d.id==="lights"?"Prompt safety review":"Review at visit",
    uncertainties:[d.id==="boot"?"Required repair unconfirmed":"Cause unconfirmed"],
    decision:d.id==="boot"?"quote":"investigate"
  }));
  return issues.length?issues:[{
    id:"other",title:"Customer concern",priority:1,symptoms:[text],
    onset:"Not confirmed",workType:"diagnosis",urgency:"Not confirmed",
    uncertainties:["Symptoms and cause need clarification"],decision:"investigate"
  }];
}

export function extractExclusions(text) {
  const t=normalise(text);
  const reserved=/want\s+(?:skoda|škoda|(?:the\s+)?dealer)|(?:skoda|škoda|dealer).{0,40}(?:do those|do them|service history)|keep.{0,40}(?:skoda|škoda|dealer)/.test(t);
  return reserved?[...(/\bmot\b/.test(t)?["MOT"]:[]),...(/\bservice\b/.test(t)?["Service"]:[])]:[];
}
function message(data,role,text) {
  data.messages.push({id:globalThis.crypto.randomUUID(),role,text,at:new Date().toISOString()});
}
export function addMessage(data,role,text){message(data,role,text);}
export function nextQuestion(data) {
  if(data.issues.some(i=>i.id==="lights")&&!data.answers.lights)return QUESTIONS.lights;
  if(data.issues.some(i=>i.id==="knock")&&!data.answers.knock)return QUESTIONS.knock;
  if(data.issues.some(i=>i.id==="other"||i.id==="aircon")&&!data.answers.other)return QUESTIONS.other;
  if(!data.answers.availability)return QUESTIONS.availability;
  if(!data.answers.forgotten)return QUESTIONS.forgotten;
  return null;
}
function advance(data) {
  const q=nextQuestion(data);
  data.questionKey=q?.key||null;
  if(q){data.stage="questions";message(data,"assistant",q.text);}
  else {
    data.stage="contact";
    message(data,"assistant","Where should we send the garage's reply?");
  }
}
function addDetails(data,key,text) {
  const issue=data.issues.find(i=>i.id===key)||(key==="other"?data.issues.find(i=>i.id==="aircon"):null);
  if(!issue)return;
  issue.symptoms.push(text);
  if(key==="lights"){
    const reported=triage(text);
    if(data.safety!=="urgent")data.safety=reported;
    issue.urgency=data.safety==="urgent"?"Contact before driving":"Prompt safety review";
    issue.uncertainties=["Cause unconfirmed; lights and driving behaviour are customer reports"];
  }
  if(key==="knock"){
    const age=text.match(/(?:for|about)\s+(?:about\s+)?(\w+\s+(?:days?|weeks?|months?|years?))/i);
    if(age)issue.onset=age[1];
  }
}
export function start(text,source="website") {
  const excluded=extractExclusions(text);
  const data={
    version:1,source,stage:"questions",status:"draft",original:text,
    vehicle:{description:/skoda|škoda/i.test(text)?"Škoda · model not confirmed":"Vehicle not confirmed",registration:""},
    customer:{name:"",mobile:""},issues:extractIssues(text),
    preferences:{availability:"",urgency:"Not stated",constraints:"",
      approval:"Quote before repairs. No repair work authorised.",
      excludedWork:excluded,
      exclusionReason:excluded.length?"Customer wants Škoda to retain their full dealer service history.":""
    },
    answers:{},questionKey:null,safety:triage(text),photos:[],messages:[],proposal:null
  };
  message(data,"customer",text);
  const labels=data.issues.map(i=>i.title.toLowerCase());
  const listed=labels.length>1?labels.slice(0,-1).join(", ")+" and "+labels.at(-1):labels[0];
  message(data,"assistant","I've noted "+listed+"."+
    (excluded.length?" Your MOT and service are staying with Škoda.":""));
  // Skip details explicitly supplied in the opening; keep unresolved causes.
  if(data.issues.some(i=>i.id==="lights")&&/amber|yellow|red|flashing/i.test(text)&&/brak|steer/i.test(text))data.answers.lights=text;
  if(data.issues.some(i=>i.id==="knock")&&/over bumps|when turning|when braking/i.test(text))data.answers.knock=text;
  if(data.safety==="urgent")message(data,"assistant","Please contact the garage before driving. Stop as soon as safe if warning lights are red or flashing, or braking or steering has changed. Discuss recovery if needed.");
  advance(data);
  return data;
}
export function answer(data,text) {
  if(data.stage!=="questions"||!data.questionKey)throw new Error("No question is waiting for an answer.");
  const key=data.questionKey;
  data.answers[key]=text;
  message(data,"customer",text);
  addDetails(data,key,text);
  if(key==="lights"&&data.safety==="urgent")message(data,"assistant","Please contact the garage before driving. Stop as soon as safe if warning lights are red or flashing, or braking or steering has changed. Discuss recovery if needed.");
  if(key==="availability"){
    data.preferences.availability=text;
    if(/as soon|urgent|today|tomorrow|soon|this week/i.test(text))data.preferences.urgency=text;
    if(/school|work|budget|cost|leave|need|call|quote/i.test(text))data.preferences.constraints=text;
  }
  if(key==="forgotten"){
    data.preferences.constraints=[data.preferences.constraints,text].filter(Boolean).join("\n");
    if(!/^(nothing|no\b|none|not\b|that'?s everything)/i.test(text)){
      const found=extractIssues(text);
      const preferenceOnly=found.length===1&&found[0].id==="other"&&/quote|approval|before repairs|call me|budget|school runs/i.test(text);
      if(!preferenceOnly)addConcerns(data,text);
    }
  }
  advance(data);
  return data;
}
function addConcerns(data,text) {
  for(const extra of extractIssues(text)){
    const existing=data.issues.find(i=>i.id===extra.id);
    if(existing)existing.symptoms.push(text);
    else { extra.priority=data.issues.length+1;extra.id=extra.id==="other"?"additional-"+data.issues.length:extra.id;data.issues.push(extra); }
  }
}
export function revise(data,text) {
  if(data.stage!=="review"||data.status!=="draft")throw new Error("This draft is not ready for changes.");
  message(data,"customer",text);
  // Deliberately conservative: retain the customer's correction as evidence.
  // A model adapter will later interpret arbitrary changes across fields.
  addConcerns(data,text);
  message(data,"assistant","I've added that detail to the request for the garage to review.");
  return data;
}
export function setContact(data,customer,vehicle) {
  if(data.stage!=="contact")throw new Error("Contact details aren't needed yet.");
  data.customer=customer;
  data.vehicle={description:vehicle.description||data.vehicle.description,registration:vehicle.registration||""};
  data.stage="review";
  message(data,"assistant","Ready to send: "+data.issues.length+" separate concerns"+
    (data.preferences.excludedWork.length?", with "+data.preferences.excludedWork.join(" and ")+" excluded":"")+
    ". You can add anything we've missed below.");
  return data;
}
export function submit(data) {
  if(data.stage!=="review"||data.status!=="draft")throw new Error("This intake isn't ready to send.");
  data.stage="submitted";data.status="submitted";
  message(data,"assistant","Your request is with the garage. They'll review it and propose a next step. An appointment and any charges still need confirming.");
  return data;
}
export function draftProposal(data) {
  const verbs={
    investigate:i=>"Investigate "+i.title.toLowerCase()+" and confirm the cause.",
    quote:i=>"Inspect "+i.title.toLowerCase()+" and provide a repair quote.",
    later:i=>"Discuss a later visit for "+i.title.toLowerCase()+".",
    none:i=>"Take no action on "+i.title.toLowerCase()+" for this request."
  };
  const safety=data.issues.some(i=>i.id==="lights"||i.id==="knock")
    ?"Please contact us before bringing the car in so we can discuss driving safety. ":"";
  return "Hi "+(data.customer.name.split(" ")[0]||"there")+",\n\nHere's our proposed next step:\n\n"+
    [...data.issues].sort((a,b)=>a.priority-b.priority).map(i=>"• "+verbs[i.decision](i)).join("\n")+
    (data.preferences.excludedWork.length?"\n\n"+data.preferences.excludedWork.join(" and ")+" remain outside this request.":"")+
    "\n\n"+safety+"We'll confirm an appointment that works with your availability and agree any diagnostic charge before starting. We'll ask for approval before repairs.";
}
export function completeDemo() {
  const data=start(SCENARIO,"demo");
  let q;
  while((q=nextQuestion(data)))answer(data,q.example);
  setContact(data,{name:"Sam Taylor",mobile:"07700900123"},{description:"2016 Škoda Octavia estate",registration:"SK16 ODA"});
  submit(data);
  return data;
}
