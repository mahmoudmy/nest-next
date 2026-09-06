import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'QMS | Platform console',description:'Infrastructure verification console. No QMS business modules.'};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
