import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'PodPilot AI — Your story. A conversation worth sharing.',description:'Everyone has a story. Now everyone has a host. Create a podcast interview with NOVA in a free browser demo or optional OpenAI mode.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
