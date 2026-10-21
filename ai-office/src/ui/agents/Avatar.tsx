import { useId } from "react";

import type { AvatarConfig } from "./profile";

type AvatarProps = {
  avatar: AvatarConfig;
  size?: number;
  ring?: string;
  className?: string;
};

export function Avatar({ avatar, size = 40, ring, className }: AvatarProps) {
  const clipId = useId();
  const { skin, hair, hairColour, outfit, accessory, background } = avatar;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="100" fill={background} />
        <circle cx="50" cy="30" r="46" fill="#ffffff" opacity="0.06" />

        {avatar.imageDataUrl ? (
          <image
            href={avatar.imageDataUrl}
            width="100"
            height="100"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <>
            {hair === "long" && (
              <path d="M27 46 Q26 84 34 92 L66 92 Q74 84 73 46 Z" fill={hairColour} />
            )}

            <path d="M14 104 Q16 76 50 74 Q84 76 86 104 Z" fill={outfit} />
            <path d="M40 74 L50 86 L60 74 Z" fill="#ffffff" opacity="0.18" />
            <rect x="44" y="62" width="12" height="14" rx="5" fill={skin} />
            <rect x="44" y="66" width="12" height="5" fill="#000" opacity="0.08" />

            <ellipse cx="29.5" cy="48" rx="4" ry="5.5" fill={skin} />
            <ellipse cx="70.5" cy="48" rx="4" ry="5.5" fill={skin} />
            <ellipse cx="50" cy="46" rx="20.5" ry="22.5" fill={skin} />

            <Hair style={hair} colour={hairColour} />

            <ellipse cx="42" cy="49" rx="2.4" ry="2.8" fill="#1d1b22" />
            <ellipse cx="58" cy="49" rx="2.4" ry="2.8" fill="#1d1b22" />
            <circle cx="42.8" cy="48" r="0.8" fill="#fff" />
            <circle cx="58.8" cy="48" r="0.8" fill="#fff" />
            <path d="M38.5 43 Q42 41 45.5 42.5" stroke="#1d1b22" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
            <path d="M54.5 42.5 Q58 41 61.5 43" stroke="#1d1b22" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
            <ellipse cx="38" cy="56" rx="3.4" ry="2" fill="#ff7a8a" opacity="0.28" />
            <ellipse cx="62" cy="56" rx="3.4" ry="2" fill="#ff7a8a" opacity="0.28" />
            <path d="M44.5 58 Q50 62.5 55.5 58" stroke="#7a3b2e" strokeWidth="1.8" fill="none" strokeLinecap="round" />

            <AccessoryLayer accessory={accessory} />
          </>
        )}
      </g>

      {ring && (
        <circle cx="50" cy="50" r="48" fill="none" stroke={ring} strokeWidth="4" />
      )}
    </svg>
  );
}

function Hair({ style, colour }: { style: AvatarConfig["hair"]; colour: string }) {
  switch (style) {
    case "short":
      return <path d="M29 46 Q27 21 50 21 Q73 21 71 46 Q69 33 60 31 Q50 36 38 32 Q31 36 29 46 Z" fill={colour} />;
    case "side":
      return <path d="M29 47 Q26 20 52 20 Q74 21 71 44 Q66 30 54 29 Q46 38 31 38 Z" fill={colour} />;
    case "long":
      return <path d="M28 50 Q25 20 50 20 Q75 20 72 50 Q70 32 58 30 Q48 34 36 33 Q30 38 28 50 Z" fill={colour} />;
    case "bun":
      return (
        <>
          <circle cx="50" cy="17" r="9" fill={colour} />
          <path d="M29 46 Q28 22 50 22 Q72 22 71 46 Q68 31 50 30 Q32 31 29 46 Z" fill={colour} />
        </>
      );
    case "curly":
      return (
        <g fill={colour}>
          {[
            [32, 34, 7], [38, 26, 8], [48, 22, 8.5], [58, 23, 8], [66, 30, 7.5], [70, 39, 5.5], [29, 42, 5.5],
          ].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      );
    case "buzz":
      return <path d="M30 42 Q30 23 50 23 Q70 23 70 42 Q64 30 50 30 Q36 30 30 42 Z" fill={colour} opacity="0.75" />;
  }
}

function AccessoryLayer({ accessory }: { accessory: AvatarConfig["accessory"] }) {
  switch (accessory) {
    case "glasses":
      return (
        <g fill="none" stroke="#11131a" strokeWidth="1.8">
          <rect x="35" y="44" width="12" height="9" rx="3.5" fill="#9fd3ff" fillOpacity="0.15" />
          <rect x="53" y="44" width="12" height="9" rx="3.5" fill="#9fd3ff" fillOpacity="0.15" />
          <path d="M47 48 L53 48" />
        </g>
      );
    case "headset":
      return (
        <g>
          <path d="M27 48 Q27 17 50 17 Q73 17 73 48" fill="none" stroke="#1f2533" strokeWidth="4" />
          <rect x="22" y="42" width="9" height="14" rx="4" fill="#1f2533" />
          <rect x="69" y="42" width="9" height="14" rx="4" fill="#1f2533" />
          <path d="M27 54 Q30 64 42 62" fill="none" stroke="#1f2533" strokeWidth="2.2" />
          <circle cx="42.5" cy="62" r="2.4" fill="#3b82f6" />
        </g>
      );
    case "beanie":
      return (
        <g>
          <path d="M28 40 Q28 14 50 14 Q72 14 72 40 Z" fill="#e5484d" />
          <rect x="26" y="36" width="48" height="8" rx="4" fill="#b8333a" />
          <circle cx="50" cy="13" r="4.5" fill="#f2f2f2" />
        </g>
      );
    default:
      return null;
  }
}
