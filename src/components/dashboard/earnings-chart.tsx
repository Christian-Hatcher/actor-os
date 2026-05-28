"use client"

import type { MonthBucket } from "@/hooks/use-earnings"
import { formatPayCompact } from "@/lib/format"

interface EarningsChartProps {
  buckets: MonthBucket[]
}

const W = 320
const H = 160
const PAD_TOP = 10
const PAD_BOTTOM = 18

// Cumulative area chart: green solid area = banked, grey dashed = potential
// ceiling. The gap between them is "money on the table".
export function EarningsChart({ buckets }: EarningsChartProps) {
  if (buckets.length === 0) return null

  const max = Math.max(
    1,
    ...buckets.map((b) => b.cumulativePotential),
    ...buckets.map((b) => b.cumulativeBanked),
  )
  const plotH = H - PAD_TOP - PAD_BOTTOM
  const x = (i: number) =>
    buckets.length === 1 ? W / 2 : (i / (buckets.length - 1)) * W
  const y = (v: number) => PAD_TOP + plotH * (1 - v / max)

  const bankedPts = buckets.map((b, i) => `${x(i).toFixed(1)},${y(b.cumulativeBanked).toFixed(1)}`)
  const potentialPts = buckets.map(
    (b, i) => `${x(i).toFixed(1)},${y(b.cumulativePotential).toFixed(1)}`,
  )
  const areaPts = [...bankedPts, `${W},${H - PAD_BOTTOM}`, `0,${H - PAD_BOTTOM}`].join(" ")

  const last = buckets[buckets.length - 1]
  const gridY = [0.25, 0.5, 0.75].map((f) => PAD_TOP + plotH * f)

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-[170px] w-full"
      >
        <defs>
          <linearGradient id="earnFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3aa86b" stopOpacity=".35" />
            <stop offset="1" stopColor="#3aa86b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridY.map((gy, i) => (
          <line key={i} x1="0" y1={gy} x2={W} y2={gy} stroke="var(--rule)" strokeDasharray="2 4" />
        ))}
        <polyline
          fill="none"
          stroke="var(--paper-faint)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          points={potentialPts.join(" ")}
        />
        <polygon fill="url(#earnFill)" points={areaPts} />
        <polyline fill="none" stroke="#3aa86b" strokeWidth="2.2" points={bankedPts.join(" ")} />
        <circle cx={x(buckets.length - 1)} cy={y(last.cumulativeBanked)} r="3.5" fill="#3aa86b" />
        <circle cx={x(buckets.length - 1)} cy={y(last.cumulativeBanked)} r="6" fill="#3aa86b" opacity=".25" />
      </svg>
      <div className="font-mono mt-1 flex justify-between text-[9.5px] uppercase tracking-[0.08em] text-paper-faint">
        {buckets.map((b) => (
          <span key={b.key}>{b.name}</span>
        ))}
      </div>
      <div className="font-mono mt-1 text-right text-[9px] uppercase tracking-[0.1em] text-paper-faint">
        peak {formatPayCompact(max)}
      </div>
    </div>
  )
}
