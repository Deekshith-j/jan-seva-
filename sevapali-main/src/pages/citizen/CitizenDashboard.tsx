import React from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTokens } from '@/hooks/useTokens';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  MapPin,
  Calendar,
  Bot,
  TrendingUp,
} from 'lucide-react';
import AshokaLoader from '@/components/ui/AshokaLoader';

const CitizenDashboard: React.FC = () => {
  const { language } = useLanguage();
  const { user, profile } = useAuth();

  // Real Data Hook
  const { data: tokens = [], isLoading } = useMyTokens();

  // Calculate Stats
  const activeCount = tokens.filter(t => ['pending', 'checked_in', 'waiting', 'serving'].includes(t.status)).length;
  const completedCount = tokens.filter(t => t.status === 'completed').length;
  const inQueuePosition = tokens.find(t => t.status === 'waiting' || t.status === 'pending' || t.status === 'checked_in')?.position_in_queue || '-';

  // Calculate Avg Wait (Mock for now as we don't have global stats here, or derive from active token)
  const estWait = tokens.find(t => t.status === 'waiting')?.estimated_wait_minutes || 0;

  const stats = [
    {
      label: language === 'mr' ? 'सक्रिय टोकन' : 'Active Tokens',
      value: activeCount.toString(),
      icon: Ticket,
      color: 'bg-primary',
      trend: 'Current',
    },
    {
      label: language === 'mr' ? 'अंदाजित प्रतीक्षा' : 'Est. Wait Time',
      value: `${estWait} min`,
      icon: Clock,
      color: 'bg-accent',
      trend: 'For next token',
    },
    {
      label: language === 'mr' ? 'पूर्ण झाले' : 'Completed',
      value: completedCount.toString(),
      icon: CheckCircle,
      color: 'bg-success',
      trend: 'Total',
    },
    {
      label: language === 'mr' ? 'रांगेत' : 'In Queue',
      value: inQueuePosition.toString(),
      icon: AlertCircle,
      color: 'bg-warning',
      trend: 'Your Position',
    },
  ];

  const activeTokensList = tokens.filter(t => ['pending', 'checked_in', 'waiting', 'serving'].includes(t.status));

  const quickActions = [
    {
      label: language === 'mr' ? 'नवीन टोकन बुक करा' : 'Book New Token',
      icon: Ticket,
      path: '/citizen/book-token',
      color: 'bg-primary',
    },
    {
      label: language === 'mr' ? 'शासकीय योजना' : 'Government Schemes',
      icon: TrendingUp,
      path: '/schemes',
      color: 'bg-success',
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {language === 'mr' ? 'नमस्कार' : 'Welcome'}, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'mr'
                ? 'आजची तुमची रांग स्थिती येथे आहे'
                : "Here's your queue status for today"}
            </p>
          </div>
          <Link to="/citizen/book-token">
            <Button variant="hero" size="lg">
              <Ticket className="h-5 w-5" />
              {language === 'mr' ? 'नवीन टोकन' : 'New Token'}
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} variant="stat">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                  </div>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${stat.color} flex items-center justify-center shadow-md`}>
                    <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Tokens */}
          <div className="lg:col-span-2">
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {language === 'mr' ? 'माझे टोकन' : 'My Tokens'}
                  </CardTitle>
                  <Link to="/citizen/my-tokens">
                    <Button variant="ghost" size="sm">
                      {language === 'mr' ? 'सर्व पहा' : 'View All'}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center py-8"><AshokaLoader /></div>
                ) : activeTokensList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {language === 'mr' ? 'कोणतेही सक्रिय टोकन नाही' : 'No active tokens found'}
                  </div>
                ) : (
                  activeTokensList.map((token) => (
                    <div
                      key={token.id}
                      className="p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={token.status === 'serving' ? 'success' : token.status === 'waiting' ? 'default' : 'secondary'}>
                              {token.status === 'serving' ? (language === 'mr' ? 'सेवेत' : 'Now Serving') :
                                token.status === 'waiting' ? (language === 'mr' ? 'चेक-इन केले' : 'Checked In') :
                                  token.status === 'pending' ? (language === 'mr' ? 'बुक केले' : 'Booked') :
                                    token.status.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-mono text-muted-foreground">{token.token_number}</span>
                          </div>
                          <h3 className="font-semibold text-foreground">{token.service_name}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {token.office_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {token.appointment_date}, {token.appointment_time}
                            </span>
                          </div>
                        </div>
                        {(token.status === 'waiting' || token.status === 'serving') && (
                          <div className="flex items-center gap-4">
                            <div className="text-center px-4 py-2 bg-primary/10 rounded-xl">
                              <p className="text-2xl font-bold text-primary">#{token.position_in_queue ?? '-'}</p>
                              <p className="text-xs text-muted-foreground">
                                {language === 'mr' ? 'रांगेत' : 'In Queue'}
                              </p>
                            </div>
                            <div className="text-center px-4 py-2 bg-accent/10 rounded-xl">
                              <p className="text-2xl font-bold text-accent">{token.estimated_wait_minutes ?? '0'}</p>
                              <p className="text-xs text-muted-foreground">
                                {language === 'mr' ? 'मिनिटे' : 'min wait'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {language === 'mr' ? 'द्रुत क्रिया' : 'Quick Actions'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action, index) => (
                  <Link key={index} to={action.path}>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                      <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center shadow-md`}>
                        <action.icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <span className="font-medium text-foreground flex-1">{action.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CitizenDashboard;
