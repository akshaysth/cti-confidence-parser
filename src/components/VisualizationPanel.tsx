import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { WELMatch } from '../types';
import { TIER_META, TIER_ORDER } from '../types';
import { cn } from '../lib/utils';

interface Props {
  matches: WELMatch[];
}

export function VisualizationPanel({ matches }: Props) {
  // Tier distribution data for pie chart
  const tierData = useMemo(() => {
    const distribution: Record<string, number> = {};
    TIER_ORDER.forEach((tier) => {
      distribution[tier] = 0;
    });

    matches.forEach((m) => {
      distribution[m.entry.tier]++;
    });

    return TIER_ORDER.map((tier) => ({
      name: TIER_META[tier].label,
      value: distribution[tier],
      tier,
      color: getTierColor(tier),
    })).filter((d) => d.value > 0);
  }, [matches]);

  // Confidence distribution data for bar chart
  const confidenceData = useMemo(() => {
    const ranges = [
      { range: '0-20%', min: 0, max: 20, count: 0 },
      { range: '21-40%', min: 21, max: 40, count: 0 },
      { range: '41-60%', min: 41, max: 60, count: 0 },
      { range: '61-80%', min: 61, max: 80, count: 0 },
      { range: '81-100%', min: 81, max: 100, count: 0 },
    ];

    matches.forEach((m) => {
      const center = m.entry.kentCenter;
      const range = ranges.find((r) => center >= r.min && center <= r.max);
      if (range) range.count++;
    });

    return ranges.map((r) => ({
      range: r.range,
      count: r.count,
      fill: r.count > 0 ? '#3b82f6' : '#e2e8f0',
    }));
  }, [matches]);

  // Model confidence data (for validated matches)
  const modelConfidenceData = useMemo(() => {
    const validatedMatches = matches.filter((m) => m.status === 'done' && m.modelConfidence !== null);

    if (validatedMatches.length === 0) return [];

    const ranges = [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 },
    ];

    validatedMatches.forEach((m) => {
      const confidence = m.modelConfidence || 0;
      if (confidence <= 20) ranges[0].count++;
      else if (confidence <= 40) ranges[1].count++;
      else if (confidence <= 60) ranges[2].count++;
      else if (confidence <= 80) ranges[3].count++;
      else ranges[4].count++;
    });

    return ranges.filter((r) => r.count > 0);
  }, [matches]);

  // Statistics
  const stats = useMemo(() => {
    const validated = matches.filter((m) => m.status === 'done');
    const confirmed = matches.filter((m) => m.status === 'done' && m.modelIsWEL);
    const avgConfidence =
      validated.length > 0
        ? Math.round(
            validated.reduce((sum, m) => sum + (m.modelConfidence || 0), 0) / validated.length
          )
        : 0;

    return {
      total: matches.length,
      validated: validated.length,
      confirmed: confirmed.length,
      pending: matches.filter((m) => m.status === 'pending' || m.status === 'analyzing').length,
      errors: matches.filter((m) => m.status === 'error').length,
      avgConfidence,
    };
  }, [matches]);

  if (matches.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No data to visualize. Run an analysis first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} color="bg-slate-100" textColor="text-slate-700" />
        <StatCard
          label="Validated"
          value={stats.validated}
          color="bg-blue-50"
          textColor="text-blue-700"
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmed}
          color="bg-emerald-50"
          textColor="text-emerald-700"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          color="bg-amber-50"
          textColor="text-amber-700"
        />
        <StatCard
          label="Avg Model Conf"
          value={`${stats.avgConfidence}%`}
          color="bg-purple-50"
          textColor="text-purple-700"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Tier Distribution Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-800 mb-4">Tier Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Distribution Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-800 mb-4">Kent Confidence Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Confidence Chart (if available) */}
        {modelConfidenceData.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 col-span-2">
            <h3 className="text-sm font-medium text-slate-800 mb-4">Model Confidence Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelConfidenceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  textColor,
}: {
  label: string;
  value: string | number;
  color: string;
  textColor: string;
}) {
  return (
    <div className={cn('rounded-lg p-3 text-center', color)}>
      <p className={cn('text-2xl font-bold', textColor)}>{value}</p>
      <p className="text-xs text-slate-600 mt-0.5">{label}</p>
    </div>
  );
}

function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    certain: '#10b981',
    probable: '#84cc16',
    even: '#3b82f6',
    unlikely: '#f59e0b',
    remote: '#f43f5e',
  };
  return colors[tier] || '#94a3b8';
}
