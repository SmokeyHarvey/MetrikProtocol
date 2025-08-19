'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Home, LayoutDashboard, Shield, FileText, Banknote, RotateCcw, Menu, PanelLeftOpen, PanelLeftClose } from 'lucide-react';

type NavItem = {
    key: string;
    icon: React.ReactNode;
    label: string;
    href: string;
};

function getSupplierNav(): NavItem[] {
    return [
        { key: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/dashboard/supplier' },
        { key: 'staking', icon: <Shield className="w-5 h-5" />, label: 'Staking', href: '/dashboard/supplier/staking' },
        { key: 'invoice', icon: <FileText className="w-5 h-5" />, label: 'Invoice', href: '/dashboard/supplier/invoice' },
        { key: 'borrow', icon: <Banknote className="w-5 h-5" />, label: 'Borrow', href: '/dashboard/supplier/borrow' },
        { key: 'repay', icon: <RotateCcw className="w-5 h-5" />, label: 'Repay', href: '/dashboard/supplier/repay' },
    ];
}

function getLpNav(): NavItem[] {
    return [
        { key: 'home', icon: <Home className="w-5 h-5" />, label: 'Home', href: '/' },
        { key: 'deposit', icon: <Banknote className="w-5 h-5" />, label: 'Deposit', href: '/dashboard/lp/deposit' },
    ];
}

function getOwnerNav(): NavItem[] {
    return [
        { key: 'home', icon: <Home className="w-5 h-5" />, label: 'Home', href: '/' },
        { key: 'verify', icon: <FileText className="w-5 h-5" />, label: 'Verify Invoices', href: '/dashboard/owner' },
    ];
}

export default function Sidebar() {
    const pathname = usePathname();

    const role = pathname && pathname.includes('/dashboard/supplier') ? 'supplier'
        : pathname && pathname.includes('/dashboard/lp') ? 'lp'
            : pathname && pathname.includes('/dashboard/owner') ? 'verifier'
                : 'supplier';

    const navItems = role === 'supplier' ? getSupplierNav() : role === 'lp' ? getLpNav() : getOwnerNav();

    const [isOpen, setIsOpen] = React.useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        const saved = window.localStorage.getItem('sidebar:open');
        return saved ? saved === '1' : true;
    });

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('sidebar:open', isOpen ? '1' : '0');
        }
    }, [isOpen]);

    return (
        <>
            {/* Mobile trigger */}
            <div className="md:hidden px-4 py-2">
                <Sheet>
                    <SheetTrigger aria-label="Open navigation" className="p-2 rounded-md hover:bg-gray-100">
                        <Menu className="w-5 h-5" />
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 bg-white border-r">
                        <NavList items={navItems} expanded />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop collapsible sidebar */}
            <aside
                className={clsx(
                    'hidden md:flex h-[calc(100dvh-64px)] sticky top-16 shrink-0 flex-col bg-white transition-[width] duration-300 ease-in-out rounded-lg shadow-lg global-shadow',
                    isOpen ? 'w-56' : 'w-16'
                )}
                style={{ willChange: 'width' }}
            >
                <div className="flex items-center justify-start p-2">
                    <button
                        className="w-8 h-8 rounded-md hover:bg-[#f58a32] hover:text-white pl-2"
                        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        onClick={() => setIsOpen((v) => !v)}
                    >
                        {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                    </button>
                </div>
                <Separator className="bg-gray-200" />
                <NavList items={navItems} expanded={isOpen} />
            </aside>
        </>
    );
}

function NavList({ items, expanded = true }: { items: NavItem[]; expanded?: boolean }) {
    const pathname = usePathname();

    return (
        <nav className="flex flex-col gap-1 p-2">
            {items.map((item) => {
                const isBaseSection = /^\/dashboard\/(supplier|lp|owner)$/.test(item.href);
                const isActive = isBaseSection
                    ? pathname === item.href
                    : pathname === item.href || (pathname && pathname.startsWith(item.href + '/'));
                return (
                    <Tooltip key={item.key}>
                        <TooltipTrigger asChild>
                            <Link
                                href={item.href}
                                className={clsx(
                                    'group flex items-center rounded-md px-2 py-2 text-sm transition-colors overflow-hidden',
                                    'justify-start',
                                    isActive ? 'bg-[#f58a32] text-white hover:bg-[#f58a32]' : 'hover:bg-gray-100'
                                )}
                            >
                                <span className={clsx("w-5 h-5 inline-flex items-center justify-center text-gray-700 mr-3 shrink-0", isActive && 'text-white')}>
                                    {item.icon}
                                </span>
                                <span className="relative overflow-hidden shrink-0 w-[160px]">
                                    <span
                                        className={clsx('block', isActive ? 'text-white hover:bg-[#f58a32]' : 'text-gray-700')}
                                        style={{
                                            clipPath: expanded ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
                                            transition: 'clip-path 300ms ease-in-out',
                                            willChange: 'clip-path',
                                        }}
                                        aria-hidden={!expanded}
                                    >
                                        {item.label}
                                    </span>
                                </span>
                            </Link>
                        </TooltipTrigger>
                        {!expanded ? <TooltipContent side="right">{item.label}</TooltipContent> : null}
                    </Tooltip>
                );
            })}
        </nav>
    );
}


