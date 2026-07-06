import PrismNavbar from '@/components/prism/PrismNavbar';
import PrismSidebar from '@/components/prism/PrismSidebar';
import '../prism.css';

export default function PrismGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="prism-shell">
      <PrismNavbar />
      <div className="prism-body">
        <PrismSidebar />
        <main className="prism-content-area">{children}</main>
      </div>
    </div>
  );
}
