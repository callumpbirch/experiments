import { redirect } from "next/navigation";
import Link from "next/link";
import { staffSignedIn } from "../../lib/auth";
import { pool,mapRow } from "../../lib/db";
import { StaffHeader } from "../../components/staff-header";
import { Icon } from "../../components/icons";
export const dynamic="force-dynamic";
const labels:Record<string,string>={submitted:"Ready to review",proposed:"Awaiting customer",accepted:"Customer accepted",change_requested:"Change requested"};
export default async function GaragePage(){
  if(!await staffSignedIn())redirect("/login?next=/garage");
  const result=await pool.query("SELECT * FROM conversations WHERE data->>'status'<>'draft' ORDER BY updated_at DESC LIMIT 30");
  const requests=result.rows.map(mapRow);
  return <><StaffHeader/><main className="staff-page">
    <div className="page-heading"><div><div className="eyebrow">Before the car arrives</div><h1>Customer requests</h1></div><Link className="text-button" href="/demo">Try the demo <Icon name="arrow" width="14" height="14"/></Link></div>
    {!requests.length?<div className="empty-state"><h2>No requests yet.</h2><p>Complete the customer conversation, or load the Škoda example.</p><Link className="button" href="/demo">Open demo</Link></div>:
    <div className="request-list">{requests.map(c=><Link key={c.id} href={"/garage/"+c.id} className="request-row">
      <div><h2>{c.data.customer.name}</h2><p>{c.data.vehicle.registration||"Registration not supplied"} · {c.data.vehicle.description}</p></div>
      <div className="request-meta"><span className={"status-pill "+c.data.status}>{labels[c.data.status]}</span><span>{c.data.issues.length} concerns</span><Icon name="arrow" width="18" height="18"/></div>
    </Link>)}</div>}
  </main></>;
}
