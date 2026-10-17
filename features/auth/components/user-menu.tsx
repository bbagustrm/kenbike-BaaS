"use client";

import {
  LayoutDashboardIcon,
  LogOutIcon,
  MessagesSquareIcon,
  PackageIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnreadBadge } from "@/features/chat/components/unread-badge";

import { signOut } from "../actions";

type UserMenuProps = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

function initials(name: string | null, email: string | null) {
  const source = name?.trim() || email || "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ name, email, avatarUrl, isAdmin }: UserMenuProps) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            aria-label="Menu akun"
          />
        }
      >
        <Avatar className="size-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback>{initials(name, email)}</AvatarFallback>
        </Avatar>
        <UnreadBadge className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate text-sm font-medium text-foreground">
              {name || "Pengguna"}
            </span>
            {email && <span className="truncate">{email}</span>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account" />}>
          <UserIcon />
          Akun saya
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/orders" />}>
          <PackageIcon />
          Pesanan saya
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href={isAdmin ? "/admin/messages" : "/account/messages"} />}
        >
          <MessagesSquareIcon />
          Pesan
          <UnreadBadge className="ml-auto" />
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <LayoutDashboardIcon />
            Panel admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
        >
          <LogOutIcon />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
