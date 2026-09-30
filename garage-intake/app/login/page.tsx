import { Login } from "../../components/login";
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){
  const next=(await searchParams).next;
  return <Login next={next==="/demo"?"/demo":"/garage"}/>;
}
