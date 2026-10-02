"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  History,
  LayoutDashboard,
  Megaphone,
  Siren,
  UsersRound,
  LogOut, // Added logout icon
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/client"; // Replace with your actual Supabase client path
import styles from "./OperatorSidebar.module.css";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: "Manage",
    items: [
      { label: "Overview", href: "/operator/dashboard", icon: LayoutDashboard },
      { label: "Emergencies", href: "/operator/emergency-requests", icon: Siren },
      { label: "History", href: "/operator/history", icon: History },
      { label: "Analytics", href: "/operator/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Pending",
    items: [
      {
        label: "Registered Residents",
        href: "/operator/pending-residents",
        icon: UsersRound,
      },
    ],
  },
  {
    label: "Tool",
    items: [
      {
        label: "Announcements",
        href: "/operator/announcements",
        icon: Megaphone,
      },
    ],
  },
];

export default function OperatorSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient(); // Initialize Supabase client

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Refresh and redirect to the operator login page
      router.refresh();
      router.push("/operator/login");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  const isStandalonePage =
    pathname === "/operator/login" || pathname.startsWith("/operator/call/");

  if (isStandalonePage) return children;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <Link className={styles.brand} href="/operator/dashboard">
            <Image
              className={styles.logo}
              src="/icon_bgl.png"
              alt="Barangay Greater Lagro seal"
              width={72}
              height={72}
              priority
            />
            <span className={styles.brandName}>Rapid Response Dashboard</span>
          </Link>

          <nav className={styles.navigation} aria-label="Operator navigation">
            {navigationGroups.map((group) => (
              <section className={styles.group} key={group.label}>
                <h2 className={styles.groupLabel}>{group.label}</h2>
                <ul className={styles.itemList}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          aria-current={isActive ? "page" : undefined}
                          className={`${styles.item} ${
                            isActive ? styles.active : ""
                          }`}
                          href={item.href}
                        >
                          <Icon className={styles.icon} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>
        </div>

        {/* Footer actions containing the Logout button */}
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <LogOut className={styles.icon} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}