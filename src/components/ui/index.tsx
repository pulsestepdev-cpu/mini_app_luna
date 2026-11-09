import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { haptic } from '@/utils/feedback';

/* ---------- Card ---------- */
export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick && (() => { haptic.tap(); onClick(); })} className={cn('glass block w-full p-4 text-left', onClick && 'tap', className)}>
      {children}
    </Comp>
  );
}

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'soft' | 'light' | 'ghost' | 'danger';
export function Button({
  variant = 'primary',
  className,
  children,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-button',
    soft: 'bg-plum-200/70 text-plum-800',
    // только на тёмных экранах (приветствие, успех) — цвета фиксированные
    light: 'bg-gradient-to-b from-white to-[#EFE5F9] text-brand-800 shadow-soft',
    ghost: 'bg-surface/60 text-plum-700 border border-edge/80',
    danger: 'bg-rose-100 text-rose-600',
  };
  return (
    <button
      {...rest}
      onClick={(e) => {
        haptic.tap(variant === 'primary' ? 'medium' : 'light');
        onClick?.(e);
      }}
      className={cn(
        'tap flex h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold disabled:opacity-50',
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Toggle ---------- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic.select();
        onChange(!checked);
      }}
      className={cn(
        'relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-gradient-to-r from-brand-500 to-brand-600' : 'bg-plum-100 ring-1 ring-inset ring-plum-200/60',
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-all duration-200',
          checked ? 'left-[25px]' : 'left-[3px]',
        )}
      />
    </button>
  );
}

/* ---------- Chip ---------- */
export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      onClick={
        onClick &&
        (() => {
          haptic.select();
          onClick();
        })
      }
      className={cn(
        'tap rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors',
        active
          ? 'bg-brand-600 text-white shadow-soft'
          : 'border border-edge/80 bg-surface/70 text-ink-soft shadow-[0_2px_8px_-4px_rgba(110,70,170,0.25)]',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Segmented (1 мес / 3 мес …) ---------- */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => {
            if (o.value !== value) haptic.select();
            onChange(o.value);
          }}
          className={cn(
            'tap flex-1 rounded-full py-2 text-[13px] font-medium transition-colors',
            value === o.value ? 'border border-plum-300 bg-surface text-ink shadow-soft' : 'text-ink-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- ProgressRing ---------- */
export function ProgressRing({ value, size = 96, stroke = 7, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, value));
  // Кольцо заполняется с нуля при появлении
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9AEE8" />
            <stop offset="100%" stopColor="#7448B1" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--plum-100))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-[14%] flex items-center justify-center rounded-full bg-gradient-to-br from-surface to-plum-50 shadow-inner">
        {children}
      </div>
    </div>
  );
}

/* ---------- Bottom Sheet ---------- */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 animate-fadeIn bg-brand-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[440px] animate-sheetUp rounded-t-4xl bg-sheet px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-plum-200" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-[18px] font-bold text-ink">{title}</div>
          <button onClick={onClose} className="tap rounded-full bg-plum-100 p-2 text-plum-700" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto scrollbar-none">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Page header ---------- */
export function PageHeader({ title, back, right }: { title: ReactNode; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="flex items-center gap-2 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+20px)]">
      {back && (
        <button onClick={() => { haptic.tap(); nav(-1); }} className="tap -ml-2 rounded-full p-1.5 text-ink" aria-label="Назад">
          <ChevronLeft size={26} />
        </button>
      )}
      <h1 className="h-title flex-1">{title}</h1>
      {right}
    </header>
  );
}

/* ---------- List row ---------- */
export function ListRow({ icon, label, value, onClick, danger }: { icon?: ReactNode; label: string; value?: ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick && (() => { haptic.tap(); onClick(); })} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left">
      {icon && <span className={cn('text-ink-soft', danger && 'text-rose-500')}>{icon}</span>}
      <span className={cn('flex-1 text-[15px] text-ink', danger && 'text-rose-600')}>{label}</span>
      {value && <span className="text-[14px] text-ink-muted">{value}</span>}
      {onClick && <ChevronRight size={18} className="text-ink-faint" />}
    </button>
  );
}

/* ---------- Icon tile (быстрые действия, симптомы) ---------- */
export function IconTile({ icon, label, onClick, active, value }: { icon: ReactNode; label: string; onClick?: () => void; active?: boolean; value?: string }) {
  return (
    <button
      onClick={
        onClick &&
        (() => {
          haptic.select();
          onClick();
        })
      }
      className={cn(
        'tap flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-3.5 text-center transition-colors',
        active ? 'border-plum-300 bg-plum-100/90 shadow-soft' : 'border-edge/80 bg-surface/70 shadow-[0_2px_10px_-4px_rgba(110,70,170,0.2)]',
      )}
    >
      <span className={cn('text-ink-soft', active && 'text-plum-700')}>{icon}</span>
      <span className="text-[12.5px] font-medium leading-tight text-ink">{label}</span>
      {value && <span className="text-[11px] leading-tight text-plum-600">{value}</span>}
    </button>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-5 flex items-center justify-between px-1">
      <h2 className="h-section">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center px-6 py-8 text-center">
      {icon && <div className="mb-3 rounded-full bg-plum-100 p-3 text-plum-600">{icon}</div>}
      <div className="text-[16px] font-semibold text-ink">{title}</div>
      {text && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{text}</p>}
      {action && <div className="mt-4 w-full">{action}</div>}
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+16px)] z-[60] flex justify-center">
      <div className="animate-fadeUp rounded-full bg-brand-800/90 px-5 py-2.5 text-[14px] font-medium text-white shadow-lg">{text}</div>
    </div>,
    document.body,
  );
}
