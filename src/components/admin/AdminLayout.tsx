import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Star, ShieldCheck, LogOut, Menu, CreditCard, Truck, Tag,
  BarChart3, LayoutDashboard, ClipboardList, Store, PenTool, Radio,
  ChevronLeft, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    title: "Análises",
    items: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
      { label: "Live View", path: "/admin/live-view", icon: Radio },
    ],
  },
  {
    title: "Vendas",
    items: [
      { label: "Pedidos", path: "/admin/orders", icon: ClipboardList },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { label: "Produtos", path: "/admin/products", icon: Package },
      { label: "Avaliações", path: "/admin/reviews", icon: Star },
      { label: "Badges", path: "/admin/badges", icon: ShieldCheck },
      { label: "Lojas", path: "/admin/stores", icon: Store },
    ],
  },
  {
    title: "Checkout",
    items: [
      { label: "Builder", path: "/admin/checkout-builder", icon: PenTool },
      { label: "Gateways", path: "/admin/gateways", icon: CreditCard },
      { label: "Fretes", path: "/admin/shipping", icon: Truck },
      { label: "Order Bumps", path: "/admin/order-bumps", icon: Tag },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Pixels", path: "/admin/pixels", icon: BarChart3 },
    ],
  },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/admin/login");
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/admin/login");
    });

    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0a1e]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          {sidebarOpen && <span className="text-white font-bold text-lg">Admin</span>}
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex text-white/50 hover:text-white transition-colors"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.title}>
            {sidebarOpen && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive(item.path)
                      ? "bg-purple-600/30 text-purple-300 shadow-[inset_0_1px_0_rgba(168,85,247,0.3)]"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 shrink-0", isActive(item.path) && "text-purple-400")} />
                  {sidebarOpen && <span>{item.label}</span>}
                  {item.label === "Live View" && sidebarOpen && (
                    <span className="ml-auto flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Ver loja</span>}
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0a1e] flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-0 left-0 h-screen bg-[#150e2b] border-r border-white/[0.06] z-50 transition-all duration-300",
          sidebarOpen ? "w-56" : "w-16"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-56 bg-[#150e2b] border-r border-white/[0.06] z-50 transition-transform duration-300 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "md:ml-56" : "md:ml-16")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-[#0f0a1e]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 gap-3">
          <button className="md:hidden text-white/60 hover:text-white" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">AD</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
