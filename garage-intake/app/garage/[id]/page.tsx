import { notFound,redirect } from "next/navigation";
import { z } from "zod";
import { staffSignedIn } from "../../../lib/auth";
import { pool,mapRow } from "../../../lib/db";
import { GarageBrief } from "../../../components/garage-brief";
export const dynamic="force-dynamic";
export default async function BriefPage({params}:{params:Promise<{id:string}>}){
  if(!await staffSignedIn())redirect("/login?next=/garage");
  const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
  const result=await pool.query("SELECT * FROM conversations WHERE id=$1 AND data->>'status'<>'draft'",[id]);
  if(!result.rows[0])notFound();
  return <GarageBrief initial={mapRow(result.rows[0])}/>;
}
