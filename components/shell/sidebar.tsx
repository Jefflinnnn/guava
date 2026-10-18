"use client";

import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Receipt,
  Settings,
  Star,
  Tag,
} from "lucide-react";

import { InitialAvatar } from "@/components/guava/initial-avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logOut } from "@/lib/auth-actions";
import { initialsOf } from "@/lib/guava/format";
import { useReviewCount } from "@/lib/guava/store";
import { useLocalStorage } from "@/lib/use-local-storage";
import { cn } from "@/lib/utils";

import { NavItem } from "./nav-item";

const isBool = (v: unknown): v is boolean => typeof v === "boolean";

export type SidebarUser = { name: string; email: string };

export function Sidebar({ user }: { user: SidebarUser }) {
  const [collapsed, setCollapsed] = useLocalStorage(
    "guava.sidebarCollapsed",
    false,
    isBool,
  );
  const reviewCount = useReviewCount();
  const displayName = user.name.trim() || user.email;

  return (
    <aside
      className={cn(
        "relative z-20 flex flex-none flex-col overflow-hidden border-r bg-sidebar p-3 transition-[width] duration-200 ease-out",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div className="mb-4 flex h-10 items-center gap-2.5">
        <SidebarLogo
          collapsed={collapsed}
          onExpand={() => setCollapsed(false)}
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate font-semibold">guava</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
            >
              <PanelLeft />
            </Button>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="flex h-7 items-center px-2 text-xs font-medium text-ink-3">
          Menu
        </div>
      )}
      <nav className="flex flex-col gap-0.5">
        <NavItem
          href="/"
          icon={<LayoutDashboard />}
          label="Dashboard"
          collapsed={collapsed}
        />
        <NavItem
          href="/expenses"
          icon={<Receipt />}
          label="Expenses"
          badge={reviewCount}
          tooltip={
            reviewCount ? `Expenses · ${reviewCount} to review` : "Expenses"
          }
          collapsed={collapsed}
        />
        <NavItem
          href="/categories"
          icon={<Tag />}
          label="Categories"
          collapsed={collapsed}
        />
      </nav>

      <div className="flex-1" />
      <NavItem
        href="/settings"
        icon={<Settings />}
        label="Settings"
        collapsed={collapsed}
      />
      <div className="mt-2 flex items-center gap-2.5 border-t px-1 pt-2">
        <InitialAvatar
          name={displayName}
          text={initialsOf(displayName)}
          size={32}
          shape="circle"
        />
        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium">
                {displayName}
              </span>
              <span className="truncate text-xs text-ink-3">{user.email}</span>
            </div>
            <form action={logOut}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label="Log out"
              >
                <LogOut />
              </Button>
            </form>
          </>
        )}
      </div>
    </aside>
  );
}

/** The logo tile. When collapsed, hovering swaps the star for an expand control. */
function SidebarLogo({
  collapsed,
  onExpand,
}: {
  collapsed: boolean;
  onExpand: () => void;
}) {
  const tile =
    "group/logo flex size-8 flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground [&_svg]:size-4";
  if (!collapsed) {
    return (
      <span className={tile}>
        <Star className="fill-current" strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Expand sidebar"
          onClick={onExpand}
          className={cn(
            tile,
            "cursor-pointer transition-colors hover:bg-border hover:text-primary",
          )}
        >
          <Star
            className="fill-current group-hover/logo:hidden"
            strokeWidth={1.5}
          />
          <PanelLeft className="hidden group-hover/logo:block" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        Expand sidebar
      </TooltipContent>
    </Tooltip>
  );
}
