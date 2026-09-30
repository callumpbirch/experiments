"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "../lib/client";
import { Brand,Icon } from "./icons";
export function Login({next}:{next:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  return <main className="login-page"><Brand/><h1>Garage access</h1><p>Review requests and propose the next step.</p>
    <form onSubmit={async e=>{e.preventDefault();const password=String(new FormData(e.currentTarget).get("password"));setBusy(true);setError("");
      try{await request("/api/session",{password});router.push(next);router.refresh();}
      catch(e){setError(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}
    }}>
      <label htmlFor="password">Garage password</label><input id="password" name="password" type="password" autoComplete="current-password" required/>
      {error?<p className="inline-error" role="alert">{error}</p>:null}
      <button className="button" disabled={busy}>Sign in <Icon name="arrow" width="16" height="16"/></button>
    </form>
  </main>;
}
