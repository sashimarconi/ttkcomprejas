import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Star, ShieldCheck, LogOut, Menu, CreditCard, Truck, Tag,
  BarChart3, LayoutDashboard, ClipboardList, Store, PenTool, Radio,
  ChevronLeft, ExternalLink, Sun, Moon, ShoppingCart
} from "lucide-react";
import { cn } from "@/lib/utils";
import SaleNotification from "@/components/admin/SaleNotification";

const navSections = [
  {
    title: "Análises",
    items: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
      { label: "Live View", path: "/admin/live-view", icon: Radio },
      { label: "Análises", path: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Vendas",
    items: [
      { label: "Pedidos", path: "/admin/orders", icon: ClipboardList },
      { label: "Carrinhos Abandonados", path: "/admin/abandoned-carts", icon: ShoppingCart },
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
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin-theme") !== "light";
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("admin-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("admin-theme", "light");
    }
    return () => {
      root.classList.remove("dark");
    };
  }, [isDark]);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          {sidebarOpen && <span className="text-foreground font-bold text-lg">Admin</span>}
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.title}>
            {sidebarOpen && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 shrink-0", isActive(item.path) && "text-primary")} />
                  {sidebarOpen && <span>{item.label}</span>}
                  {item.label === "Live View" && sidebarOpen && (
                    <span className="ml-auto flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-marketplace-green opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-marketplace-green" />
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Ver loja</span>}
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-0 left-0 h-screen bg-card border-r border-border z-50 transition-all duration-300",
          sidebarOpen ? "w-56" : "w-16"
        )}
      >
        <SidebarContent />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-56 bg-card border-r border-border z-50 transition-transform duration-300 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "md:ml-56" : "md:ml-16")}>
        <header className="sticky top-0 z-30 h-14 bg-card/80 backdrop-blur-xl border-b border-border flex items-center px-4 gap-3">
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors"
              title={isDark ? "Modo claro" : "Modo escuro"}
            >
              <Sun className={cn("w-4 h-4 transition-colors", !isDark ? "text-marketplace-yellow" : "text-muted-foreground")} />
              <div className={cn("w-8 h-4 rounded-full transition-colors relative", isDark ? "bg-primary" : "bg-muted-foreground/30")}>
                <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-primary-foreground transition-transform", isDark ? "translate-x-4" : "translate-x-0.5")} />
              </div>
              <Moon className={cn("w-4 h-4 transition-colors", isDark ? "text-primary" : "text-muted-foreground")} />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">AD</span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <SaleNotification />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
