import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, Briefcase, TrendingUp, Activity, FileText, DollarSign,
  Award, CreditCard, Users, Target, Globe, Calendar, Star, ShoppingBag,
  Building2, Heart, UserCheck, MessageCircle, BarChart2, PieChart, ArrowRight, ArrowLeft,
} from 'lucide-react';

// Lazy import report components
import { ReportApplications } from './job-seeker/ReportApplications';
import { ReportMarketFit } from './job-seeker/ReportMarketFit';
import { ReportWeeklyActivity } from './job-seeker/ReportWeeklyActivity';
import { ReportSkillsVsMarket } from './job-seeker/ReportSkillsVsMarket';
import { ReportInterviews } from './job-seeker/ReportInterviews';
import { ReportSalary } from './job-seeker/ReportSalary';
import { ReportVouches } from './job-seeker/ReportVouches';
import { ReportCredits } from './job-seeker/ReportCredits';
import { ReportMonthlyHiring } from './hr/ReportMonthlyHiring';
import { ReportPipeline } from './hr/ReportPipeline';
import { ReportSources } from './hr/ReportSources';
import { ReportCandidates } from './hr/ReportCandidates';
import { ReportOpenJobs } from './hr/ReportOpenJobs';
import { ReportMissions } from './hr/ReportMissions';
import { ReportCRM } from './hr/ReportCRM';
import { ReportRevenue } from './hr/ReportRevenue';
import { ReportCompanyJobs } from './company/ReportCompanyJobs';
import { ReportCompanyCandidates } from './company/ReportCompanyCandidates';
import { ReportCareerSite } from './company/ReportCareerSite';
import { ReportCompanyInterviews } from './company/ReportCompanyInterviews';
import { ReportOffers } from './company/ReportOffers';
import { ReportCompanyVouches } from './company/ReportCompanyVouches';
import { ReportDEI } from './company/ReportDEI';
import { ReportCandidateExperience } from './company/ReportCandidateExperience';

interface ReportCard {
  id: string;
  icon: typeof BarChart3;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  component: React.ComponentType;
}

export function ReportsHub() {
  const { role } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const jobSeekerReports: ReportCard[] = [
    { id: 'applications', icon: Briefcase, titleHe: 'דוח מועמדויות', titleEn: 'Applications Report', descHe: 'מעקב אחר כל ההגשות שלך', descEn: 'Track all your applications', component: ReportApplications },
    { id: 'market-fit', icon: TrendingUp, titleHe: 'דוח התאמה לשוק', titleEn: 'Market Fit Report', descHe: 'כמה משרות מתאימות לפרופיל שלך', descEn: 'How many jobs match your profile', component: ReportMarketFit },
    { id: 'weekly', icon: Activity, titleHe: 'פעילות שבועית', titleEn: 'Weekly Activity', descHe: 'פעילות השבוע לעומת שבוע שעבר', descEn: 'This week vs last week activity', component: ReportWeeklyActivity },
    { id: 'skills', icon: BarChart3, titleHe: 'מיומנויות מול שוק', titleEn: 'Skills vs Market', descHe: 'הסקילים שלך מול ביקוש השוק', descEn: 'Your skills vs market demand', component: ReportSkillsVsMarket },
    { id: 'interviews', icon: Calendar, titleHe: 'דוח ראיונות', titleEn: 'Interviews Report', descHe: 'ראיונות, ציונים וסטטוסים', descEn: 'Interviews, scores, and statuses', component: ReportInterviews },
    { id: 'salary', icon: DollarSign, titleHe: 'דוח שכר', titleEn: 'Salary Report', descHe: 'השוואת שכר לפי תפקיד ומיקום', descEn: 'Salary comparison by role and location', component: ReportSalary },
    { id: 'vouches', icon: Award, titleHe: 'דוח Vouches', titleEn: 'Vouches Report', descHe: 'ההמלצות שקיבלת וחוזק שלהן', descEn: 'Your endorsements and their strength', component: ReportVouches },
    { id: 'credits', icon: CreditCard, titleHe: 'דוח קרדיטים', titleEn: 'Credits Report', descHe: 'יתרה, הוצאות וצבירה', descEn: 'Balance, expenses, and earnings', component: ReportCredits },
  ];

  const hrReports: ReportCard[] = [
    { id: 'monthly-hiring', icon: BarChart3, titleHe: 'גיוס חודשי', titleEn: 'Monthly Hiring', descHe: 'funnel גיוס ו-time-to-hire', descEn: 'Hiring funnel and time-to-hire', component: ReportMonthlyHiring },
    { id: 'pipeline', icon: Target, titleHe: 'Pipeline', titleEn: 'Pipeline', descHe: 'מועמדים לפי שלב', descEn: 'Candidates by stage', component: ReportPipeline },
    { id: 'sources', icon: PieChart, titleHe: 'מקורות מועמדים', titleEn: 'Candidate Sources', descHe: 'מאיפה מגיעים המועמדים שלך', descEn: 'Where your candidates come from', component: ReportSources },
    { id: 'candidates', icon: Users, titleHe: 'מועמדים פעילים', titleEn: 'Active Candidates', descHe: 'כל המועמדים בתהליך', descEn: 'All candidates in process', component: ReportCandidates },
    { id: 'open-jobs', icon: Briefcase, titleHe: 'משרות פתוחות', titleEn: 'Open Jobs', descHe: 'משרות פתוחות ועלות vacancy', descEn: 'Open jobs and vacancy cost', component: ReportOpenJobs },
    { id: 'missions', icon: Star, titleHe: 'Missions', titleEn: 'Missions', descHe: 'פרויקטי גיוס ו-bids', descEn: 'Recruitment projects and bids', component: ReportMissions },
    { id: 'crm', icon: Building2, titleHe: 'CRM לקוחות', titleEn: 'CRM Report', descHe: 'לקוחות, משרות ועדכונים', descEn: 'Clients, jobs, and updates', component: ReportCRM },
    { id: 'revenue', icon: DollarSign, titleHe: 'הכנסות', titleEn: 'Revenue', descHe: 'placements והכנסות לפי לקוח', descEn: 'Placements and revenue by client', component: ReportRevenue },
  ];

  const companyReports: ReportCard[] = [
    { id: 'company-jobs', icon: Briefcase, titleHe: 'משרות', titleEn: 'Jobs Report', descHe: 'משרות פתוחות, זמן ממוצע, מועמדים', descEn: 'Open jobs, avg time, candidates', component: ReportCompanyJobs },
    { id: 'company-candidates', icon: Users, titleHe: 'מועמדים', titleEn: 'Candidates', descHe: 'כל המועמדים שהגישו לחברה', descEn: 'All candidates who applied', component: ReportCompanyCandidates },
    { id: 'career-site', icon: Globe, titleHe: 'Career Site', titleEn: 'Career Site', descHe: 'צפיות, מקורות, conversion', descEn: 'Views, sources, conversion', component: ReportCareerSite },
    { id: 'company-interviews', icon: Calendar, titleHe: 'ראיונות', titleEn: 'Interviews', descHe: 'ראיונות, scorecards, המלצות', descEn: 'Interviews, scorecards, recommendations', component: ReportCompanyInterviews },
    { id: 'offers', icon: FileText, titleHe: 'הצעות עבודה', titleEn: 'Offers', descHe: 'הצעות שנשלחו, התקבלו, נדחו', descEn: 'Offers sent, accepted, declined', component: ReportOffers },
    { id: 'company-vouches', icon: Heart, titleHe: 'Vouches', titleEn: 'Vouches', descHe: 'vouches שניתנו והתקבלו', descEn: 'Vouches given and received', component: ReportCompanyVouches },
    { id: 'dei', icon: UserCheck, titleHe: 'גיוון והכלה', titleEn: 'DEI Report', descHe: 'Blind Hiring ויעדי גיוון', descEn: 'Blind Hiring and diversity goals', component: ReportDEI },
    { id: 'candidate-experience', icon: MessageCircle, titleHe: 'חוויית מועמדים', titleEn: 'Candidate Experience', descHe: 'NPS, דירוגים, משוב', descEn: 'NPS, ratings, feedback', component: ReportCandidateExperience },
  ];

  const getReports = (): ReportCard[] => {
    if (role === 'job_seeker') return jobSeekerReports;
    if (role === 'freelance_hr' || role === 'inhouse_hr') return hrReports;
    if (role === 'company_employee') return companyReports;
    return jobSeekerReports;
  };

  const reports = getReports();
  const activeReportCard = reports.find(r => r.id === activeReport);
  const ActiveComponent = activeReportCard?.component;

  if (activeReport && ActiveComponent) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 no-print"
          onClick={() => setActiveReport(null)}
        >
          {isHebrew ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isHebrew ? 'חזרה לדוחות' : 'Back to Reports'}
        </Button>
        <ActiveComponent />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          {isHebrew ? 'מרכז הדוחות' : 'Reports Center'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isHebrew ? `${reports.length} דוחות מוכנים עם נתונים אמיתיים` : `${reports.length} ready reports with real data`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="cursor-pointer transition-all duration-200 hover:border-primary/50 hover:scale-[1.02] bg-card border-border"
              onClick={() => setActiveReport(report.id)}
            >
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">
                  {isHebrew ? report.titleHe : report.titleEn}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isHebrew ? report.descHe : report.descEn}
                </p>
                <Button variant="ghost" size="sm" className="mt-3 w-full text-primary hover:text-primary">
                  {isHebrew ? 'צפה בדוח ←' : 'View Report →'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
