import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RoleCard } from './RoleCard';
import { Button } from '@/components/ui/button';
import { PlugLogo } from '@/components/PlugLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Briefcase, Users, Building2, UserCircle, ArrowRight, ArrowLeft } from 'lucide-react';

type AppRole = 'job_seeker' | 'freelance_hr' | 'inhouse_hr' | 'company_employee';

interface IdentitySelectionProps {
  onSelect: (role: AppRole) => void;
}

export function IdentitySelection({ onSelect }: IdentitySelectionProps) {
  const { t, direction } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

  const roles: { key: AppRole; icon: typeof Briefcase }[] = [
    { key: 'job_seeker', icon: Briefcase },
    { key: 'freelance_hr', icon: Users },
    { key: 'inhouse_hr', icon: Building2 },
    { key: 'company_employee', icon: UserCircle },
  ];

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <PlugLogo size="md" />
        <LanguageToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <div className="w-full max-w-4xl">
          {/* Title section */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
              {t('identity.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('identity.subtitle')}
            </p>
          </div>

          {/* Role cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-10">
            {roles.map(({ key, icon }) => (
              <RoleCard
                key={key}
                title={t(`identity.${key}`)}
                description={t(`identity.${key}_desc`)}
                icon={icon}
                isSelected={selectedRole === key}
                onClick={() => setSelectedRole(key)}
              />
            ))}
          </div>

          {/* Continue button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              disabled={!selectedRole}
              onClick={() => selectedRole && onSelect(selectedRole)}
              className="min-w-[200px] gap-2 text-lg h-12"
            >
              {t('common.continue')}
              <ArrowIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </main>

      {/* Footer tagline */}
      <footer className="text-center py-6 text-muted-foreground">
        <p className="text-sm">{t('app.tagline')}</p>
      </footer>
    </div>
  );
}
