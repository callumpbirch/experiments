"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand } from "./icons";
export function StaffHeader(){
  const router=useRouter();
  return <header className="staff-header"><Link href="/garage" className="staff-brand"><Brand small/><span>North Street Garage</span></Link>
    <nav aria-label="Garage navigation"><Link href="/garage">Requests</Link><Link href="/demo">Demo & SMS preview</Link>
      <button className="text-button" onClick={async()=>{const response=await fetch("/api/session",{method:"DELETE"});if(response.ok){router.push("/login");router.refresh();}}}>Sign out</button>
    </nav>
  </header>;
}
