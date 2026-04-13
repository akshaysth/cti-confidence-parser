import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { WELMatch, WELTier } from '../types';
import { TIER_ORDER } from '../lib/welDatabase';

interface Props {
  matches: WELMatch[];
}

const TIER_LABEL: Record<WELTier, string> = {
  certain: 'Certain',
  probable: 'Probable',
  even: 'Even',
  unlikely: 'Unlikely',
  remote: 'Remote',
};

const TIER_HEX: Record<WELTier, string> = {
  certain: '#15803d',
  probable: '#4d7c0f',
  even: '#0369a1',
  unlikely: '#b45309',
  remote: '#b91c1c',
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-card border-l-[3px] border-l-primary/20 pl-4 pr-5 py-4 rounded-sm shadow-[0_1px_3px_rgba(4,22,39,0.05)]">
      <p className="font-meta text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </p>
      <p className={`font-sans font-bold tabular-nums text-3xl ${accent ?? 'text-primary'}`}>
        {value}
      </p>
      {sub && (
        <p className="font-meta text-xs text-muted-foreground mt-1">{sub}</p>
      )}
    </div>
  );
}

export function SummaryStats({ matches }: Props) {
  const total = matches.length;
  const confirmed = matches.filter((m) => m.status === 'done' && m.modelIsWEL).length;
  const pending = matches.filter((m) => m.status === 'pending' || m.status === 'analyzing').length;

  const avgCenter =
    total > 0
      ? Math.round(matches.reduce((s, m) => s + m.entry.kentCenter, 0) / total)
      : 0;

  const withConf = matches.filter((m) => m.modelConfidence !== null);
  const avgConf =
    withConf.length > 0
      ? Math.round(withConf.reduce((s, m) => s + (m.modelConfidence ?? 0), 0) / withConf.length)
      : null;

  const tierData = TIER_ORDER.map((tier) => ({
    name: TIER_LABEL[tier],
    count: matches.filter((m) => m.entry.tier === tier).length,
    tier,
  }));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="WEL Instances"
        value={total}
        sub={pending > 0 ? `${pending} analyzing…` : `${confirmed} model-confirmed`}
      />
      <StatCard
        label="Avg Kent Center"
        value={total > 0 ? `${avgCenter}%` : '—'}
        sub="across all WEL terms"
        accent="text-primary"
      />
      <StatCard
        label="Model Confidence"
        value={avgConf !== null ? `${avgConf}%` : '—'}
        sub="avg WEL usage confidence"
        accent="text-tier-certain"
      />

      {/* Tier distribution chart */}
      <div className="bg-card border-l-[3px] border-l-primary/20 pl-4 pr-3 py-4 rounded-sm shadow-[0_1px_3px_rgba(4,22,39,0.05)]">
        <p className="font-meta text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          By Tier
        </p>
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={tierData} barSize={12} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#9ca3af', fontSize: 8, fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'Inter',
                boxShadow: '0 4px 12px rgba(4,22,39,0.08)',
              }}
              itemStyle={{ color: '#191c1e' }}
              cursor={{ fill: 'rgba(4,22,39,0.04)' }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {tierData.map((d) => (
                <Cell key={d.tier} fill={TIER_HEX[d.tier]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
