"use client";
export default function ErrorPage({reset}:{reset:()=>void}){
  return <main className="simple-page"><h1>We couldn't open that just now.</h1><p>Your saved conversation is still there. Please try again.</p><button className="button" onClick={reset}>Try again</button></main>;
}
