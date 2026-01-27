"use client";

import { ReactNode, useState, useEffect, useMemo } from "react";
import {
  Table2,
  LayoutGrid,
  Lightbulb,
  Settings,
  Plus,
  RefreshCw,
  Loader2,
  BarChart3,
  PanelLeft,
  PanelLeftClose,
  Menu,
  Users,
  Bot,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  onAddClick: () => void;
  onRefreshClick: () => void;
  onSettingsClick: () => void;
  isRefreshing: boolean;
  showAddInput: boolean;
  competitorCount: number;
  loadingCount: number;
  baselineName?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "spreadsheet", label: "Data", icon: <Table2 className="w-5 h-5" /> },
  { id: "competitors", label: "Competitors", icon: <Users className="w-5 h-5" /> },
  { id: "agents", label: "Agents", icon: <Bot className="w-5 h-5" /> },
  { id: "comparison", label: "Comparison", icon: <LayoutGrid className="w-5 h-5" /> },
  { id: "insights", label: "Insights", icon: <Lightbulb className="w-5 h-5" /> },
];

export function DashboardLayout({
  children,
  activeView,
  onViewChange,
  onAddClick,
  onRefreshClick,
  onSettingsClick,
  isRefreshing,
  showAddInput,
  competitorCount,
  loadingCount,
  baselineName,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Keyboard shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderSidebarContent = useMemo(() => {
    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`p-4 border-b border-[#e0dfde] ${collapsed && !isMobile ? "px-2" : ""}`}>
          <div className={`flex items-center ${collapsed && !isMobile ? "flex-col gap-2" : "gap-3"}`}>
            <div className="w-10 h-10 rounded-xl bg-[#D76228] flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            {(!collapsed || isMobile) && (
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-semibold text-[#1a1a1a] truncate">Pricing Intel</h1>
                <p className="text-xs text-[#165762]/50 truncate">{baselineName || "Configure baseline"}</p>
              </div>
            )}
            {!isMobile && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-md text-[#165762]/40 hover:text-[#165762] hover:bg-[#165762]/5 transition-colors"
              >
                {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={`p-3 space-y-1 ${collapsed && !isMobile ? "px-2" : ""}`}>
          <p className={`text-[10px] uppercase tracking-wider text-[#165762]/40 mb-2 ${collapsed && !isMobile ? "text-center" : "px-2"}`}>
            {collapsed && !isMobile ? "" : "Actions"}
          </p>

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onAddClick}
                  className={`w-full flex items-center gap-3 h-10 rounded-lg transition-colors ${
                    collapsed && !isMobile ? "justify-center px-0" : "px-3"
                  } ${
                    showAddInput
                      ? "bg-[#D76228] text-white"
                      : "text-[#165762]/70 hover:bg-[#D76228]/10 hover:text-[#D76228]"
                  }`}
                >
                  <Plus className="w-5 h-5 flex-shrink-0" />
                  {(!collapsed || isMobile) && <span className="text-sm font-medium">Add</span>}
                </button>
              </TooltipTrigger>
              {collapsed && !isMobile && <TooltipContent side="right">Add Competitors</TooltipContent>}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onRefreshClick}
                  disabled={isRefreshing}
                  className={`w-full flex items-center gap-3 h-10 rounded-lg transition-colors text-[#165762]/70 hover:bg-[#165762]/10 disabled:opacity-50 ${
                    collapsed && !isMobile ? "justify-center px-0" : "px-3"
                  }`}
                >
                  {isRefreshing ? (
                    <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5 flex-shrink-0" />
                  )}
                  {(!collapsed || isMobile) && <span className="text-sm font-medium">Refresh</span>}
                </button>
              </TooltipTrigger>
              {collapsed && !isMobile && <TooltipContent side="right">Refresh All</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Navigation */}
        <div className={`p-3 space-y-1 flex-1 ${collapsed && !isMobile ? "px-2" : ""}`}>
          <p className={`text-[10px] uppercase tracking-wider text-[#165762]/40 mb-2 ${collapsed && !isMobile ? "text-center" : "px-2"}`}>
            {collapsed && !isMobile ? "" : "Views"}
          </p>

          <TooltipProvider delayDuration={0}>
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 h-10 rounded-lg transition-colors ${
                      collapsed && !isMobile ? "justify-center px-0" : "px-3"
                    } ${
                      activeView === item.id
                        ? "bg-[#165762] text-white"
                        : "text-[#165762]/70 hover:bg-[#165762]/10"
                    }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {(!collapsed || isMobile) && <span className="text-sm font-medium">{item.label}</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && !isMobile && <TooltipContent side="right">{item.label}</TooltipContent>}
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Footer */}
        <div className={`mt-auto p-3 border-t border-[#e0dfde] ${collapsed && !isMobile ? "px-2" : ""}`}>
          {/* Stats */}
          {(!collapsed || isMobile) && (
            <div className="mb-3 p-3 bg-[#165762]/5 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#165762]/60">Competitors</span>
                <span className="font-semibold text-[#165762]">
                  {competitorCount}
                  {loadingCount > 0 && <span className="text-[#D76228] ml-1">+{loadingCount}</span>}
                </span>
              </div>
            </div>
          )}

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onSettingsClick}
                  className={`w-full flex items-center gap-3 h-10 rounded-lg transition-colors text-[#165762]/70 hover:bg-[#165762]/10 ${
                    collapsed && !isMobile ? "justify-center px-0" : "px-3"
                  }`}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  {(!collapsed || isMobile) && <span className="text-sm font-medium">Settings</span>}
                </button>
              </TooltipTrigger>
              {collapsed && !isMobile && <TooltipContent side="right">Settings</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
    return SidebarContent;
  }, [collapsed, baselineName, showAddInput, isRefreshing, activeView, competitorCount, loadingCount, onAddClick, onRefreshClick, onViewChange, onSettingsClick]);

  return (
    <div className="flex min-h-screen w-full bg-[#F4F3F2]">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#e0dfde] transform transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {useMemo(() => {
          const SidebarContent = renderSidebarContent;
          return <SidebarContent isMobile />;
        }, [renderSidebarContent])}
      </div>

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col bg-white border-r border-[#e0dfde] transition-all duration-300 flex-shrink-0 h-screen sticky top-0 overflow-hidden ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {useMemo(() => {
          const SidebarContent = renderSidebarContent;
          return <SidebarContent />;
        }, [renderSidebarContent])}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 flex items-center gap-4 px-4 border-b border-[#e0dfde] bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 -ml-2 text-[#165762]/70 hover:text-[#165762]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-[#1a1a1a] capitalize truncate">
              {NAV_ITEMS.find((i) => i.id === activeView)?.label || "Dashboard"}
            </h2>
          </div>

          <span className="hidden sm:inline text-xs text-[#165762]/40">
            ⌘B to toggle sidebar
          </span>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
