'use client';
import { usePathname } from 'next/navigation';
import { AppLoadError } from '@/components/app-load-error';

export default function ErrorPage({ retry }: { retry: () => void }) {
 const pathname=usePathname();
 return <AppLoadError retry={retry} planning={pathname==='/checkup'||pathname==='/planner'}/>;
}
