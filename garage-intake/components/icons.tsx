import type { SVGProps } from "react";
export function Icon({name,...props}:SVGProps<SVGSVGElement>&{name:"send"|"attach"|"check"|"arrow"|"close"|"car"|"refresh"}){
  const paths: Record<string,React.ReactNode>={
    send:<><path d="M12 19V5m-6 6 6-6 6 6"/></>,
    attach:<path d="m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9"/>,
    check:<path d="m5 12 4 4L19 6"/>,
    arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,
    close:<path d="m6 6 12 12M6 18 18 6"/>,
    car:<><path d="m4 10 2-5h12l2 5M4 10h16v8H4z"/><path d="M7 18v2m10-2v2M7 13h2m6 0h2"/></>,
    refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12 0l2 5M4 12l2 5a7 7 0 0 0 12 0"/></>
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
export function Brand({small=false}:{small?:boolean}){
  return <span className={small?"brand-mark small":"brand-mark"} aria-hidden="true"><Icon name="car"/></span>;
}
