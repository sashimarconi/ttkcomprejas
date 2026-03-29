import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, Star, Settings, ShieldCheck, LogOut, Menu, X, CreditCard, Truck, Tag, ShoppingBag, BarChart3, LayoutDashboard, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Pedidos", path: "/admin/orders", icon: ClipboardList },
  { label: "Produtos", path: "/admin/products", icon: Package },
  { label: "Avaliações", path: "/admin/reviews", icon: Star },
  { label: "Badges", path: "/admin/badges", icon: ShieldCheck },
  { label: "Loja", path: "/admin/settings", icon: Settings },
  { label: "Gateways", path: "/admin/gateways", icon: CreditCard },
  { label: "Fretes", path: "/admin/shipping", icon: Truck },
  { label: "Bumps", path: "/admin/order-bumps", icon: Tag },
  { label: "Checkout", path: "/admin/checkout", icon: ShoppingBag },
  { label: "Pixels", path: "/admin/pixels", icon: BarChart3 },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
      }
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
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Carregando...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/admin" className="text-base font-bold text-foreground">Admin</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Ver loja →</Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex max-w-6xl mx-auto px-4 gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t transition-colors ${
                location.pathname === item.path
                  ? "text-marketplace-red border-b-2 border-marketplace-red"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border p-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg ${
                  location.pathname === item.path
                    ? "bg-marketplace-red/10 text-marketplace-red font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
