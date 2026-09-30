import { test,expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
const scenario="Loads of warning lights came on yesterday. My boot doesn’t stay up properly. There’s also a knocking noise I’ve been meaning to get checked. My MOT and service are due in November, but I want Skoda to do those because the car has a full Skoda service history.";

test("mobile customer → garage → SMS return in a fresh browser → acceptance",async({browser},info)=>{
  const customer=await browser.newContext({viewport:{width:390,height:844}});
  const page=await customer.newPage();
  await page.goto("/start?from=whatsapp");
  await expect(page.getByRole("heading",{name:/North Street Garage/})).toBeVisible();
  await expect(page.getByRole("link",{name:"Requests",exact:true})).toHaveCount(0);
  await page.getByLabel("Attach a photo").setInputFiles({
    name:"dashboard.png",mimeType:"image/png",
    buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2L8AAAAASUVORK5CYII=","base64")
  });
  await page.getByRole("textbox",{name:"Your message"}).fill(scenario);
  await page.getByRole("button",{name:"Send message",exact:true}).click();
  await expect(page).toHaveURL(/\/c\/[A-Za-z0-9_-]{43}$/);
  const returnPath=new URL(page.url()).pathname;
  await expect(page.getByText("Are any lights red or flashing, or has braking or steering changed?",{exact:true})).toBeVisible();
  await info.attach("mobile chat",{body:await page.screenshot(),contentType:"image/png"});
  async function reply(text:string,next:string){
    await page.getByRole("textbox",{name:"Your message"}).fill(text);
    await page.getByRole("button",{name:"Send message",exact:true}).click();
    await expect(page.getByText(next,{exact:true})).toBeVisible();
  }
  await reply("Amber ABS, ESC and tyre pressure lights. No red or flashing lights. Braking and steering feel normal.","When do you hear the knocking?");
  await reply("At the front, over bumps. For about two months and getting louder.","When could you leave the car with us?");
  await reply("Tuesday or Thursday morning, until 3 pm. I need the car for school runs.","Anything else you've been putting off, or anything we should work around?");
  await page.getByRole("button",{name:"Please quote before repairs",exact:true}).click();
  await expect(page.getByLabel("Your name")).toBeVisible();
  await page.getByLabel("Your name").fill("Sam Taylor");
  await page.getByLabel("Mobile number").fill("07700900123");
  await page.getByLabel("Registration").fill("SK16 ODA");
  await page.getByText("Add the model or year, if you know it",{exact:true}).click();
  await page.getByPlaceholder("For example, 2016 Škoda Octavia").fill("2016 Škoda Octavia estate");
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  await page.getByRole("button",{name:"Send request",exact:true}).click();
  await expect(page.getByText("Request received. The garage will review it.",{exact:true})).toBeVisible();
  await customer.close();

  const staff=await browser.newContext({viewport:{width:1280,height:900}});
  const garage=await staff.newPage();
  await garage.goto("/garage");
  await expect(garage).toHaveURL(/\/login/);
  await garage.getByLabel("Garage password").fill(process.env.GARAGE_PASSWORD!);
  await garage.getByRole("button",{name:"Sign in",exact:true}).click();
  await expect(garage).toHaveURL(/\/garage$/);
  await garage.getByRole("link",{name:/Sam Taylor/}).first().click();
  const garagePath=new URL(garage.url()).pathname;
  await expect(garage.getByRole("heading",{name:"Warning lights",exact:true})).toBeVisible();
  await expect(garage.getByRole("heading",{name:"Knocking noise",exact:true})).toBeVisible();
  await expect(garage.getByRole("heading",{name:"Boot won't stay open",exact:true})).toBeVisible();
  await expect(garage.locator(".excluded-line")).toContainText("MOT, Service");
  await expect(garage.locator(".brief-photos img")).toHaveCount(1);
  const knock=garage.locator("article.brief-issue").filter({has:garage.getByRole("heading",{name:"Knocking noise",exact:true})});
  await knock.getByRole("button",{name:"Schedule later",exact:true}).click();
  await knock.getByRole("button",{name:"Edit",exact:true}).click();
  await garage.getByLabel("Reported symptoms").fill("Front knock over bumps, reported for two months and getting louder.");
  await garage.getByRole("button",{name:"Apply edits",exact:true}).click();
  await garage.getByRole("button",{name:"Draft from decisions",exact:true}).click();
  await expect(garage.getByLabel("Message to customer")).toHaveValue(/later visit for knocking/);
  await info.attach("garage brief",{body:await garage.screenshot({fullPage:true}),contentType:"image/png"});
  await garage.getByRole("button",{name:"Send next step",exact:true}).click();
  await expect(garage.getByRole("status")).toContainText("Proposal saved.");
  await garage.getByRole("link",{name:/Open SMS preview/}).click();
  const returnLink=garage.getByRole("link",{name:"Open customer conversation",exact:true}).first();
  await expect(returnLink).toHaveAttribute("href",returnPath);
  await info.attach("SMS return link",{body:await garage.screenshot({fullPage:true}),contentType:"image/png"});

  const returned=await browser.newContext({viewport:{width:390,height:844}});
  const resumed=await returned.newPage();
  await resumed.goto(returnPath);
  await expect(resumed.getByText("A reply from the garage",{exact:true})).toBeVisible();
  await expect(resumed.getByText(/Here's our proposed next step:/)).toContainText("later visit for knocking");
  await resumed.getByRole("button",{name:"Accept next step",exact:true}).click();
  await expect(resumed.getByText(/Thank you. The garage still needs to confirm/)).toBeVisible();
  await info.attach("returned customer",{body:await resumed.screenshot(),contentType:"image/png"});
  await garage.goto(garagePath);
  await expect(garage.locator(".status-pill")).toHaveText("Customer accepted");
  await expect(garage.locator(".customer-response")).toContainText("I've accepted the proposed next step.");
  await returned.close();await staff.close();
});

test("customer capabilities cannot read garage controls or invalid conversations",async({request})=>{
  expect((await request.get("/api/garage")).status()).toBe(401);
  expect((await request.get("/api/demo")).status()).toBe(401);
  expect((await request.get("/api/conversations/"+"a".repeat(43))).status()).toBe(404);
  const start=await request.post("/api/conversations",{data:{text:scenario,source:"sms",requestKey:randomUUID()}});
  const {token,conversation}=await start.json();
  expect((await request.get("/api/garage/"+conversation.id)).status()).toBe(401);
  expect((await request.post("/api/conversations/"+token,{data:{action:"propose",text:"Do repairs"}})).status()).toBe(400);
  expect((await request.post("/api/conversations/"+token,{data:{action:"submit"}})).status()).toBe(409);
  expect((await request.post("/api/conversations/"+token,{headers:{Origin:"https://another-site.example"},data:{action:"submit"}})).status()).toBe(403);
});

test("start and message retries do not create duplicate conversations or skip questions",async({request})=>{
  const input={text:scenario,source:"website",requestKey:randomUUID()};
  const first=await (await request.post("/api/conversations",{data:input})).json();
  const repeat=await (await request.post("/api/conversations",{data:input})).json();
  expect(repeat.token).toBe(first.token);
  expect(repeat.conversation.id).toBe(first.conversation.id);
  const answer={action:"message",messageId:randomUUID(),text:"Amber lights. No red or flashing lights. Brakes feel normal."};
  const once=await (await request.post("/api/conversations/"+first.token,{data:answer})).json();
  const twice=await (await request.post("/api/conversations/"+first.token,{data:answer})).json();
  expect(twice.data.messages.length).toBe(once.data.messages.length);
  expect(twice.data.questionKey).toBe("knock");
});

test("stale staff edits and old customer proposals cannot overwrite newer work",async({request})=>{
  expect((await request.post("/api/session",{data:{password:process.env.GARAGE_PASSWORD}})).status()).toBe(200);
  const fixture=await (await request.post("/api/demo",{data:{}})).json();
  const url="/api/garage/"+fixture.conversation.id;
  const first=await (await request.post(url,{data:{action:"propose",revision:fixture.conversation.revision,text:"First approach."}})).json();
  const newer=await (await request.post(url,{data:{action:"propose",revision:first.revision,text:"Updated approach."}})).json();
  expect((await request.post(url,{data:{action:"propose",revision:first.revision,text:"Stale approach."}})).status()).toBe(409);
  const customerUrl="/api/conversations/"+fixture.returnPath.split("/").at(-1);
  expect((await request.post(customerUrl,{data:{action:"accept",proposalId:first.data.proposal.id}})).status()).toBe(409);
  const result=await (await request.post(customerUrl,{data:{action:"change",proposalId:newer.data.proposal.id,text:"Could we do Friday instead?"}})).json();
  expect(result.data.status).toBe("change_requested");
  expect(result.data.proposal.response).toBe("Could we do Friday instead?");
});
