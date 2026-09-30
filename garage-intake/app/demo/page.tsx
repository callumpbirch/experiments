import { redirect } from "next/navigation";
import { staffSignedIn } from "../../lib/auth";
import { Demo } from "../../components/demo";
export const dynamic="force-dynamic";
export default async function DemoPage(){
  if(!await staffSignedIn())redirect("/login?next=/demo");
  return <Demo/>;
}
