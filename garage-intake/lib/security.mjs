
import { randomBytes, createHash, createHmac, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";
function secret(){
  const value=process.env.AUTH_SECRET;
  if(!value||value.length<32)throw new Error("Set AUTH_SECRET to at least 32 random characters.");
  return value;
}
export const newToken=()=>randomBytes(32).toString("base64url");
export const hashToken=token=>createHash("sha256").update(token).digest("hex");
export function encryptToken(token){
  const iv=randomBytes(12),key=createHash("sha256").update(secret()).digest();
  const cipher=createCipheriv("aes-256-gcm",key,iv);
  const encrypted=Buffer.concat([cipher.update(token,"utf8"),cipher.final()]);
  return [iv,cipher.getAuthTag(),encrypted].map(b=>b.toString("base64url")).join(".");
}
export function decryptToken(value){
  const [iv,tag,body]=value.split(".").map(v=>Buffer.from(v,"base64url"));
  const decipher=createDecipheriv("aes-256-gcm",createHash("sha256").update(secret()).digest(),iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body),decipher.final()]).toString("utf8");
}
function same(a,b){
  const x=createHash("sha256").update(a).digest(),y=createHash("sha256").update(b).digest();
  return timingSafeEqual(x,y);
}
export function checkPassword(value){
  if(!process.env.GARAGE_PASSWORD)throw new Error("Set GARAGE_PASSWORD.");
  return same(value,process.env.GARAGE_PASSWORD);
}
export function createSession(now=Date.now()){
  const payload=Buffer.from(JSON.stringify({role:"garage",exp:now+8*60*60*1000})).toString("base64url");
  return payload+"."+createHmac("sha256",secret()).update(payload).digest("base64url");
}
export function validSession(value,now=Date.now()){
  try{
    const [payload,signature]=value.split(".");
    if(!payload||!signature)return false;
    const expected=createHmac("sha256",secret()).update(payload).digest("base64url");
    if(!same(signature,expected))return false;
    const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
    return data.role==="garage"&&Number.isFinite(data.exp)&&data.exp>now;
  }catch{return false;}
}
