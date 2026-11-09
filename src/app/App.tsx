import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useLunaStore } from '@/store/useLunaStore';
import { AppLayout } from './AppLayout';
import { WelcomePage } from '@/pages/WelcomePage';
import { SetupPage } from '@/pages/SetupPage';
import { HomePage } from '@/pages/HomePage';
import { CalendarPage } from '@/pages/CalendarPage';
import { CheckInPage } from '@/pages/CheckInPage';
import { SuccessPage } from '@/pages/SuccessPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { ArticlesPage } from '@/pages/ArticlesPage';
import { ArticlePage } from '@/pages/ArticlePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { MyDataPage } from '@/pages/MyDataPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { AboutPage } from '@/pages/AboutPage';

function RequireOnboarding() {
  const onboarded = useLunaStore((s) => s.profile.onboarded);
  return onboarded ? <Outlet /> : <Navigate to="/welcome" replace />;
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<RequireOnboarding />}>
          <Route element={<AppLayout tabs />}>
            <Route index element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:slug" element={<ArticlePage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route element={<AppLayout />}>
            <Route path="/checkin" element={<CheckInPage />} />
            <Route path="/profile/data" element={<MyDataPage />} />
            <Route path="/profile/notifications" element={<NotificationsPage />} />
            <Route path="/profile/privacy" element={<PrivacyPage />} />
            <Route path="/profile/about" element={<AboutPage />} />
          </Route>
          <Route path="/success" element={<SuccessPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
