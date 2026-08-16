"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import BrandMark from "@/components/BrandMark";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/size-guides", label: "Size Guides" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/newsletter", label: "Newsletter" },
  { href: "/admin/admins", label: "Admin users" },
];

export default function AdminSidebar({
  adminName,
  adminEmail,
  brandName,
  logoUrl,
}: {
  adminName: string;
  adminEmail: string;
  brandName: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Navigating (via the browser back/forward buttons, or a link that
  // doesn't happen to unmount this component) shouldn't leave the mobile
  // drawer stuck open on the new page. Adjusting state directly during
  // render (React's recommended pattern for "reset state when a prop
  // changes") instead of a useEffect avoids an extra commit-then-effect
  // round trip — React detects the state update mid-render and re-renders
  // before painting, rather than committing the stale UI first.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className={`admin-sidebar no-print ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="admin-sidebar-topline">
        <button
          className="admin-menu-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle admin menu"
          aria-expanded={mobileOpen}
        >
          ☰
        </button>
        <div className="admin-sidebar-brand">
          <BrandMark logoUrl={logoUrl} alt={brandName} />
          <div className="admin-sidebar-tag">Back office</div>
        </div>
      </div>
      <nav className="admin-nav">
        {NAV.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""}>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="admin-sidebar-foot">
        <div className="who">
          {adminName}
          <br />
          {adminEmail}
        </div>
        <button className="admin-logout-btn" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
