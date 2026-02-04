import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MapPin, BarChart3 } from 'lucide-react';

interface JobInsightsStatsProps {
  jobs: Array<{
    id: string;
    location?: string | null;
  }>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)', // green
  'hsl(217, 91%, 60%)', // blue
  'hsl(271, 91%, 65%)', // purple
  'hsl(38, 92%, 50%)',  // orange
  'hsl(340, 82%, 52%)', // pink
  'hsl(var(--muted-foreground))',
];

export function JobInsightsStats({ jobs }: JobInsightsStatsProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // Aggregate jobs by city
  const cityData = useMemo(() => {
    const cityMap: Record<string, number> = {};
    
    jobs.forEach(job => {
      if (job.location) {
        // Extract city name (first part before comma or full string)
        const city = job.location.split(',')[0].trim();
        cityMap[city] = (cityMap[city] || 0) + 1;
      } else {
        const unknownKey = isHebrew ? 'לא צוין' : 'Not specified';
        cityMap[unknownKey] = (cityMap[unknownKey] || 0) + 1;
      }
    });

    // Convert to array and sort by count
    const sorted = Object.entries(cityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Take top 6, group rest as "Other"
    if (sorted.length > 6) {
      const top6 = sorted.slice(0, 6);
      const otherCount = sorted.slice(6).reduce((sum, item) => sum + item.value, 0);
      top6.push({ name: isHebrew ? 'אחר' : 'Other', value: otherCount });
      return top6;
    }

    return sorted;
  }, [jobs, isHebrew]);

  if (jobs.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          {isHebrew ? 'התפלגות משרות לפי עיר' : 'Jobs by City'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={cityData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {cityData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    className="stroke-background"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [
                  `${value} ${isHebrew ? 'משרות' : 'jobs'}`,
                  ''
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                formatter={(value: string, entry: any) => (
                  <span className="text-xs text-foreground">
                    {value} ({entry.payload.value})
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
