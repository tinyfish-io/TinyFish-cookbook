"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  TestTube2,
  Play,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: 'projects' | 'tests' | 'execution' | 'history' | 'settings';
  onTabChange: (tab: 'projects' | 'tests' | 'execution' | 'history' | 'settings') => void;
  projectName?: string;
}

const navItems = [
  { id: 'projects' as const, icon: FolderKanban, label: 'Projects' },
  { id: 'tests' as const, icon: TestTube2, label: 'Test Cases' },
  { id: 'execution' as const, icon: Play, label: 'Execution' },
  { id: 'history' as const, icon: History, label: 'History' },
  { id: 'settings' as const, icon: Settings, label: 'Settings' },
];

export function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  projectName,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-border px-4">
          <Zap className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="ml-2 text-lg font-semibold">QA Tester</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <Button
                key={item.id}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start mb-1',
                  collapsed && 'justify-center px-2',
                  isActive && 'bg-primary/10 text-primary'
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className={cn('h-4 w-4', !collapsed && 'mr-2')} />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium">
              {navItems.find((i) => i.id === activeTab)?.label}
            </h1>
            {projectName && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{projectName}</span>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
