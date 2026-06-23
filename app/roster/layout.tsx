import SiteChrome from "@/components/SiteChrome";

export default function RosterLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome>
      {children}
    </SiteChrome>
  );
}
