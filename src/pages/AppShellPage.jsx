import React, { useEffect } from 'react';
import AppSidebar from '../components/app/AppSidebar';
import AppTopbar from '../components/app/AppTopbar';
import CropDetailModal from '../components/app/CropDetailModal';
import CompareTray from '../components/app/CompareTray';
import OverviewPage from './app/OverviewPage';
import CropsPage from './app/CropsPage';
import PlannerPage from './app/PlannerPage';
import WeatherPage from './app/WeatherPage';
import SoilPage from './app/SoilPage';
import ScanPage from './app/ScanPage';
import MarketPage from './app/MarketPage';
import TasksPage from './app/TasksPage';
import ProfilePage from './app/ProfilePage';

export default function AppShellPage({ subpage = 'overview' }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [subpage]);

  return (
    <div className="screen on" id="s-app">
      <div className="shell">
        <AppSidebar currentPage={subpage} />
        <div className="mainc">
          <AppTopbar currentPage={subpage} />
          {subpage === 'overview' && <OverviewPage />}
          {subpage === 'crops' && <CropsPage />}
          {subpage === 'planner' && <PlannerPage />}
          {subpage === 'weather' && <WeatherPage />}
          {subpage === 'soil' && <SoilPage />}
          {subpage === 'scan' && <ScanPage />}
          {subpage === 'market' && <MarketPage />}
          {subpage === 'tasks' && <TasksPage />}
          {subpage === 'profile' && <ProfilePage />}
        </div>
      </div>
      <CompareTray />
      <CropDetailModal />
    </div>
  );
}
