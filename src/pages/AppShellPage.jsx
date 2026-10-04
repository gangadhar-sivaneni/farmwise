import React, { useEffect, useRef } from 'react';
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
import { useFarm } from '../context/FarmContext';
import { useLanguage } from '../context/LanguageContext';
import Icon from '../components/common/Icon';

export default function AppShellPage({ subpage = 'overview' }) {
  const { plots, openPlotEditor } = useFarm();
  const { L } = useLanguage();
  const promptedRef = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [subpage]);

  // Strictly prompt the user to add their farm plot if they have not added one yet
  useEffect(() => {
    if (plots && plots.length === 0 && !promptedRef.current) {
      promptedRef.current = true;
      // Slight delay so the UI mounts cleanly
      const t = setTimeout(() => {
        openPlotEditor({});
      }, 350);
      return () => clearTimeout(t);
    }
  }, [plots, openPlotEditor]);

  return (
    <div className="screen on" id="s-app">
      <div className="shell">
        <AppSidebar currentPage={subpage} />
        <div className="mainc">
          <AppTopbar currentPage={subpage} />

          {/* Strict Notice Banner when no plots exist */}
          {plots && plots.length === 0 && (
            <div
              style={{
                margin: '12px 16px 0',
                padding: '12px 18px',
                background: 'linear-gradient(135deg, #FEF3C7, #FFFBEB)',
                border: '1.5px solid #F59E0B',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <span style={{ color: '#92400E', fontSize: '14.5px', fontWeight: '500' }}>
                  {L({
                    en: 'Strict Requirement: You have not added any farm plots yet. Please add your plot to enable live satellite weather, crop insights, and tasks.',
                    te: 'తప్పనిసరి: మీరు ఇంకా ఏ ప్లాట్‌ను జోడించలేదు. ప్రత్యక్ష వాతావరణం, పంట ప్రణాళిక మరియు పనుల కోసం మీ ప్లాట్‌ను జోడించండి.',
                  })}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-dark sm"
                style={{
                  background: '#B45309',
                  borderColor: '#92400E',
                  color: '#fff',
                  borderRadius: '6px',
                  fontWeight: '600',
                  padding: '6px 14px',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => openPlotEditor({})}
              >
                <Icon name="plus" className="ico sm" />
                <span>{L({ en: 'Add Plot Now (Strictly Required)', te: 'ఇప్పుడే ప్లాట్ జోడించండి' })}</span>
              </button>
            </div>
          )}

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
