import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { LogOut, ChevronLeft, ChevronDown, Settings, Menu, Search, Star, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdminPendingOrdersNotification from "./AdminPendingOrdersNotification";
import { ADMIN_NAV_GROUPS, AdminNavItem, searchAdminNavGroups, visibleAdminNavGroups } from "@/lib/adminNav";

const OPEN_KEY = "pk_admin_nav_open";
const COLLAPSED_KEY = "pk_admin_nav_collapsed";
const favKey = (uid?: string) => `pk_admin_nav_favs_${uid ?? "anon"}`;

const readJson = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { signOut, profile, user } = useAuth() as any;
  const { hasPermission, isSuperAdmin } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => readJson(COLLAPSED_KEY, false));
  const [openGroups, setOpenGroups] = useState<string[]>(() => readJson(OPEN_KEY, [] as string[]));
  const [query, setQuery] = useState("");
  const uid: string | undefined = user?.id ?? profile?.user_id;
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => { setFavs(readJson(favKey(uid), [] as string[])); }, [uid]);
  useEffect(() => { localStorage.setItem(OPEN_KEY, JSON.stringify(openGroups)); }, [openGroups]);
  useEffect(() => { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed)); }, [collapsed]);

  const groups = useMemo(() => visibleAdminNavGroups(ADMIN_NAV_GROUPS, hasPermission, isSuperAdmin), [hasPermission, isSuperAdmin]);
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeGroupId = groups.find((g) => g.items.some((i) => i.path === location.pathname))?.id;

  // Keep the category of the current page expanded.
  useEffect(() => {
    if (activeGroupId) setOpenGroups((prev) => (prev.includes(activeGroupId) ? prev : [...prev, activeGroupId]));
  }, [activeGroupId]);

  const toggleGroup = (id: string) => setOpenGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  const toggleFav = (path: string) => {
    const next = favs.includes(path) ? favs.filter((p) => p !== path) : [...favs, path];
    setFavs(next);
    localStorage.setItem(favKey(uid), JSON.stringify(next));
  };

  const searching = query.trim().length > 0;
  const shownGroups = searchAdminNavGroups(groups, query);
  const favItems = favs.map((p) => allItems.find((i) => i.path === p)).filter(Boolean) as AdminNavItem[];
  const currentPageLabel = allItems.find((i) => i.path === location.pathname)?.label ?? "Admin";

  const onPick = (item: AdminNavItem, closeMobile?: boolean) => {
    const g = groups.find((gr) => gr.items.some((i) => i.path === item.path));
    if (g) setOpenGroups((prev) => (prev.includes(g.id) ? prev : [...prev, g.id]));
    if (searching) setQuery("");
    if (closeMobile) setMobileOpen(false);
  };

  const ItemLink = ({ item, mini, closeMobile }: { item: AdminNavItem; mini?: boolean; closeMobile?: boolean }) => {
    const active = location.pathname === item.path;
    const isFav = favs.includes(item.path);
    const link = (
      <Link
        to={item.path}
        onClick={() => onPick(item, closeMobile)}
        className={`group/item flex items-center gap-3 rounded-md text-sm transition-colors ${mini ? "h-9 w-9 justify-center" : "px-3 py-2"} ${
          active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!mini && <span className="flex-1 truncate">{item.label}</span>}
        {!mini && (
          <button
            type="button"
            aria-label={isFav ? `Remove ${item.label} from favorites` : `Add ${item.label} to favorites`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(item.path); }}
            className={`rounded p-0.5 transition-opacity ${isFav ? "opacity-100" : "opacity-0 group-hover/item:opacity-100 focus:opacity-100"}`}
          >
            <Star className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
          </button>
        )}
      </Link>
    );
    if (!mini) return link;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  const NavBody = ({ mini, closeMobile }: { mini?: boolean; closeMobile?: boolean }) => {
    if (mini) {
      return (
        <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-3">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col items-center gap-1 border-b pb-3 last:border-0">
              {g.items.map((i) => <ItemLink key={i.path} item={i} mini />)}
            </div>
          ))}
        </nav>
      );
    }
    return (
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {!searching && favItems.length > 0 && (
          <div className="mb-3 border-b pb-3">
            <p className="mb-1 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Star className="h-3 w-3" /> Quick Access
            </p>
            <div className="space-y-0.5">{favItems.map((i) => <ItemLink key={i.path} item={i} closeMobile={closeMobile} />)}</div>
          </div>
        )}
        {shownGroups.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No menu items found</p>}
        <div className="space-y-1">
          {shownGroups.map((g) => {
            const open = searching || openGroups.includes(g.id);
            const hasActive = g.id === activeGroupId;
            return (
              <div key={g.id} className="border-b border-border/60 pb-1 last:border-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  aria-expanded={open}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-muted ${hasActive ? "text-primary" : "text-foreground"}`}
                >
                  <g.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{g.label}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="ml-4 space-y-0.5 border-l pl-2 pb-1">
                    {g.items.map((i) => <ItemLink key={i.path} item={i} closeMobile={closeMobile} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    );
  };

  const SearchBox = () => (
    <div className="relative px-3 pt-3">
      <Search className="absolute left-6 top-1/2 mt-1.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search menu..."
        className="h-9 pl-9 pr-8"
        aria-label="Search admin menu"
      />
      {searching && (
        <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-5 top-1/2 mt-1.5 -translate-y-1/2 text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const Footer = ({ mini, closeMobile }: { mini?: boolean; closeMobile?: boolean }) => (
    <div className="border-t p-3">
      {!mini && <p className="mb-2 truncate text-xs text-muted-foreground">{profile?.email}</p>}
      <div className={`flex gap-2 ${mini ? "flex-col items-center" : ""}`}>
        <Button variant="outline" size="sm" className={mini ? "h-9 w-9 p-0" : "flex-1"} onClick={() => { navigate("/"); if (closeMobile) setMobileOpen(false); }} aria-label="Back to store">
          <ChevronLeft className="h-3 w-3" />{!mini && <span className="ml-1">Store</span>}
        </Button>
        <Button variant="outline" size="sm" className={mini ? "h-9 w-9 p-0" : ""} onClick={signOut} aria-label="Sign out">
          <LogOut className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen w-full bg-muted/40">
        {/* Desktop sidebar */}
        <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-200 lg:flex ${collapsed ? "w-[72px]" : "w-[264px]"}`}>
          <div className={`flex h-16 items-center border-b ${collapsed ? "justify-center" : "justify-between px-4"}`}>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold">Admin Panel</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          {!collapsed && <SearchBox />}
          <NavBody mini={collapsed} />
          <Footer mini={collapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[290px] flex-col p-0">
                <div className="flex h-14 items-center gap-2 border-b px-5">
                  <Settings className="h-5 w-5 text-primary" />
                  <span className="text-base font-bold">Admin Panel</span>
                </div>
                <SearchBox />
                <NavBody closeMobile />
                <Footer closeMobile />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold">{currentPageLabel}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back to store"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>

        <AdminPendingOrdersNotification />
      </div>
    </TooltipProvider>
  );
};

export default AdminLayout;
