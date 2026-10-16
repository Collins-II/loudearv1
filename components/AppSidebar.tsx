"use client";

import {
 // Home,
  Plus,
  Music2,
  Disc3,
  Video,
  Music3Icon,
  DollarSign,
  Wallet2,
  TrendingUpDown,
  UserRound,
  TrendingUp,
  BarChart3,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  //SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  //SidebarSeparator,
} from "./ui/sidebar";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "next-auth/react";
import { NavUser } from "./nav-user";
import { TbMoneybag } from "react-icons/tb";
//import Image from "next/image";

const items = [
  {
    title: "Analytics",
    url: "/studio/dashboard/admin/analytics",
    icon: TrendingUp,
  },
  {
    title: "Charts",
    url: "/charts",
    icon: BarChart3,
  },
  {
    title: "Monetization",
    url: "/studio/dashboard/admin/monetization",
    icon: DollarSign,
  },
  {
    title: "Wallet",
    url: "/studio/dashboard/admin/wallet",
    icon: Wallet2,
  },
  {
    title: "Royalties",
    url: "/studio/dashboard/admin/royalty-splits",
    icon: TbMoneybag,
  },
    {
    title: "Marketing",
    url: "/studio/dashboard/admin/marketing",
    icon: TrendingUpDown,
  },
    {
      title: "Profile",
      url: "/studio/dashboard/profile/edit",
      icon: UserRound,
    },
];

const AppSidebar = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user;
  const isActive = (url: string) =>
    url === "/studio/dashboard"
      ? pathname === url
      : pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar collapsible="icon" className="top-16 h-[calc(100svh-4rem)]">
      
      {/* HEADER 
      <SidebarHeader className="px-4 pb-4 pt-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/studio/dashboard")}>
              <Link
                href="/studio/dashboard"
                className="data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <div className="flex w-full justify-center text-center leading-tight">
                  <Image
                    src="/assets/logo/logo-blu.jpg"
                    alt="Loudear-Logo"
                    width={40}
                    height={40}
                    className="rounded-full object-cover shadow-2xl"
                  />
                  <span className="uppercase text-bold">Studio</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator /> 

      {/* BODY */}
      <SidebarContent>

        {/* MAIN */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SONGS */}
        {user?.role === "artist" && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Songs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/studio/dashboard/admin/songs")}>
                  <Link href="/studio/dashboard/admin/songs">
                    <Music2 />
                    <span>All Songs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/studio/dashboard/upload/song")}>
                  <Link href="/studio/dashboard/upload/song">
                    <Plus />
                    <span>Upload Song</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}
        {/* BEATS */}
        {user?.role === "producer" && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Beats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/studio/dashboard/admin/beats")}>
                  <Link href="/studio/dashboard/admin/beats">
                    <Music3Icon />
                    <span>All Beats</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/studio/dashboard/upload/beat")}>
                  <Link href="/studio/dashboard/upload/beat">
                    <Plus />
                    <span>Upload Beat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* ALBUMS */}
        {user?.role === "artist" && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Albums & EPs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/studio/dashboard/admin/albums")}>
                  <Link href="/studio/dashboard/admin/albums">
                    <Disc3 />
                    <span>All Albums</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/studio/dashboard/upload/album")}>
                  <Link href="/studio/dashboard/upload/album">
                    <Plus />
                    <span>Upload Album</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* VIDEOS */}
        {user?.role === "artist" && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Videos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/studio/dashboard/admin/videos")}>
                  <Link href="/studio/dashboard/admin/videos">
                    <Video />
                    <span>All Videos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/studio/dashboard/upload/video")}>
                  <Link href="/studio/dashboard/upload/video">
                    <Plus />
                    <span>Upload Video</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

      </SidebarContent>

        {/* Footer */}
        {user && (
         <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        )} 
    </Sidebar>
  );
};

export default AppSidebar;
