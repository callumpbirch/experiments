import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function assertOrigin(request: Request) {
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin)throw new HttpError(403,"This request came from another site.");
}
export async function body(request: Request) {
  const contentLength=Number(request.headers.get("content-length")||0);
  if(contentLength>9_000_000)throw new HttpError(413,"This upload is too large.");
  const text=await request.text();
  if(text.length>9_000_000)throw new HttpError(413,"This upload is too large.");
  try{return JSON.parse(text);}
  catch{throw new HttpError(400,"Please send valid JSON.");}
}
export function json(value: unknown, status=200) {
  return NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});
}
export function failure(error: unknown) {
  if(error instanceof HttpError)return json({error:error.message},error.status);
  if(error instanceof ZodError)return json({error:error.issues[0]?.message||"Please check the details."},400);
  console.error("Intake request failed",error instanceof Error?error.message:"Unknown error");
  return json({error:"We couldn't save that just now. Please try again."},500);
}
