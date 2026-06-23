"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Library, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard", label: "Статистика", icon: LayoutDashboard },
  { href: "/decks", label: "Колоды", icon: Library },
];

export function Nav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
        <Link href="/decks" className="mr-4 flex items-center gap-2 font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lexica_logo.svg" alt="" className="h-6 w-auto" />
          <span>Lexica</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Button
                key={href}
                asChild
                variant={active ? "secondary" : "ghost"}
                size="sm"
              >
                <Link href={href}>
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground md:inline">
            {email}
          </span>
          <form action="/auth/signout" method="post">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className={cn("text-muted-foreground")}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
