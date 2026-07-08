import Link from 'next/link';

const navItems = [
  ['/', '운영 대시보드'],
  ['/rule-studio', 'Rule Studio'],
  ['/catalog-import', 'Catalog Import'],
  ['/pipeline', 'E2E Pipeline'],
];

export function AppShell({
  children,
  title,
  eyebrow,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="appFrame">
      <aside className="sidebar">
        <div className="brandMark">HV</div>
        <div className="brandCopy">
          <strong>AI HVAC</strong>
          <span>Engineering OS</span>
        </div>
        <nav>
          {navItems.map(([href, label]) => (
            <Link key={href} href={href} className="navLink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="sideFoot">
          <span>Production Baseline</span>
          <strong>v1.0</strong>
        </div>
      </aside>
      <main className="mainCanvas">
        <header className="pageHeader">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="liveBadge"><i /> SYSTEM READY</div>
        </header>
        {children}
      </main>
    </div>
  );
}
