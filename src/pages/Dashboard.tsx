import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { PlugChat } from '@/components/chat/PlugChat';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Dashboard() {
  const { role } = useAuth();
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome section */}
        <WelcomeCard />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Stats - placeholder for now */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('dashboard.overview')}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {role === 'job_seeker' ? (
                <>
                  <StatCard 
                    title="Applications" 
                    value="0" 
                    subtitle="Active applications"
                    color="primary"
                  />
                  <StatCard 
                    title="Interviews" 
                    value="0" 
                    subtitle="Scheduled"
                    color="accent"
                  />
                  <StatCard 
                    title="Documents" 
                    value="0" 
                    subtitle="Uploaded"
                    color="primary"
                  />
                  <StatCard 
                    title="Profile" 
                    value="50%" 
                    subtitle="Completion"
                    color="accent"
                  />
                </>
              ) : role === 'freelance_hr' || role === 'inhouse_hr' ? (
                <>
                  <StatCard 
                    title="Candidates" 
                    value="0" 
                    subtitle="In pipeline"
                    color="primary"
                  />
                  <StatCard 
                    title="Open Jobs" 
                    value="0" 
                    subtitle="Active positions"
                    color="accent"
                  />
                  <StatCard 
                    title="Interviews" 
                    value="0" 
                    subtitle="This week"
                    color="primary"
                  />
                  <StatCard 
                    title="Pending" 
                    value="0" 
                    subtitle="Documents to review"
                    color="accent"
                  />
                </>
              ) : (
                <>
                  <StatCard 
                    title="Documents" 
                    value="0" 
                    subtitle="To sign"
                    color="primary"
                  />
                  <StatCard 
                    title="Requests" 
                    value="0" 
                    subtitle="Pending"
                    color="accent"
                  />
                </>
              )}
            </div>

            {/* Recent Activity Placeholder */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-medium mb-4">{t('dashboard.recent_activity')}</h3>
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent activity yet.</p>
                <p className="text-sm mt-1">Start by chatting with Plug!</p>
              </div>
            </div>
          </div>

          {/* Chat with Plug */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Chat with Plug</h2>
            <PlugChat />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: 'primary' | 'accent';
}

function StatCard({ title, value, subtitle, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${color === 'primary' ? 'plug-row-active' : 'plug-ai-highlight'}`}>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color === 'primary' ? 'text-primary' : 'text-accent'}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}
