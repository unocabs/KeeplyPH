import { PublicMetrics } from '@/components/public-metrics';
import { Brand } from '@/components/brand';
import { TemplateChoices } from '@/components/template-picker';
export const metadata={title:'What would you like to organise first?',robots:{index:false,follow:false}};
export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }){const { category } = await searchParams;return <main className="landing" id="main-content"><PublicMetrics page="add"/><Brand/><div className="page-heading spaced"><div><h1>What would you like to organise first?</h1><p>Choose a bill, home service, purchase or another household obligation.</p></div></div><TemplateChoices key={category} initialCategory={category}/></main>;}
