import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Smartphone, Ban, Activity } from "lucide-react";

interface Log { id: string; user_id: string | null; mobile_number: string; device_id: string | null; device_name: string | null; ip_address: string | null; event_type: string; is_suspicious: boolean; reason: string | null; created_at: string; }
interface Prof { user_id: string; full_name: string | null; is_blocked: boolean; }

const LABELS: Record<string, string> = {
  multiple_devices: "Multiple devices", blocked_login_attempt: "Blocked account attempt",
  unauthorized_role_attempt: "Unauthorized attempt", unregistered_attempt: "Unregistered number", login_success: "Login",
};

const SecurityAuditTab = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<Log[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Prof>>({});
  const [filter, setFilter] = useState("suspicious");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<Prof | null>(null);

  const load = async () => {
    const { data } = await supabase.from("customer_auth_audit_logs" as any).select("*").order("created_at", { ascending: false }).limit(1000);
    const rows = (data ?? []) as unknown as Log[];
    setLogs(rows);
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id, full_name, is_blocked").in("user_id", ids.slice(0, 500));
      setProfiles(Object.fromEntries((ps ?? []).map((p: any) => [p.user_id, p])));
    }
  };
  useEffect(() => { load(); }, []);

  const deviceCounts = useMemo(() => {
    const m = new Map<string, Set<string>>();
    logs.forEach(l => { if (l.user_id && l.device_id) { if (!m.has(l.user_id)) m.set(l.user_id, new Set()); m.get(l.user_id)!.add(l.device_id); } });
    return m;
  }, [logs]);
  const multiUsers = [...deviceCounts.values()].filter(s => s.size > 1).length;

  const shown = logs.filter(l => {
    if (filter === "suspicious" && !l.is_suspicious) return false;
    if (filter !== "all" && filter !== "suspicious" && l.event_type !== filter) return false;
    const name = l.user_id ? profiles[l.user_id]?.full_name ?? "" : "";
    const s = q.trim().toLowerCase();
    return !s || l.mobile_number.includes(s) || name.toLowerCase().includes(s) || (l.ip_address ?? "").includes(s);
  });

  const toggleBlock = async () => {
    if (!target) return;
    const { error } = await supabase.from("profiles").update({ is_blocked: !target.is_blocked }).eq("user_id", target.user_id);
    toast(error ? { title: "Failed", description: error.message, variant: "destructive" } : { title: target.is_blocked ? "User unblocked" : "User blocked" });
    setTarget(null); load();
  };

  const stat = (label: string, value: number, Icon: any) => (
    <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle><Icon className="h-5 w-5 text-destructive" /></CardHeader><CardContent><p className="text-2xl font-bold">{value}</p></CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("Suspicious events", logs.filter(l => l.is_suspicious).length, ShieldAlert)}
        {stat("Multi-device customers", multiUsers, Smartphone)}
        {stat("Blocked/unauthorized attempts", logs.filter(l => ["blocked_login_attempt", "unauthorized_role_attempt"].includes(l.event_type)).length, Ban)}
        {stat("Total logins logged", logs.length, Activity)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search mobile, name, IP" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="suspicious">Suspicious only</SelectItem>
            <SelectItem value="all">All events</SelectItem>
            {Object.entries(LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Mobile</TableHead><TableHead>Customer</TableHead><TableHead>Event</TableHead><TableHead>Device</TableHead><TableHead>IP</TableHead><TableHead>Devices</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {shown.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No events</TableCell></TableRow>}
            {shown.map(l => {
              const p = l.user_id ? profiles[l.user_id] : undefined;
              const n = l.user_id ? deviceCounts.get(l.user_id)?.size ?? 0 : 0;
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">{format(new Date(l.created_at), "dd MMM yyyy, hh:mm a")}</TableCell>
                  <TableCell>{l.mobile_number}</TableCell>
                  <TableCell>{p?.full_name ?? "—"}</TableCell>
                  <TableCell><Badge variant={l.is_suspicious ? "destructive" : "secondary"}>{LABELS[l.event_type] ?? l.event_type}</Badge><p className="mt-1 text-xs text-muted-foreground">{l.reason}</p></TableCell>
                  <TableCell className="text-xs">{l.device_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{l.ip_address ?? "—"}</TableCell>
                  <TableCell>{n > 1 ? <Badge variant="outline" className="border-destructive text-destructive">{n}</Badge> : n || "—"}</TableCell>
                  <TableCell>{p && <Button size="sm" variant={p.is_blocked ? "outline" : "destructive"} onClick={() => setTarget(p)}>{p.is_blocked ? "Unblock" : "Block"}</Button>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={!!target} onOpenChange={o => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target?.is_blocked ? "Unblock" : "Block"} {target?.full_name ?? "this customer"}?</AlertDialogTitle>
            <AlertDialogDescription>{target?.is_blocked ? "They will be able to log in again." : "They will not be able to log in until unblocked."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={toggleBlock}>Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default SecurityAuditTab;
