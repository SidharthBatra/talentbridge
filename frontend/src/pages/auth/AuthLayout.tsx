import type { ReactNode } from 'react';
import { Icon } from '../../components/ui/Icon';

/**
 * Two-column auth shell (value proposition + form card), matching the
 * Stitch login_talentbridge / register_talentbridge reference layout.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-md md:p-margin-desktop relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-surface-container rounded-full blur-[120px] opacity-60" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[40%] h-[40%] bg-primary-fixed-dim rounded-full blur-[100px] opacity-30" />
      </div>

      <main className="relative z-10 w-full max-w-[1100px] flex flex-col md:flex-row min-h-[600px] bg-surface-container-lowest rounded-xl shadow-tonal-lg overflow-hidden border border-outline-variant">
        <section className="hidden md:flex flex-1 flex-col justify-between p-xl bg-primary relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-xs mb-xl">
              <div className="w-10 h-10 bg-on-primary flex items-center justify-center rounded-lg">
                <Icon name="badge" className="text-primary" size={24} />
              </div>
              <span className="text-on-primary font-headline-lg text-headline-lg tracking-tight">
                TalentBridge
              </span>
            </div>
            <div className="max-w-[28rem] mt-lg">
              <h1 className="text-on-primary font-display-lg text-[36px] leading-tight mb-md">
                The future of hiring is <span className="text-secondary-fixed">intelligent.</span>
              </h1>
              <p className="text-primary-fixed-dim text-body-lg mb-xl opacity-90">
                AI-augmented job descriptions, CV screening, and interview prep —
                a high-efficiency recruitment ecosystem for candidates, recruiters,
                hiring managers, and admins alike.
              </p>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-md">
            <div className="flex flex-col p-md bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
              <Icon name="verified" className="text-secondary-fixed mb-xs" />
              <span className="text-on-primary text-title-md font-title-md">AI-Scored</span>
              <span className="text-primary-fixed-dim text-label-sm">Precision in sourcing</span>
            </div>
            <div className="flex flex-col p-md bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
              <Icon name="speed" className="text-secondary-fixed mb-xs" />
              <span className="text-on-primary text-title-md font-title-md">Real-time</span>
              <span className="text-primary-fixed-dim text-label-sm">Live pipeline updates</span>
            </div>
          </div>
        </section>

        <section className="flex-1 flex flex-col justify-center items-center p-xl">
          <div className="md:hidden flex flex-col items-center mb-xl w-full">
            <div className="w-12 h-12 bg-primary flex items-center justify-center rounded-xl mb-md">
              <Icon name="badge" className="text-on-primary" size={28} />
            </div>
            <h2 className="text-primary text-headline-lg-mobile font-headline-lg-mobile">
              TalentBridge
            </h2>
          </div>
          <div className="w-full max-w-[24rem]">
            <header className="mb-xl text-center md:text-left">
              <h2 className="text-on-surface font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-xs">
                {title}
              </h2>
              <p className="text-on-surface-variant text-body-md">{subtitle}</p>
            </header>
            {children}
            <footer className="mt-xl text-center">{footer}</footer>
          </div>
        </section>
      </main>
    </div>
  );
}
