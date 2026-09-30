import test from "node:test";
import assert from "node:assert/strict";
import { newToken,hashToken,encryptToken,decryptToken,createSession,validSession,checkPassword } from "../lib/security.mjs";
process.env.AUTH_SECRET="test-only-secret-longer-than-thirty-two-characters";
process.env.GARAGE_PASSWORD="test-password";

test("return links use opaque tokens with hashed lookup and recoverable encrypted delivery",()=>{
  const token=newToken();
  assert.match(token,/^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(newToken(),token);
  assert.notEqual(hashToken(token),token);
  const encrypted=encryptToken(token);
  assert.ok(!encrypted.includes(token));
  assert.equal(decryptToken(encrypted),token);
  assert.throws(()=>decryptToken(encrypted.slice(0,-5)));
});
test("staff sessions are signed, expire and cannot be forged",()=>{
  const session=createSession(1000);
  assert.equal(validSession(session,2000),true);
  assert.equal(validSession(session,1000+8*60*60*1000),false);
  assert.equal(validSession(session+"x",2000),false);
  assert.equal(validSession("customer-token",2000),false);
});
test("staff password is configured rather than hard-coded",()=>{
  assert.equal(checkPassword("test-password"),true);
  assert.equal(checkPassword("wrong"),false);
});
