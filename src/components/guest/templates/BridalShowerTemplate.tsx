'use client';

import Image from 'next/image';
import { EVENT_TEMPLATES } from '@/lib/templates';
import type { GuestPortal } from '@/hooks/useGuestPortal';
import {
  PortalAddressPanel,
  PortalHeader,
  PortalResultPanel,
  PortalSearchPanel,
} from '@/components/guest/PortalPanels';

/**
 * Enchanted garden (Claude Design "Enchanted Gardens Bridal Shower UI"):
 * hanging canopy, meadow, fireflies and butterflies behind an arched card.
 */

const template = EVENT_TEMPLATES['bridal-shower'];

type Bfly = {
  id: string;
  left: string;
  top: string;
  w: number;
  h: number;
  fly: string;
  dur: number;
  delay: number;
  mid: string;
  deep: string;
};

/** Butterflies, transcribed from the design (position, flight path, palette). */
const BUTTERFLIES: Bfly[] = [
  { id: 'gb1', left: '4%', top: '30%', w: 82, h: 66, fly: 'flyb1', dur: 34, delay: 0, mid: '#F2C4B4', deep: '#A66450' },
  { id: 'gb2', left: '86%', top: '22%', w: 62, h: 50, fly: 'flyb2', dur: 39, delay: 2.5, mid: '#DCC8E6', deep: '#7A5C8C' },
  { id: 'gb3', left: '2%', top: '60%', w: 56, h: 45, fly: 'flyb3', dur: 31, delay: 5, mid: '#F6DFA8', deep: '#9A7530' },
];

const BUTTERFLIES_FRONT: Bfly[] = [
  { id: 'gb4', left: '76%', top: '60%', w: 52, h: 42, fly: 'flyb4', dur: 28, delay: 1.2, mid: '#F2C4B4', deep: '#A66450' },
  { id: 'gb5', left: '10%', top: '78%', w: 44, h: 35, fly: 'flyb5', dur: 33, delay: 3.4, mid: '#CBDCBB', deep: '#5F7A50' },
  { id: 'gb6', left: '50%', top: '90%', w: 38, h: 30, fly: 'flyb6', dur: 26, delay: 6, mid: '#F6DFA8', deep: '#9A7530' },
  { id: 'gb7', left: '30%', top: '92%', w: 34, h: 27, fly: 'flyb7', dur: 30, delay: 2, mid: '#DCC8E6', deep: '#7A5C8C' },
  { id: 'gb8', left: '90%', top: '84%', w: 40, h: 32, fly: 'flyb8', dur: 36, delay: 4.6, mid: '#EFCBD6', deep: '#9E5F73' },
];

const WING_L = 'M0 0 C -4 -20, -26 -34, -40 -25 C -52 -17, -46 3, -26 9 C -14 12, -4 8, 0 0 Z';
const WING_L2 = 'M0 3 C -8 13, -24 24, -34 15 C -42 8, -32 -3, -18 1 C -10 3, -4 3, 0 3 Z';

function Butterfly({ b }: { b: Bfly }) {
  // Source design encodes the flap into the flight cycle; 3.2% of it per beat.
  const wing = `wingflap ${(b.dur * 0.032).toFixed(3)}s linear infinite ${b.delay}s`;
  const wings = (
    <>
      <path d={WING_L} fill={`url(#${b.id})`} stroke={b.deep} strokeWidth="1.3" />
      <path d={WING_L2} fill={`url(#${b.id})`} stroke={b.deep} strokeWidth="1.1" opacity=".96" />
    </>
  );

  return (
    <div
      className="garden-motion absolute"
      style={{
        left: b.left,
        top: b.top,
        animation: `${b.fly} ${b.dur}s cubic-bezier(.42,.02,.58,1) infinite ${b.delay}s`,
        filter: 'drop-shadow(0 6px 10px rgba(70,62,48,.3))',
      }}
    >
      <svg width={b.w} height={b.h} viewBox="-56 -40 112 64" style={{ overflow: 'visible' }} aria-hidden>
        <defs>
          <linearGradient id={b.id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF8F4" stopOpacity=".97" />
            <stop offset="55%" stopColor={b.mid} stopOpacity=".94" />
            <stop offset="100%" stopColor={b.deep} stopOpacity=".9" />
          </linearGradient>
        </defs>
        <g className="garden-motion" style={{ transformOrigin: '0px 0px', animation: wing }}>{wings}</g>
        <g className="garden-motion" transform="scale(-1,1)" style={{ transformOrigin: '0px 0px', animation: wing }}>
          {wings}
        </g>
        <path d="M0 -13 C 2.6 -8, 2.8 6, 0 13 C -2.8 6, -2.6 -8, 0 -13 Z" fill={b.deep} opacity=".9" />
        <path d="M0 -12 C -3 -20, -8 -24, -12 -25" fill="none" stroke={b.deep} strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
        <path d="M0 -12 C 3 -20, 8 -24, 12 -25" fill="none" stroke={b.deep} strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
      </svg>
    </div>
  );
}

export default function BridalShowerTemplate({ portal }: { portal: GuestPortal }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: template.palette.pageBackground }}
    >
      {/* Soft colour pools */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(34% 26% at 8% 62%,rgba(246,220,214,.4),transparent 72%),radial-gradient(32% 24% at 92% 70%,rgba(224,233,210,.55),transparent 72%),radial-gradient(46% 30% at 60% 100%,rgba(233,240,224,.8),transparent 72%)',
        }}
      />

      {/* Hanging canopy */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[230px] overflow-hidden sm:h-[340px]">
        <Image
          src="/canopy.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{
            objectPosition: 'center 12%',
            filter: 'saturate(.92) brightness(1.03) contrast(.97) blur(0.6px)',
            opacity: 0.97,
            WebkitMaskImage:
              'linear-gradient(180deg,#000 58%,rgba(0,0,0,.55) 82%,transparent 100%)',
            maskImage: 'linear-gradient(180deg,#000 58%,rgba(0,0,0,.55) 82%,transparent 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.12) 60%,rgba(255,255,255,.55))',
            mixBlendMode: 'screen',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(60% 80% at 50% 0%,rgba(255,252,246,.5),transparent 70%)' }}
        />
      </div>

      {/* Meadow */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[215px] overflow-hidden sm:h-[240px]"
        style={{
          filter: 'blur(1.1px) saturate(.8) brightness(1.05)',
          opacity: 0.88,
          WebkitMaskImage:
            'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.45) 22%,#000 62%),linear-gradient(90deg,rgba(0,0,0,.3) 0%,#000 16%,#000 84%,rgba(0,0,0,.3) 100%)',
          WebkitMaskComposite: 'source-in',
          maskImage:
            'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.45) 22%,#000 62%),linear-gradient(90deg,rgba(0,0,0,.3) 0%,#000 16%,#000 84%,rgba(0,0,0,.3) 100%)',
          maskComposite: 'intersect',
        }}
      >
        <Image
          src="/meadow.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: 'center bottom' }}
        />
      </div>

      {/* Fireflies */}
      {[
        { left: '10%', top: '40%', s: 7, d: 4.5, delay: 0 },
        { left: '22%', top: '62%', s: 5, d: 5.5, delay: 1.4 },
        { left: '46%', top: '34%', s: 6, d: 6, delay: 2.2 },
        { left: '74%', top: '48%', s: 7, d: 5, delay: 0.8 },
        { left: '88%', top: '66%', s: 5, d: 6.5, delay: 3 },
        { left: '62%', top: '78%', s: 6, d: 4.8, delay: 1.9 },
      ].map((f, i) => (
        <div
          key={i}
          className="garden-motion pointer-events-none absolute rounded-full"
          style={{
            left: f.left,
            top: f.top,
            width: f.s,
            height: f.s,
            background: '#F7E7B2',
            boxShadow: `0 0 ${f.s * 2}px ${f.s * 0.7}px rgba(247,231,178,.75)`,
            animation: `twinkle ${f.d}s ease-in-out infinite ${f.delay}s`,
          }}
        />
      ))}

      {/* Butterflies behind the card */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {BUTTERFLIES.map((b) => (
          <Butterfly key={b.id} b={b} />
        ))}
      </div>

      {/* ---- Card ---- */}
      <div className="relative mx-auto w-full max-w-[560px] px-[18px] pt-[62px] pb-10 sm:px-0 sm:pt-24">
        {/* Arch outlines */}
        <div
          className="pointer-events-none absolute"
          style={{
            inset: '38px -18px 24px',
            border: '1.5px solid rgba(201,184,150,.75)',
            borderRadius: '290px 290px 26px 26px',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            inset: '46px -10px 32px',
            border: '1px solid rgba(201,184,150,.4)',
            borderRadius: '280px 280px 20px 20px',
          }}
        />

        <div
          className="garden-enter relative px-6 pt-9 pb-7 sm:px-[46px] sm:pt-11 sm:pb-[38px]"
          style={{
            background: template.palette.surface,
            borderRadius: '270px 270px 22px 22px',
            boxShadow: '0 30px 70px -34px rgba(74,95,69,.6)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              // Copy is always legible; it just settles to full strength once
              // settings resolve, so a changed name eases in instead of snapping.
              opacity: portal.settingsLoading ? 0.62 : 1,
              transition: 'opacity 700ms cubic-bezier(0.2,0.7,0.3,1)',
            }}
          >
            <PortalHeader template={template} portal={portal} />
          </div>

          <PortalSearchPanel template={template} portal={portal} />
        </div>

        <PortalResultPanel template={template} portal={portal} />
        <PortalAddressPanel template={template} portal={portal} />
      </div>

      {/* Butterflies in front */}
      <div className="pointer-events-none absolute inset-0 z-[5] hidden sm:block">
        {BUTTERFLIES_FRONT.map((b) => (
          <Butterfly key={b.id} b={b} />
        ))}
      </div>

      {/* Mobile keeps a lighter cast, clear of the card text */}
      <div className="pointer-events-none absolute inset-0 z-[5] sm:hidden">
        <Butterfly b={{ ...BUTTERFLIES[0], left: '4%', top: '11%', w: 54, h: 44 }} />
        <Butterfly b={{ ...BUTTERFLIES_FRONT[1], left: '8%', top: '84%', w: 40, h: 32 }} />
      </div>
    </div>
  );
}
