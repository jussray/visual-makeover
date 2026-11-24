import { forwardRef, type CSSProperties } from "react";
import {
  Home, Search, User, Settings, Bell, Heart, Star, Calendar, Clock, MapPin, Camera, Image as ImageIcon, Music, Book,
  Check, Plus, ChevronRight, ArrowRight, MessageCircle, BarChart3, Wallet, ShoppingCart, Leaf, Sparkles, Sun, Moon,
  Flame, Bookmark, Filter, List, Signal, Wifi, BatteryFull, type LucideIcon,
} from "lucide-react";
import type { Brief, IconName, ScreenBlock, ScreenPlan } from "@/lib/mm/schema";
import { fontStack } from "@/lib/mm/fonts";
import { mix, onColor, paletteMap } from "@/lib/mm/client";

// Trusted, whitelisted rendering only. Plans are data; nothing from the AI is executed.
const ICON_MAP: Record<IconName, LucideIcon> = {
  home: Home, search: Search, user: User, settings: Settings, bell: Bell, heart: Heart, star: Star, calendar: Calendar,
  clock: Clock, "map-pin": MapPin, camera: Camera, image: ImageIcon, music: Music, book: Book, check: Check, plus: Plus,
  "chevron-right": ChevronRight, "arrow-right": ArrowRight, message: MessageCircle, chart: BarChart3, wallet: Wallet,
  cart: ShoppingCart, leaf: Leaf, sparkle: Sparkles, sun: Sun, moon: Moon, flame: Flame, bookmark: Bookmark, filter: Filter, list: List,
};

type Theme = ReturnType<typeof paletteMap> & { heading: string; body: string; gap: number; pad: number; r: number };

function Icon({ name, size = 18, color }: { name?: IconName | undefined; size?: number; color: string }) {
  if (!name) return null;
  const C = ICON_MAP[name];
  if (!C) return null;
  return <C size={size} color={color} aria-hidden />;
}

function toneFill(t: Theme, tone: "primary" | "secondary" | "accent" | "surface") {
  return tone === "surface" ? t.surface : t[tone];
}

function Block({ b, t }: { b: ScreenBlock; t: Theme }) {
  const card: CSSProperties = { background: t.surface, borderRadius: t.r, padding: t.pad };
  const h = (size: number): CSSProperties => ({ fontFamily: t.heading, fontSize: size, lineHeight: 1.15, margin: 0, color: t.text });
  const small: CSSProperties = { fontSize: 12, color: mix(t.text, t.background, 0.4) };
  switch (b.kind) {
    case "header":
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div>
            <p style={h(24)}>{b.title}</p>
            {b.subtitle && <p style={{ ...small, marginTop: 4 }}>{b.subtitle}</p>}
          </div>
          {b.icon && (
            <span style={{ width: 38, height: 38, borderRadius: 999, background: t.surface, display: "grid", placeItems: "center" }}>
              <Icon name={b.icon} color={t.text} />
            </span>
          )}
        </div>
      );
    case "hero": {
      const fill = toneFill(t, b.tone);
      const fg = onColor(fill, t.text);
      return (
        <div style={{ background: fill, color: fg, borderRadius: t.r + 4, padding: t.pad + 6 }}>
          {b.eyebrow && <p style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.8, margin: 0 }}>{b.eyebrow}</p>}
          <p style={{ ...h(26), color: fg, marginTop: 6 }}>{b.title}</p>
          {b.body && <p style={{ fontSize: 13, marginTop: 8, opacity: 0.9, lineHeight: 1.45 }}>{b.body}</p>}
          {b.cta && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, padding: "9px 16px", borderRadius: 999, background: fg, color: fill, fontSize: 13, fontWeight: 700 }}>
              {b.cta} <ArrowRight size={14} aria-hidden />
            </span>
          )}
        </div>
      );
    }
    case "text":
      return <p style={{ fontSize: 14, lineHeight: 1.55, color: t.text, margin: 0 }}>{b.body}</p>;
    case "stats":
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${b.items.length}, 1fr)`, gap: t.gap / 1.5 }}>
          {b.items.map((s, i) => (
            <div key={i} style={card}>
              <p style={{ ...h(22), color: i === 0 ? t.primary : t.text }}>{s.value}</p>
              <p style={{ ...small, marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      );
    case "list":
      return (
        <div>
          {b.title && <p style={{ ...h(16), marginBottom: 8 }}>{b.title}</p>}
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            {b.items.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: `${t.pad - 2}px ${t.pad}px`, borderTop: i ? `1px solid ${mix(t.surface, t.text, 0.08)}` : undefined }}>
                {it.icon && (
                  <span style={{ width: 34, height: 34, borderRadius: t.r / 1.5, background: mix(t.primary, t.background, 0.82), display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name={it.icon} size={16} color={t.primary} />
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: t.text, margin: 0 }}>{it.title}</p>
                  {it.subtitle && <p style={{ ...small, margin: "2px 0 0" }}>{it.subtitle}</p>}
                </div>
                {it.meta ? <span style={{ ...small, fontWeight: 600 }}>{it.meta}</span> : <ChevronRight size={16} color={mix(t.text, t.background, 0.5)} aria-hidden />}
              </div>
            ))}
          </div>
        </div>
      );
    case "cards":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: t.gap / 1.5 }}>
          {b.items.map((c, i) => {
            const fill = toneFill(t, c.tone);
            const fg = onColor(fill, t.text);
            return (
              <div key={i} style={{ background: fill, color: fg, borderRadius: t.r, padding: t.pad, minHeight: 86, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Icon name={c.icon} color={fg} />
                <p style={{ fontSize: 13, fontWeight: 700, margin: "10px 0 0" }}>{c.title}</p>
              </div>
            );
          })}
        </div>
      );
    case "chips":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {b.items.map((c, i) => (
            <span key={i} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: i === 0 ? t.primary : t.surface, color: i === 0 ? onColor(t.primary, t.background) : t.text }}>{c}</span>
          ))}
        </div>
      );
    case "button": {
      const fill = b.variant === "primary" ? t.primary : "transparent";
      const fg = b.variant === "primary" ? onColor(t.primary, t.background) : t.primary;
      return (
        <div style={{ textAlign: "center", padding: "13px 16px", borderRadius: Math.min(t.r, 999) + 6, background: fill, color: fg, border: b.variant === "secondary" ? `1.5px solid ${t.primary}` : undefined, fontWeight: 700, fontSize: 14 }}>{b.label}</div>
      );
    }
    case "input":
      return (
        <div>
          <p style={{ ...small, fontWeight: 600, marginBottom: 6, color: t.text }}>{b.label}</p>
          <div style={{ border: `1.5px solid ${mix(t.text, t.background, 0.75)}`, borderRadius: t.r / 1.4, padding: "11px 12px", fontSize: 13, color: mix(t.text, t.background, 0.5), background: t.background }}>{b.placeholder ?? ""}</div>
        </div>
      );
    case "progress":
      return (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: t.text, fontWeight: 600 }}>
            <span>{b.label}</span>
            <span>{Math.round(b.value)}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: mix(t.surface, t.text, 0.1), marginTop: 10 }}>
            <div style={{ width: `${b.value}%`, height: "100%", borderRadius: 999, background: t.accent }} />
          </div>
        </div>
      );
    case "toggles":
      return (
        <div style={{ ...card, padding: 0 }}>
          {b.items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${t.pad - 2}px ${t.pad}px`, borderTop: i ? `1px solid ${mix(t.surface, t.text, 0.08)}` : undefined }}>
              <span style={{ fontSize: 14, color: t.text }}>{it.label}</span>
              <span style={{ width: 40, height: 24, borderRadius: 999, background: it.on ? t.primary : mix(t.surface, t.text, 0.2), position: "relative" }}>
                <span style={{ position: "absolute", top: 3, left: it.on ? 19 : 3, width: 18, height: 18, borderRadius: 999, background: "#ffffff" }} />
              </span>
            </div>
          ))}
        </div>
      );
    case "media": {
      const fill = toneFill(t, b.tone);
      return (
        <div style={{ height: 150, borderRadius: t.r, background: `linear-gradient(135deg, ${fill}, ${mix(fill, t.background, 0.55)})`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 120, height: 120, borderRadius: 999, right: -20, bottom: -30, background: mix(fill, "#ffffff", 0.3), opacity: 0.6 }} />
          {b.label && <span style={{ position: "absolute", left: 12, bottom: 10, fontSize: 12, fontWeight: 700, color: onColor(fill, t.text) }}>{b.label}</span>}
        </div>
      );
    }
    case "tabbar":
      return null; // rendered pinned to the bottom of the phone
  }
}

export const PhoneScreen = forwardRef<HTMLDivElement, { plan: ScreenPlan; brief: Brief }>(function PhoneScreen({ plan, brief }, ref) {
  const p = paletteMap(brief);
  const density = { compact: [10, 12], comfortable: [14, 14], airy: [20, 18] }[plan.density];
  const t: Theme = { ...p, heading: fontStack(brief.typography.heading), body: fontStack(brief.typography.body), gap: density[0]!, pad: density[1]!, r: { sharp: 4, soft: 14, round: 24 }[plan.radius] };
  const tab = plan.blocks.find((b): b is Extract<ScreenBlock, { kind: "tabbar" }> => b.kind === "tabbar");
  return (
    <div ref={ref} style={{ width: "100%", maxWidth: 300, padding: 10, borderRadius: 46, background: "#1b1a18" }}>
      <div style={{ width: "100%", height: 590, borderRadius: 38, overflow: "hidden", background: t.background, fontFamily: t.body, color: t.text, display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 22px 6px", fontSize: 12, fontWeight: 700, color: t.text }}>
          <span>9:41</span>
          <span style={{ width: 80, height: 22, borderRadius: 999, background: "#1b1a18", position: "absolute", left: "50%", transform: "translateX(-50%)", top: 8 }} />
          <span style={{ display: "flex", gap: 4 }}><Signal size={13} aria-hidden /><Wifi size={13} aria-hidden /><BatteryFull size={15} aria-hidden /></span>
        </div>
        <div style={{ flex: 1, overflow: "hidden", padding: `10px ${t.pad + 2}px`, display: "flex", flexDirection: "column", gap: t.gap }}>
          {plan.blocks.map((b, i) => <Block key={i} b={b} t={t} />)}
        </div>
        {tab && (
          <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 8px 18px", background: t.surface, borderTop: `1px solid ${mix(t.surface, t.text, 0.08)}` }}>
            {tab.items.map((it, i) => {
              const c = i === tab.active ? t.primary : mix(t.text, t.background, 0.5);
              return (
                <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: c }}>
                  <Icon name={it.icon ?? "home"} size={18} color={c} />
                  {it.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});