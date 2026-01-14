import { useAuth } from '@/contexts/AuthContext';
import AuthPage from './Auth';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading PLUG...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={() => {}} />;
  }

  return <Dashboard />;
};

export default Index;
