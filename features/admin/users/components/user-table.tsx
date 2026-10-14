"use client";

import { ShieldCheckIcon, ShieldOffIcon } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

import { setUserRole } from "../actions";
import type { AdminUser } from "../queries";

export function UserTable({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pengguna</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Pesanan</TableHead>
            <TableHead>Terdaftar</TableHead>
            <TableHead>Login terakhir</TableHead>
            <TableHead className="w-40">
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const self = u.id === currentUserId;
            const isAdmin = u.role === "admin";
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">
                    {u.fullName ?? "—"}
                    {self && <span className="text-muted-foreground"> (kamu)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={isAdmin ? "default" : "secondary"}>
                    {isAdmin ? "Admin" : "Customer"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{u.orderCount}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(u.createdAt)}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                  {u.lastSignInAt ? formatDate(u.lastSignInAt) : "—"}
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="sm" />}
                      triggerLabel={
                        <>
                          <ShieldOffIcon />
                          Cabut admin
                        </>
                      }
                      title={
                        self ? "Cabut akses admin dirimu sendiri?" : `Cabut akses admin ${u.email}?`
                      }
                      description={
                        self
                          ? "Kamu akan langsung kehilangan akses ke halaman admin. Admin terakhir tidak bisa dicabut."
                          : "Pengguna ini tidak lagi bisa membuka halaman admin."
                      }
                      confirmLabel="Cabut admin"
                      destructive
                      onConfirm={() => setUserRole(u.id, "customer")}
                    />
                  ) : (
                    <ConfirmDialog
                      trigger={<Button variant="outline" size="sm" />}
                      triggerLabel={
                        <>
                          <ShieldCheckIcon />
                          Jadikan admin
                        </>
                      }
                      title={`Jadikan ${u.email} admin?`}
                      description="Admin bisa mengelola produk, pesanan, pengaturan toko, dan pengguna lain."
                      confirmLabel="Jadikan admin"
                      onConfirm={() => setUserRole(u.id, "admin")}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
