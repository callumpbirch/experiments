import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
export const notificationAdapter = {
  async queue(client: PoolClient, conversationId: string, mobile: string, returnToken: string) {
    const path="/c/"+returnToken;
    const base=(process.env.APP_URL||"http://localhost:3000").replace(/\/$/,"");
    const text="North Street Garage has proposed a next step for your car. Read and reply: "+base+path;
    await client.query("INSERT INTO notifications(id,conversation_id,recipient,body,return_path) VALUES($1,$2,$3,$4,$5)",
      [randomUUID(),conversationId,mobile,text,path]);
    // Demo adapter writes to the SMS preview. A delivery adapter can consume
    // this outbox after commit. It must not send within the database transaction.
  }
};
