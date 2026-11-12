import { defaultPhoto } from "@/data/seed/catalog";
import type { Category, Product } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * Product picture. Shows the uploaded photo when the product has one, then the
 * built-in photo for its code, then a drawn illustration chosen from its name
 * and category.
 */

type ArtKind =
  | "bird" | "curry" | "biriyani" | "chilly" | "whole" | "grill" | "shawarma" | "tandoori"
  | "tikka" | "kebab" | "breast" | "thigh" | "keema" | "popcorn" | "mixed" | "gizzard"
  | "heart" | "liver" | "neck" | "bones";

const KEYWORDS: [string, ArtKind][] = [
  ["curry", "curry"], ["biri", "biriyani"], ["biry", "biriyani"], ["chill", "chilly"], ["whole", "whole"],
  ["grill", "grill"], ["shawarma", "shawarma"], ["thanduri", "tandoori"], ["tandoor", "tandoori"],
  ["tikka", "tikka"], ["kebab", "kebab"], ["kabab", "kebab"], ["breast", "breast"], ["thigh", "thigh"],
  ["keema", "keema"], ["mince", "keema"], ["popcorn", "popcorn"], ["mixed", "mixed"], ["gizzard", "gizzard"],
  ["heart", "heart"], ["liver", "liver"], ["neck", "neck"], ["janata", "bones"], ["bone", "bones"],
];

function artKind(name: string, isLive: boolean): ArtKind {
  if (isLive) return "bird";
  const lower = name.toLowerCase();
  return KEYWORDS.find(([word]) => lower.includes(word))?.[1] ?? "curry";
}

interface Palette {
  meat: string;
  shade: string;
  light: string;
}

const SKIN_ON: Palette = { meat: "#f3cf9f", shade: "#dba96c", light: "#fbe6c6" };
const SKIN_OFF: Palette = { meat: "#f2a6a1", shade: "#d97f7b", light: "#fbcfca" };
const BONE = "#fff8ea";
const BONE_EDGE = "#d8c8a8";

/** A rounded piece of meat, with an optional bone end showing. */
function Piece({ x, y, rx, ry, rot = 0, p, bone }: { x: number; y: number; rx: number; ry: number; rot?: number; p: Palette; bone?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {bone && <rect x={rx - 3} y={-2.5} width={9} height={5} rx={2.5} fill={BONE} stroke={BONE_EDGE} strokeWidth={0.8} />}
      <ellipse rx={rx} ry={ry} fill={p.meat} stroke={p.shade} strokeWidth={1.2} />
      <ellipse cx={-rx * 0.3} cy={-ry * 0.35} rx={rx * 0.4} ry={ry * 0.25} fill={p.light} />
    </g>
  );
}

function Cube({ x, y, s, rot = 0, p }: { x: number; y: number; s: number; rot?: number; p: Palette }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.28} fill={p.meat} stroke={p.shade} strokeWidth={1.1} />
      <rect x={-s / 2 + 2} y={-s / 2 + 2} width={s * 0.4} height={s * 0.22} rx={1.5} fill={p.light} />
    </g>
  );
}

function Drumstick({ x, y, rot, p, scale = 1 }: { x: number; y: number; rot: number; p: Palette; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <rect x={12} y={-2.5} width={20} height={5} rx={2.5} fill={BONE} stroke={BONE_EDGE} strokeWidth={0.8} />
      <circle cx={33} cy={-3} r={3.4} fill={BONE} stroke={BONE_EDGE} strokeWidth={0.8} />
      <circle cx={33} cy={3} r={3.4} fill={BONE} stroke={BONE_EDGE} strokeWidth={0.8} />
      <path d="M-18 0 C-18 -13 -2 -15 8 -8 C14 -4 16 -2 16 0 C16 2 14 4 8 8 C-2 15 -18 13 -18 0 Z" fill={p.meat} stroke={p.shade} strokeWidth={1.2} />
      <ellipse cx={-7} cy={-5} rx={6} ry={3} fill={p.light} />
    </g>
  );
}

function WholeBird({ p, grill }: { p: Palette; grill?: boolean }) {
  return (
    <g>
      <ellipse cx={60} cy={66} rx={38} ry={5} fill="#000" opacity={0.08} />
      <Drumstick x={80} y={52} rot={-28} p={p} scale={0.8} />
      <ellipse cx={54} cy={44} rx={32} ry={21} fill={p.meat} stroke={p.shade} strokeWidth={1.4} />
      <ellipse cx={44} cy={34} rx={14} ry={6} fill={p.light} />
      <path d="M30 50 C24 44 28 36 38 38 C44 40 44 50 36 54 Z" fill={p.meat} stroke={p.shade} strokeWidth={1.2} />
      <Drumstick x={72} y={40} rot={-38} p={p} scale={0.8} />
      {grill &&
        [36, 48, 60, 72].map((x) => (
          <path key={x} d={`M${x} 28 L${x - 10} 58`} stroke="#6b3a1c" strokeWidth={2} strokeLinecap="round" opacity={0.55} />
        ))}
    </g>
  );
}

function LiveBird({ big }: { big: boolean }) {
  const s = big ? 1.12 : 0.92;
  return (
    <g transform={`translate(60 42) scale(${s}) translate(-60 -42)`}>
      <ellipse cx={60} cy={70} rx={26} ry={4} fill="#000" opacity={0.08} />
      <path d="M52 62 L50 70 M50 70 L45 71 M50 70 L54 72 M66 62 L67 70 M67 70 L62 72 M67 70 L71 71" stroke="#e39a2d" strokeWidth={2} strokeLinecap="round" fill="none" />
      <path d="M30 34 C22 28 22 44 34 50 Z" fill="#f4efe6" stroke="#cfc6b6" strokeWidth={1.2} />
      <ellipse cx={56} cy={46} rx={26} ry={19} fill="#fbf7f0" stroke="#cfc6b6" strokeWidth={1.4} />
      <path d="M44 44 C50 38 66 40 68 50 C60 56 48 54 44 44 Z" fill="#efe8dc" stroke="#cfc6b6" strokeWidth={1} />
      <circle cx={82} cy={28} r={11} fill="#fbf7f0" stroke="#cfc6b6" strokeWidth={1.4} />
      <path d="M76 18 C76 12 81 13 81 17 C82 11 87 12 86 17 C89 13 92 16 89 20 Z" fill="#dc3b32" />
      <path d="M92 27 L100 30 L92 33 Z" fill="#e8a02e" />
      <path d="M88 35 C88 41 84 41 84 36 Z" fill="#dc3b32" />
      <circle cx={85} cy={26} r={1.6} fill="#2b2b2b" />
    </g>
  );
}

function Skewer({ children }: { children: React.ReactNode }) {
  return (
    <g transform="rotate(-14 60 40)">
      <rect x={8} y={39} width={104} height={2.4} rx={1.2} fill="#b98d57" />
      {children}
    </g>
  );
}

function Art({ kind, p, bone, big }: { kind: ArtKind; p: Palette; bone: boolean; big: boolean }) {
  const organ: Palette = { meat: "#a8423f", shade: "#7c2c2b", light: "#c96a64" };
  const liver: Palette = { meat: "#8a3a36", shade: "#632523", light: "#aa5a52" };
  const tandoor: Palette = { meat: "#e2572c", shade: "#b23c18", light: "#f08a5c" };
  const fried: Palette = { meat: "#e3a64a", shade: "#b97a24", light: "#f3c87e" };
  const roast: Palette = { meat: "#c98244", shade: "#93561f", light: "#e2a770" };

  switch (kind) {
    case "bird":
      return <LiveBird big={big} />;
    case "whole":
      return <WholeBird p={p} />;
    case "grill":
      return <WholeBird p={roast} grill />;
    case "curry":
      return (
        <g>
          <Piece x={36} y={30} rx={15} ry={11} rot={-18} p={p} bone={bone} />
          <Piece x={74} y={26} rx={14} ry={10} rot={22} p={p} bone={bone} />
          <Piece x={90} y={50} rx={13} ry={10} rot={-30} p={p} />
          <Piece x={56} y={54} rx={16} ry={11} rot={10} p={p} bone={bone} />
          <Piece x={26} y={56} rx={11} ry={9} rot={35} p={p} />
        </g>
      );
    case "biriyani":
      return (
        <g>
          <Piece x={38} y={32} rx={22} ry={15} rot={-14} p={p} bone={bone} />
          <Piece x={82} y={36} rx={20} ry={14} rot={24} p={p} bone={bone} />
          <Piece x={56} y={58} rx={21} ry={13} rot={4} p={p} />
        </g>
      );
    case "chilly":
      return (
        <g>
          {[[28, 28, 10], [50, 24, -14], [72, 28, 22], [94, 30, -6], [36, 52, -20], [58, 50, 12], [80, 54, -12], [100, 56, 26], [18, 50, 30]].map(
            ([x, y, r]) => (
              <Cube key={`${x}-${y}`} x={x} y={y} s={15} rot={r} p={p} />
            ),
          )}
        </g>
      );
    case "shawarma":
      return (
        <g>
          <rect x={58.5} y={6} width={3} height={68} rx={1.5} fill="#9aa0a6" />
          <ellipse cx={60} cy={70} rx={30} ry={4} fill="#c9ced3" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const w = 20 + i * 4.5 - (i > 4 ? 6 : 0);
            return (
              <rect
                key={i}
                x={60 - w}
                y={14 + i * 9}
                width={w * 2}
                height={9.5}
                rx={4.5}
                fill={i % 2 ? roast.meat : p.meat}
                stroke={roast.shade}
                strokeWidth={1}
              />
            );
          })}
        </g>
      );
    case "tandoori":
      return (
        <g>
          <Drumstick x={44} y={30} rot={12} p={tandoor} />
          <Drumstick x={52} y={56} rot={-10} p={tandoor} />
        </g>
      );
    case "tikka":
      return (
        <Skewer>
          {[26, 46, 66, 86].map((x, i) => (
            <Cube key={x} x={x} y={40} s={17} rot={i % 2 ? 8 : -8} p={tandoor} />
          ))}
        </Skewer>
      );
    case "kebab":
      return (
        <Skewer>
          <Piece x={40} y={40} rx={20} ry={9} p={roast} />
          <Piece x={84} y={40} rx={20} ry={9} p={roast} />
        </Skewer>
      );
    case "breast":
      return (
        <g>
          <path d="M22 44 C20 24 46 12 70 18 C92 24 104 40 98 52 C92 64 66 68 46 64 C32 61 23 56 22 44 Z" fill={p.meat} stroke={p.shade} strokeWidth={1.5} />
          <path d="M34 36 C42 24 62 22 74 28" stroke={p.light} strokeWidth={5} strokeLinecap="round" fill="none" />
        </g>
      );
    case "thigh":
      return (
        <g>
          <path d="M28 30 C34 16 62 14 78 20 C96 27 98 48 88 58 C76 68 44 68 32 58 C24 51 24 39 28 30 Z" fill={p.meat} stroke={p.shade} strokeWidth={1.5} />
          <path d="M40 30 C48 24 60 24 68 28" stroke={p.light} strokeWidth={5} strokeLinecap="round" fill="none" />
          <path d="M50 46 C58 50 70 50 78 44" stroke={p.shade} strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.7} />
        </g>
      );
    case "keema":
      return (
        <g>
          <path d="M18 62 C20 36 40 20 60 20 C80 20 100 36 102 62 Z" fill={p.meat} stroke={p.shade} strokeWidth={1.4} />
          {[[40, 40], [52, 30], [66, 32], [78, 42], [34, 52], [48, 48], [62, 44], [74, 54], [88, 54], [56, 56]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={3.6} fill={p.light} stroke={p.shade} strokeWidth={0.8} />
          ))}
        </g>
      );
    case "popcorn":
      return (
        <g>
          {[[30, 30, 10], [52, 26, 9], [74, 30, 11], [94, 36, 9], [40, 52, 11], [64, 52, 10], [86, 58, 10], [20, 54, 8]].map(([x, y, r]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r={r} fill={fried.meat} stroke={fried.shade} strokeWidth={1.2} />
              <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.3} fill={fried.light} />
            </g>
          ))}
        </g>
      );
    case "mixed":
      return (
        <g>
          <Drumstick x={38} y={30} rot={14} p={p} scale={0.85} />
          <Piece x={88} y={34} rx={13} ry={9} rot={-20} p={organ} />
          <Piece x={40} y={58} rx={14} ry={9} rot={8} p={liver} />
          <Piece x={76} y={58} rx={15} ry={10} rot={-12} p={p} />
        </g>
      );
    case "gizzard":
      return (
        <g>
          {[[36, 32, -20], [78, 30, 16], [58, 56, -4]].map(([x, y, r]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path d="M-17 0 C-17 -12 -4 -13 0 -7 C4 -13 17 -12 17 0 C17 11 5 13 0 8 C-5 13 -17 11 -17 0 Z" fill={organ.meat} stroke={organ.shade} strokeWidth={1.3} />
              <ellipse cx={-7} cy={-4} rx={4.5} ry={2.2} fill={organ.light} />
            </g>
          ))}
        </g>
      );
    case "heart":
      return (
        <g>
          {[[34, 30], [62, 26], [88, 34], [46, 56], [76, 58]].map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <path d="M0 12 C-14 2 -12 -10 -5 -10 C-2 -10 0 -7 0 -5 C0 -7 2 -10 5 -10 C12 -10 14 2 0 12 Z" fill={organ.meat} stroke={organ.shade} strokeWidth={1.2} />
              <ellipse cx={-4.5} cy={-4.5} rx={2.4} ry={1.6} fill={organ.light} />
            </g>
          ))}
        </g>
      );
    case "liver":
      return (
        <g>
          <path d="M16 46 C14 28 34 18 52 24 C62 27 64 40 58 50 C50 62 20 64 16 46 Z" fill={liver.meat} stroke={liver.shade} strokeWidth={1.4} />
          <path d="M58 40 C62 24 86 18 98 28 C108 38 102 56 88 60 C74 64 56 56 58 40 Z" fill={liver.meat} stroke={liver.shade} strokeWidth={1.4} />
          <ellipse cx={34} cy={34} rx={9} ry={4} fill={liver.light} />
          <ellipse cx={80} cy={32} rx={9} ry={4} fill={liver.light} />
        </g>
      );
    case "neck":
      return (
        <g>
          {[[28, -10], [52, 8]].map(([y, r]) => (
            <g key={y} transform={`rotate(${r} 60 ${y})`}>
              <rect x={16} y={y - 9} width={88} height={18} rx={9} fill={p.meat} stroke={p.shade} strokeWidth={1.3} />
              {[34, 50, 66, 82].map((x) => (
                <path key={x} d={`M${x} ${y - 8} L${x} ${y + 8}`} stroke={p.shade} strokeWidth={1.2} opacity={0.6} />
              ))}
              <rect x={24} y={y - 6} width={8} height={3} rx={1.5} fill={p.light} />
            </g>
          ))}
        </g>
      );
    case "bones":
      return (
        <g>
          {[[60, 26, -12], [46, 50, 14], [78, 54, -24]].map(([x, y, r]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`}>
              <rect x={-24} y={-3.5} width={48} height={7} rx={3.5} fill={BONE} stroke={BONE_EDGE} strokeWidth={1.1} />
              {[-25, 25].map((cx) =>
                [-4.5, 4.5].map((cy) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={5} fill={BONE} stroke={BONE_EDGE} strokeWidth={1.1} />),
              )}
              <rect x={-24} y={-2.5} width={48} height={5} fill={BONE} />
              <rect x={-8} y={-5.5} width={16} height={11} rx={5} fill={p.meat} stroke={p.shade} strokeWidth={0.9} opacity={0.9} />
            </g>
          ))}
        </g>
      );
  }
}

export function ProductImage({
  product,
  category,
  className,
}: {
  product: Pick<Product, "name" | "imageUrl"> & { code?: string };
  category?: Pick<Category, "code" | "isLive">;
  className?: string;
}) {
  const photo = product.imageUrl ?? defaultPhoto(product.code);
  if (photo) {
    return (
      // Uploaded photos are small data URLs kept in the browser, so next/image is not needed.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        // Live birds are shown whole on white; food photos fill the frame.
        className={cn(category?.isLive ? "bg-white object-contain" : "bg-muted object-cover", className)}
      />
    );
  }
  const code = category?.code.toUpperCase() ?? "";
  const isLive = !!category?.isLive;
  const skinOn = code.startsWith("WS");
  const withBone = /\bB$/.test(code);
  return (
    <svg
      viewBox="0 0 120 80"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      className={cn(isLive ? "bg-[#e6f1dc]" : "bg-[#f6efe4]", className)}
    >
      <Art
        kind={artKind(product.name, isLive)}
        p={skinOn ? SKIN_ON : SKIN_OFF}
        bone={withBone}
        big={product.name.toLowerCase().includes("big")}
      />
    </svg>
  );
}
