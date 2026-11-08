import {
  LayoutDashboard, Users, ShieldCheck, Package, ShoppingCart, Image, Settings, Grid3X3, Wrench, Hammer,
  MapPin, Warehouse, ClipboardList, Truck, Store, Star, SlidersHorizontal, BarChart3, Wallet, Handshake,
  Percent, Bot, Bell, BellRing, Gift, Palette, UserX, UsersRound, Boxes, FileBarChart, LineChart, HardDrive,
  Megaphone, Landmark, PackageSearch, type LucideIcon,
} from "lucide-react";

export interface AdminNavItem { label: string; icon: LucideIcon; path: string; perm: string | null; superOnly?: boolean }
export interface AdminNavGroup { id: string; label: string; icon: LucideIcon; items: AdminNavItem[] }

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin", perm: null },
  ] },
  { id: "people", label: "People & Access", icon: Users, items: [
    { label: "Users", icon: Users, path: "/admin/users", perm: "read_users" },
    { label: "Deletion Requests", icon: UserX, path: "/admin/deletion-requests", perm: "read_users" },
    { label: "Roles & Permissions", icon: ShieldCheck, path: "/admin/roles", perm: null, superOnly: true },
    { label: "Communities", icon: UsersRound, path: "/admin/communities", perm: "read_users" },
  ] },
  { id: "catalogue", label: "Products & Catalogue", icon: Package, items: [
    { label: "Categories", icon: Grid3X3, path: "/admin/categories", perm: "read_categories" },
    { label: "Products", icon: Package, path: "/admin/products", perm: "read_products" },
    { label: "Combo Offers", icon: Boxes, path: "/admin/combos", perm: "read_products" },
    { label: "Offers & Features", icon: Star, path: "/admin/offers", perm: "read_offers" },
    { label: "Banners", icon: Image, path: "/admin/banners", perm: "read_banners" },
    { label: "Theme Studio", icon: Palette, path: "/admin/themes", perm: "read_settings" },
  ] },
  { id: "sales", label: "Sales & Orders", icon: ShoppingCart, items: [
    { label: "Orders", icon: ShoppingCart, path: "/admin/orders", perm: "read_orders" },
    { label: "Sales Report", icon: LineChart, path: "/admin/sales-report", perm: "read_reports" },
    { label: "Reports", icon: FileBarChart, path: "/admin/reports", perm: "read_reports" },
  ] },
  { id: "inventory", label: "Inventory & Procurement", icon: Warehouse, items: [
    { label: "Locations", icon: MapPin, path: "/admin/locations", perm: "read_locations" },
    { label: "Godowns", icon: Warehouse, path: "/admin/godowns", perm: "read_godowns" },
    { label: "Purchase", icon: ClipboardList, path: "/admin/purchase", perm: "create_stock" },
    { label: "Stock Control", icon: PackageSearch, path: "/admin/stock-control", perm: "read_stock" },
  ] },
  { id: "partners", label: "Partners & Services", icon: Handshake, items: [
    { label: "Selling Partners", icon: Store, path: "/admin/sellers", perm: "read_selling_partners" },
    { label: "Delivery Staff", icon: Truck, path: "/admin/delivery", perm: "read_delivery_staff" },
    { label: "Services", icon: Wrench, path: "/admin/services", perm: "read_services" },
    { label: "Utility Services", icon: Hammer, path: "/admin/utility-services", perm: "read_services" },
    { label: "Penny Prime", icon: Handshake, path: "/admin/penny-prime", perm: "read_penny_prime" },
  ] },
  { id: "finance", label: "Finance & Accounts", icon: Landmark, items: [
    { label: "Wallets", icon: Wallet, path: "/admin/wallets", perm: "read_wallets" },
    { label: "Platform Margin", icon: Percent, path: "/admin/platform-margin", perm: "read_products" },
  ] },
  { id: "marketing", label: "Marketing & Engagement", icon: Megaphone, items: [
    { label: "Scratch & Win", icon: Gift, path: "/admin/scratch-rewards", perm: "read_settings" },
    { label: "Internal Notifications", icon: Bell, path: "/admin/notifications", perm: "read_settings" },
    { label: "Push Notifications", icon: BellRing, path: "/admin/push-notifications", perm: "read_settings" },
  ] },
  { id: "ai", label: "AI & Communication", icon: Bot, items: [
    { label: "Chatbot Settings", icon: Bot, path: "/admin/chatbot", perm: "read_settings" },
  ] },
  { id: "settings", label: "Platform Settings", icon: Settings, items: [
    { label: "App Settings", icon: SlidersHorizontal, path: "/admin/settings", perm: "read_settings" },
    { label: "Storage Config", icon: HardDrive, path: "/admin/storage", perm: null, superOnly: true },
  ] },
];

export const ALL_ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
void BarChart3;

/** Keep only items the admin may open; drop groups that end up empty. */
export function visibleAdminNavGroups(
  groups: AdminNavGroup[], hasPermission: (p: string) => boolean, isSuperAdmin: boolean,
): AdminNavGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => (i.superOnly ? isSuperAdmin : i.perm ? hasPermission(i.perm) : true)) }))
    .filter((g) => g.items.length > 0);
}

/** Match a query against group names and item names. A group-name match keeps all its items. */
export function searchAdminNavGroups(groups: AdminNavGroup[], query: string): AdminNavGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => (g.label.toLowerCase().includes(q) ? g : { ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length > 0);
}
