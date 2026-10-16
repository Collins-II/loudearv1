import type { Metadata } from "next";
import "../../../globals.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Artist - Portal",
  description: "Artist Portal Dashboard",
};

export default async function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.isNewUser) {
    redirect(`/auth/register?callbackUrl=${encodeURIComponent("/studio/dashboard")}`);
  }

  if (user.role !== "artist" && user.role !== "producer") {
    redirect("/");
  }

  // Sidebar preference
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // Read theme cookie from next-themes (optional)
  const theme = cookieStore.get("theme")?.value || "system";

  return (
    <div
      className={cn(
        "min-h-screen flex",
        // theme applied via next-themes; server fallback helps avoid flash
        theme === "dark" && "dark bg-background text-foreground",
        theme === "light" && "bg-background text-foreground"
      )}
    >
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={
          {
            "--sidebar-width": "16rem",
            "--header-height": "3.5rem",
          } as React.CSSProperties
        }
      >
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <SidebarInset className="flex min-h-[calc(100svh-4rem)] flex-col border-0 bg-background transition-colors">
          <SiteHeader />

          <main className="flex-1 overflow-y-auto bg-background px-4 py-6 text-foreground sm:px-6 lg:px-9 lg:py-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
