import { PagedTableBody } from "@/components/admin/PagedTableBody";
import { useEffect, useMemo, useState } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Wrench, Users, ClipboardList, CheckCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/utilityServices";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

interface Props { dateFrom?: Date; dateTo?: Date; localBodyIds: Set<string> | null }

const Stat = ({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: any }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className="h-5 w-5 text-primary" />
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);

const UtilitySellerAnalytics = ({ dateFrom, dateTo, localBodyIds }: Props) => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("user_id,full_name,mobile_number,is_approved,local_body_id").eq("user_type", "selling_partner").eq("seller_type", "utility"),
      supabase.from("utility_services").select("id,name,provider_user_id,category_id,is_active,is_approved"),
      supabase.from("utility_service_requests").select("id,service_id,status,total_amount,quoted_amount,created_at,contact_name").order("created_at", { ascending: false }).limit(5000),
      supabase.from("utility_service_categories").select("id,name"),
      supabase.from("utility_seller_areas").select("seller_user_id,local_body_id"),
    ]).then(([s, sv, r, c, a]) => {
      setSellers(s.data ?? []); setServices(sv.data ?? []); setRequests(r.data ?? []);
      setCategories(c.data ?? []); setAreas(a.data ?? []); setLoading(false);
    });
  }, []);

  const data = useMemo(() => {
    const inArea = (uid: string) => {
      if (!localBodyIds) return true;
      const s = sellers.find(x => x.user_id === uid);
      return (s?.local_body_id && localBodyIds.has(s.local_body_id)) || areas.some(a => a.seller_user_id === uid && localBodyIds.has(a.local_body_id));
    };
    const scopedSellers = sellers.filter(s => inArea(s.user_id));
    const sellerIds = new Set(scopedSellers.map(s => s.user_id));
    const svcMap = new Map(services.map(s => [s.id, s]));
    const scopedServices = services.filter(s => s.provider_user_id && sellerIds.has(s.provider_user_id));
    const reqs = requests.filter(r => {
      const svc = svcMap.get(r.service_id);
      if (!svc?.provider_user_id || !sellerIds.has(svc.provider_user_id)) return false;
      if (dateFrom && dateTo) return isWithinInterval(new Date(r.created_at), { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
      return true;
    });
    const amount = (r: any) => Number(r.total_amount ?? r.quoted_amount ?? 0);
    const completed = reqs.filter(r => r.status === "completed");
    const revenue = completed.reduce((s, r) => s + amount(r), 0);

    const statusMap: Record<string, number> = {};
    reqs.forEach(r => { statusMap[r.status] = (statusMap[r.status] || 0) + 1; });
    const statusData = Object.entries(statusMap).map(([k, v]) => ({ name: statusLabel(k), value: v }));

    const catName = new Map(categories.map(c => [c.id, c.name]));
    const catAgg: Record<string, { name: string; requests: number; revenue: number }> = {};
    reqs.forEach(r => {
      const n = catName.get(svcMap.get(r.service_id)?.category_id) || "Uncategorized";
      catAgg[n] ??= { name: n, requests: 0, revenue: 0 };
      catAgg[n].requests++;
      if (r.status === "completed") catAgg[n].revenue += amount(r);
    });

    const sellerRows = scopedSellers.map(s => {
      const mine = reqs.filter(r => svcMap.get(r.service_id)?.provider_user_id === s.user_id);
      const done = mine.filter(r => r.status === "completed");
      return {
        id: s.user_id, name: s.full_name || "Unnamed", mobile: s.mobile_number || "—", approved: s.is_approved,
        services: scopedServices.filter(x => x.provider_user_id === s.user_id).length,
        areas: areas.filter(a => a.seller_user_id === s.user_id).length,
        requests: mine.length, completed: done.length,
        cancelled: mine.filter(r => r.status === "cancelled").length,
        revenue: done.reduce((t, r) => t + amount(r), 0),
      };
    }).sort((a, b) => b.revenue - a.revenue || b.requests - a.requests);

    return {
      scopedSellers, scopedServices, reqs, completed, revenue, statusData, sellerRows,
      catData: Object.values(catAgg).sort((a, b) => b.requests - a.requests),
      cancelled: reqs.filter(r => r.status === "cancelled").length,
      svcMap,
    };
  }, [sellers, services, requests, categories, areas, dateFrom, dateTo, localBodyIds]);

  if (loading) return <p className="py-8 text-center text-muted-foreground animate-pulse">Loading utility analytics…</p>;

  const rate = data.reqs.length ? ((data.completed.length / data.reqs.length) * 100).toFixed(1) : "0";
  const nameOf = (serviceId: string) => {
    const uid = data.svcMap.get(serviceId)?.provider_user_id;
    return sellers.find(s => s.user_id === uid)?.full_name || "—";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Utility Sellers" value={String(data.scopedSellers.length)} sub={`${data.scopedSellers.filter(s => s.is_approved).length} approved`} icon={Users} />
        <Stat label="Services Listed" value={String(data.scopedServices.length)} sub={`${data.scopedServices.filter(s => s.is_active).length} active`} icon={Wrench} />
        <Stat label="Bookings" value={String(data.reqs.length)} sub={`${data.cancelled} cancelled`} icon={ClipboardList} />
        <Stat label="Completion Rate" value={`${rate}%`} sub={`${data.completed.length} completed`} icon={CheckCircle} />
        <Stat label="Completed Value" value={fmt(data.revenue)} sub={data.completed.length ? `avg ${fmt(data.revenue / data.completed.length)}` : undefined} icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Bookings by Status</CardTitle></CardHeader>
          <CardContent className="h-64">
            {data.statusData.length === 0 ? <p className="py-10 text-center text-muted-foreground">No bookings</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" name="Bookings" fill="hsl(var(--primary))" /></BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bookings by Category</CardTitle></CardHeader>
          <CardContent className="h-64">
            {data.catData.length === 0 ? <p className="py-10 text-center text-muted-foreground">No bookings</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.catData.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="requests" name="Bookings" fill="hsl(var(--primary))" /></BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Utility Seller Performance</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Seller</TableHead><TableHead>Mobile</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Services</TableHead><TableHead className="text-right">Areas</TableHead>
              <TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Cancelled</TableHead><TableHead className="text-right">Value</TableHead>
            </TableRow></TableHeader>
            <PagedTableBody>
              {data.sellerRows.length === 0 ? <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">No utility sellers</TableCell></TableRow> :
                data.sellerRows.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.mobile}</TableCell>
                    <TableCell><Badge variant={s.approved ? "default" : "secondary"}>{s.approved ? "Approved" : "Pending"}</Badge></TableCell>
                    <TableCell className="text-right">{s.services}</TableCell><TableCell className="text-right">{s.areas}</TableCell>
                    <TableCell className="text-right">{s.requests}</TableCell><TableCell className="text-right">{s.completed}</TableCell>
                    <TableCell className="text-right">{s.cancelled}</TableCell><TableCell className="text-right font-semibold">{fmt(s.revenue)}</TableCell>
                  </TableRow>
                ))}
            </PagedTableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Bookings</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Service</TableHead><TableHead>Seller</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <PagedTableBody>
              {data.reqs.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.created_at), "dd MMM yy")}</TableCell>
                  <TableCell>{r.contact_name}</TableCell>
                  <TableCell>{data.svcMap.get(r.service_id)?.name || "—"}</TableCell>
                  <TableCell>{nameOf(r.service_id)}</TableCell>
                  <TableCell><Badge variant={r.status === "completed" ? "default" : r.status === "cancelled" ? "destructive" : "secondary"}>{statusLabel(r.status)}</Badge></TableCell>
                  <TableCell className="text-right">{fmt(Number(r.total_amount ?? r.quoted_amount ?? 0))}</TableCell>
                </TableRow>
              ))}
              {data.reqs.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No bookings in this period</TableCell></TableRow>}
            </PagedTableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UtilitySellerAnalytics;
