import assert from "node:assert/strict";
import {createRequire} from "node:module";
import path from "node:path";
import {pathToFileURL} from "node:url";
const require=createRequire(path.join(process.env.PLAYWRIGHT_DIR,"package.json"));
const {chromium}=require("playwright");
const browser=await chromium.launch();
try {
async function journey(url){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 let page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 const response=await page.goto(url);
 await page.waitForTimeout(1000);
 console.log("HOST "+url+" status="+response?.status()+" body="+(await page.locator("body").innerText()).slice(0,700)+" errors="+JSON.stringify(errors));
 await page.getByRole("button",{name:"Send message",exact:true}).click();
 for(const text of ["Amber only, drives normally","Over bumps","Tuesday or Thursday morning","Please quote before repairs"]){
  await page.getByRole("button",{name:text,exact:true}).click();
 }
 await page.getByRole("button",{name:"Continue",exact:true}).click();
 await page.getByRole("button",{name:"Send request",exact:true}).click();
 await page.locator('[data-nav][data-action="garage"]').click();
 await page.locator(".brief-issue").first().waitFor();
 assert.equal(await page.locator(".brief-issue").count(),3);
 assert.match(await page.locator(".excluded-line").innerText(),/MOT and Service/);
 assert.equal(await page.locator('[data-action="decision"]').count(),0);
 assert.match(await page.locator(".reason-contact").innerText(),/warning lights.*yesterday/i);
 assert.match(await page.locator(".brief-list").innerText(),/Over bumps/);
 assert.equal(await page.locator(".concern-details[open]").count(),0);
 const knock=page.locator(".brief-issue").filter({has:page.getByRole("heading",{name:"Knocking noise",exact:true})});
 await knock.locator("summary").click();
 assert.match(await knock.locator(".detail-content").innerText(),/I hear it over bumps/);
 await knock.getByRole("button",{name:"Edit recorded details",exact:true}).click();
 await knock.locator('[name="handover"]').fill("Knock over bumps; customer asks for a check.");
 await knock.getByRole("button",{name:"Save edits",exact:true}).click();
 await page.locator(".symptom-summary").filter({hasText:"Knock over bumps; customer asks for a check."}).waitFor();
 await page.locator(".reply-panel>summary").click();
 await page.getByRole("button",{name:"Send reply",exact:true}).click();
 await page.locator('[data-nav][data-action="notification"]').click();
 const link=page.getByRole("link",{name:/Open customer conversation/});
 const returnURL=new URL(await link.getAttribute("href"),page.url()).href;
 await page.close();page=await context.newPage();
 await page.goto(returnURL);
 await page.getByRole("button",{name:"Accept next step",exact:true}).click();
 await page.locator('[data-nav][data-action="garage"]').click();
 await page.getByText("Customer accepted",{exact:true}).waitFor();
 await page.reload();
 await page.getByText("Customer accepted",{exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 const other=await browser.newContext();const fresh=await other.newPage();await fresh.goto(returnURL);
 await fresh.getByRole("heading",{name:"This browser has no saved conversation for that link."}).waitFor();
 await other.close();await context.close();
 console.log("PASS full customer / garage / notification / reopen journey: "+url);
}
await journey(pathToFileURL(path.resolve("garage-intake/index.html")).href);
const base=process.env.DEMO_URL;
let passed=false;
for(const url of [base]){
 try{await journey(url);passed=true;console.log("VERIFIED_DEMO_URL="+url);break;}catch(e){console.log("Hosting candidate failed: "+e.message);}
}
assert.ok(passed,"No hosted demo candidate passed");
}finally{await browser.close();}
