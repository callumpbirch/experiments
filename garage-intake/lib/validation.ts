import { z } from "zod";
export const tokenSchema=z.string().regex(/^[a-zA-Z0-9_-]{43}$/,"That conversation link isn't valid.");
export const startSchema=z.object({
  text:z.string().trim().min(2,"Tell us a little about the car.").max(4000),
  source:z.enum(["website","google","whatsapp","sms","qr","demo"]).default("website"),
  requestKey:z.string().uuid()
}).strict();
const customer=z.object({
  name:z.string().trim().min(1,"Please add your name.").max(100),
  mobile:z.string().trim().regex(/^[+()\d\s-]{7,25}$/,"Please add a mobile number.").refine(v=>v.replace(/\D/g,"").length>=7,"Please add a mobile number.")
}).strict();
const vehicle=z.object({description:z.string().trim().max(150),registration:z.string().trim().max(20)}).strict();
export const customerCommand=z.discriminatedUnion("action",[
  z.object({action:z.literal("message"),text:z.string().trim().min(1).max(4000),messageId:z.string().uuid()}).strict(),
  z.object({action:z.literal("contact"),customer,vehicle}).strict(),
  z.object({action:z.literal("submit")}).strict(),
  z.object({action:z.literal("photo"),photoId:z.string().uuid(),name:z.string().max(160),dataUrl:z.string().max(2_800_000),issueId:z.string().max(60).nullable()}).strict(),
  z.object({action:z.literal("removePhoto"),photoId:z.string().uuid()}).strict(),
  z.object({action:z.literal("accept"),proposalId:z.string().uuid()}).strict(),
  z.object({action:z.literal("change"),proposalId:z.string().uuid(),text:z.string().trim().min(1).max(2000)}).strict()
]);
const issue=z.object({
  id:z.string().max(60),title:z.string().trim().min(1).max(150),
  priority:z.number().int().min(1).max(20),symptoms:z.array(z.string().trim().min(1).max(4000)).min(1).max(20),
  onset:z.string().max(200),workType:z.enum(["diagnosis","inspect-and-quote","known-work"]),
  urgency:z.string().max(200),uncertainties:z.array(z.string().max(500)).max(10),
  decision:z.enum(["investigate","quote","later","none"])
}).strict();
export const garageCommand=z.discriminatedUnion("action",[
  z.object({action:z.literal("save"),revision:z.number().int().min(0),issues:z.array(issue).min(1).max(20),
    availability:z.string().max(4000),constraints:z.string().max(4000),
    excludedWork:z.array(z.string().trim().min(1).max(100)).max(10)}).strict(),
  z.object({action:z.literal("propose"),revision:z.number().int().min(0),text:z.string().trim().min(1).max(6000)}).strict()
]);
