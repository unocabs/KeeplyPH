import { PublicMetrics } from '@/components/public-metrics';
import { Brand } from '@/components/brand';
import { TemplateChoices } from '@/components/template-picker';
export const metadata={title:'What do you want to keep?',robots:{index:false,follow:false}};
export default function Page(){return <main className="landing" id="main-content"><PublicMetrics page="add"/><Brand/><div className="page-heading spaced"><div><h1>What do you want to keep?</h1><p>Start with one thing. We’ll help with the details.</p></div></div><TemplateChoices/></main>;}
