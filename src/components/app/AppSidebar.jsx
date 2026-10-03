import React from 'react';
import BrandMark from '../common/BrandMark';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { FARMS } from '../../data/farmsData';
import { TASKS, getTodayDateStr } from '../../data/tasksData';

export default function AppSidebar({ currentPage }) {
  const { t, L, showToast, W } = useLanguage();
  const { farmKey, setFarmKey, tasksDone, setSignedIn, getDailyTasks } = useApp();

  const todayTasks = getDailyTasks ? getDailyTasks(getTodayDateStr()) : TASKS;
  const unfinishedCount = todayTasks.filter((task) => !task.completed).length;

  const navItems = [
    { page: 'overview', icon: 'grid', labelKey: 'p.overview', defaultLabel: 'Overview' },
    { page: 'crops', icon: 'sprout', labelKey: 'p.crops', defaultLabel: 'Crops' },
    { page: 'planner', icon: 'rupee', labelKey: 'p.planner', defaultLabel: 'Profit Planner' },
    { page: 'weather', icon: 'cloudsun', labelKey: 'p.weather', defaultLabel: 'Weather' },
    { page: 'soil', icon: 'layers', labelKey: 'p.soil', defaultLabel: 'Soil Health' },
    { page: 'scan', icon: 'scan', labelKey: 'p.scan', defaultLabel: 'Crop Scan' },
    { page: 'market', icon: 'store', labelKey: 'p.market', defaultLabel: 'Market & Shops' },
    {
      page: 'tasks',
      icon: 'check-sq',
      labelKey: 'p.tasks',
      defaultLabel: "Today’s Tasks",
      badge: unfinishedCount,
    },
  ];

  const handleLogout = () => {
    setSignedIn(false);
    window.location.hash = '#/';
    showToast(W.bye);
  };

  return (
    <aside className="panel side">
      <a href="#/app/overview" className="logo">
        <BrandMark />
        <span>
          <b>FarmWise</b>
          <small>{t('brand.sub', 'Smart Farming Platform')}</small>
        </span>
      </a>

      <div className="side-farm">
        <label htmlFor="farmSel">{t('dash.farm', 'Active farm')}</label>
        <select
          id="farmSel"
          className="select"
          value={farmKey}
          onChange={(e) => setFarmKey(e.target.value)}
        >
          <option value="a">{L(FARMS.a.name)}</option>
          <option value="b">{L(FARMS.b.name)}</option>
        </select>
      </div>

      <nav className="snav" aria-label="App">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <a
              key={item.page}
              href={`#/app/${item.page}`}
              className={isActive ? 'on' : ''}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon name={item.icon} className="ico" />
              <span>{t(item.labelKey, item.defaultLabel)}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="badge" id="taskBadge">
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      <div className="side-foot">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ justifyContent: 'flex-start' }}
          id="logout"
          onClick={handleLogout}
        >
          <Icon name="logout" className="ico" />
          <span>{t('logout', 'Log out')}</span>
        </button>
      </div>
    </aside>
  );
}
