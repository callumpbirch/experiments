import Link from "next/link";
export default function NotFound(){
  return <main className="simple-page"><h1>This conversation wasn't found.</h1><p>Please check the link, or start a new request.</p><Link className="button" href="/start">Start a conversation</Link></main>;
}
