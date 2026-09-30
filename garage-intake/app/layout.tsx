import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={
  title:"North Street Garage · Before your visit",
  description:"Tell the garage what's going on with your car.",
  robots:{index:false,follow:false}
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en-GB"><body>{children}</body></html>;
}
