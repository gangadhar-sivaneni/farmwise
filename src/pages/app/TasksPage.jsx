import React, { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import {
  CATEGORIES,
  TIME_SLOTS,
  getTodayDateStr,
  formatDateKey,
  parseDateStr,
  loadAllDailyTasks
} from '../../data/tasksData';

export default function TasksPage() {
  const { t, L, loc, W, lang } = useLanguage();
  const {
    weatherData,
    weatherLoading,
    weatherError,
    dailyTasksVer,
    getDailyTasks,
    toggleDailyTask,
    addDailyTask,
    editDailyTask,
    deleteDailyTask
  } = useApp();

  const [todayStr, setTodayStr] = useState(() => getTodayDateStr());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const localDateRef = useRef(todayStr);
  useEffect(() => {
    const refreshLocalDate = () => {
      const currentDate = getTodayDateStr();
      if (currentDate !== localDateRef.current) {
        const previousDate = localDateRef.current;
        localDateRef.current = currentDate;
        setTodayStr(currentDate);
        if (selectedDate === previousDate) {
          setSelectedDate(currentDate);
          const today = parseDateStr(currentDate);
          setViewYear(today.getFullYear());
          setViewMonth(today.getMonth());
        }
      }
    };
    const interval = setInterval(refreshLocalDate, 60 * 1000);
    window.addEventListener('focus', refreshLocalDate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshLocalDate);
    };
  }, [selectedDate]);

  // Calendar month view (year & 0-indexed month)
  const initialDate = useMemo(() => parseDateStr(todayStr), [todayStr]);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  // Form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    desc: '',
    field: '',
    timeOfDay: 'Morning',
    duration: '20 min',
    category: 'crop'
  });

  // Mobile calendar toggle
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  // Current date's tasks
  const tasks = useMemo(() => {
    return getDailyTasks(selectedDate);
  }, [getDailyTasks, selectedDate, dailyTasksVer]);

  // Completion stats for selected date
  const doneCount = tasks.filter((t) => t.completed).length;
  const isAllDone = tasks.length > 0 && doneCount === tasks.length;
  const isToday = selectedDate === todayStr;
  const hasWeatherForSelectedDate = isToday
    ? !!weatherData?.current
    : !!weatherData?.forecast?.some((day) => day.dateStr === selectedDate);
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
  const ringCircumference = 2 * Math.PI * 15; // r=15 -> ~94.25
  const ringOffset = ringCircumference * (1 - (tasks.length > 0 ? doneCount / tasks.length : 0));

  // Date object for selected date
  const selectedDateObj = useMemo(() => parseDateStr(selectedDate), [selectedDate]);

  // Formatted date string (e.g. "Saturday, 3 October 2026")
  const formattedSelectedDate = useMemo(() => {
    return selectedDateObj.toLocaleDateString(loc, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [selectedDateObj, loc]);

  // Short formatted date for headers
  const shortDate = useMemo(() => {
    return selectedDateObj.toLocaleDateString(loc, {
      month: 'short',
      day: 'numeric'
    });
  }, [selectedDateObj, loc]);

  // Month title for calendar (e.g. "October 2026")
  const currentMonthTitle = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleDateString(loc, {
      month: 'long',
      year: 'numeric'
    });
  }, [viewYear, viewMonth, loc]);

  // History map of completed tasks by date for the calendar dots
  const completedHistoryMap = useMemo(() => {
    const store = loadAllDailyTasks() || {};
    const map = {};
    Object.keys(store).forEach((dStr) => {
      const dayTasks = store[dStr];
      const recordTasks = Array.isArray(dayTasks)
        ? dayTasks
        : [
          ...(dayTasks?.added || []),
          ...(dayTasks?.suggestions || [])
            .filter((task) => !(dayTasks?.deleted || []).includes(task.id))
            .map((task) => ({ ...task, ...(dayTasks?.changes?.[task.id] || {}) })),
        ];
      if (recordTasks.length) {
        const completed = recordTasks.filter((t) => t.completed).length;
        if (completed > 0) {
          map[dStr] = {
            completed,
            total: recordTasks.length,
            isAll: completed === recordTasks.length
          };
        }
      }
    });
    return map;
  }, [dailyTasksVer]);

  // Calendar Grid Days calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    // Monday as first day of week: (0 is Sunday, so offset = (firstDayIndex + 6) % 7)
    const startOffset = (firstDayIndex + 6) % 7;
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const d = new Date(viewYear, viewMonth - 1, dayNum);
      const dateStr = formatDateKey(d);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isPrev: true
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const d = new Date(viewYear, viewMonth, dayNum);
      const dateStr = formatDateKey(d);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: true
      });
    }

    // Next month padding to fill grid to multiple of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(viewYear, viewMonth + 1, dayNum);
      const dateStr = formatDateKey(d);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isNext: true
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Navigate calendar months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Quick Day navigation
  const handleStepDay = (step) => {
    const d = parseDateStr(selectedDate);
    d.setDate(d.getDate() + step);
    const newDateStr = formatDateKey(d);
    setSelectedDate(newDateStr);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  // Jump to Today
  const handleReturnToToday = () => {
    const today = parseDateStr(todayStr);
    setSelectedDate(todayStr);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Select a calendar day
  const handleSelectDay = (day) => {
    setSelectedDate(day.dateStr);
    const d = parseDateStr(day.dateStr);
    if (!day.isCurrentMonth) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setTaskForm({
      title: '',
      desc: '',
      field: '',
      timeOfDay: 'Morning',
      duration: '20 min',
      category: 'crop'
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (task, e) => {
    e.stopPropagation();
    setEditingTask(task);
    setTaskForm({
      title: typeof task.title === 'object' ? L(task.title) : (task.title || L(task.t) || ''),
      desc: typeof task.desc === 'object' ? L(task.desc) : (task.desc || L(task.d) || ''),
      field: task.field || '',
      timeOfDay: task.timeOfDay || 'Morning',
      duration: task.duration || '20 min',
      category: task.category || 'general'
    });
  };

  // Submit Add Task
  const handleSaveNewTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    addDailyTask(selectedDate, {
      title: taskForm.title.trim(),
      desc: taskForm.desc.trim(),
      field: taskForm.field.trim(),
      timeOfDay: taskForm.timeOfDay,
      duration: taskForm.duration,
      category: taskForm.category
    });
    setIsAddModalOpen(false);
  };

  // Submit Edit Task
  const handleSaveEditTask = (e) => {
    e.preventDefault();
    if (!editingTask || !taskForm.title.trim()) return;
    editDailyTask(selectedDate, editingTask.id, {
      title: taskForm.title.trim(),
      desc: taskForm.desc.trim(),
      field: taskForm.field.trim(),
      timeOfDay: taskForm.timeOfDay,
      duration: taskForm.duration,
      category: taskForm.category
    });
    setEditingTask(null);
  };

  // Delete Task Flow
  const promptDeleteTask = (task, e) => {
    e.stopPropagation();
    setDeletingTask(task);
  };

  const handleConfirmDelete = () => {
    if (!deletingTask) return;
    deleteDailyTask(selectedDate, deletingTask.id);
    setDeletingTask(null);
  };

  // Days of week labels (Monday to Sunday)
  const weekDays = lang === 'te'
    ? ['సోమ', 'మంగళ', 'బుధ', 'గురు', 'శుక్ర', 'శని', 'ఆది']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <section className="panel page" data-page="tasks" style={{ display: 'block' }}>
      {/* 1. Header with Compact Completion Indicator */}
      <div className="page-h fw-tasks-header">
        <div>
          <h1>{t('today.q', 'What should I do today?')}</h1>
          <p>
            {isToday
              ? t('today.p', 'Based on farm records and available weather for today.')
              : `${t('today.historyFor', 'Viewing task history for')} ${shortDate}`}
          </p>
        </div>

        {/* Compact Progress Summary (Requirement 1: smaller circle, readable "2 of 5 done", no debug outline) */}
        <div
          className="fw-compact-progress"
          role="status"
          aria-label={`${doneCount} of ${tasks.length} tasks completed`}
        >
          <div className="fw-compact-ring-box">
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#CEE2E3"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#192F0B"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="94.25"
                strokeDashoffset={ringOffset}
                transform="rotate(-90 18 18)"
                style={{ transition: 'stroke-dashoffset .4s var(--ease)' }}
              />
            </svg>
            <div className="fw-compact-ring-pct">
              {isAllDone && tasks.length > 0 ? (
                <Icon name="check" className="ico xs" />
              ) : (
                <span>{`${pct}%`}</span>
              )}
            </div>
          </div>

          <div className="fw-compact-text">
            <b>{`${doneCount} of ${tasks.length} ${isToday ? t('today.done', 'done') : t('today.completed', 'completed')}`}</b>
            <span className="muted">
              {isAllDone && tasks.length > 0
                ? t('today.allDoneShort', 'All completed ✨')
                : `${tasks.length - doneCount} ${t('today.left', 'remaining')}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout (Calendar + Tasks) */}
      <div className="fw-tasks-layout">
        {/* Left Column: Calendar & Date Navigator */}
        <aside className="fw-tasks-sidebar">
          {/* Monthly Calendar Card */}
          <div className="card fw-calendar-card">
            {/* Calendar Month Header */}
            <div className="fw-cal-header">
              <div className="fw-cal-title-row">
                <span className="fw-cal-month">{currentMonthTitle}</span>
                <div className="fw-cal-nav-btns">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={handlePrevMonth}
                    aria-label={t('today.prevMonth', 'Previous month')}
                    title="Previous month"
                  >
                    <Icon name="chevron-left" className="ico sm" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={handleNextMonth}
                    aria-label={t('today.nextMonth', 'Next month')}
                    title="Next month"
                  >
                    <Icon name="chevron-right" className="ico sm" />
                  </button>
                </div>
              </div>

              {!isToday && (
                <button
                  type="button"
                  className="fw-today-jump-btn"
                  onClick={handleReturnToToday}
                  aria-label={t('today.return', 'Return to Today')}
                >
                  <Icon name="calendar" className="ico xs" />
                  <span>{t('today.return', 'Return to Today')}</span>
                </button>
              )}
            </div>

            {/* Days of Week Header */}
            <div className="fw-cal-grid-header">
              {weekDays.map((w, idx) => (
                <span key={idx} className="fw-cal-day-label">
                  {w}
                </span>
              ))}
            </div>

            {/* Monthly Calendar Grid */}
            <div className="fw-cal-grid">
              {calendarDays.map((day) => {
                const isSelected = day.dateStr === selectedDate;
                const isDayToday = day.dateStr === todayStr;
                const history = completedHistoryMap[day.dateStr];
                const hasTasksCompleted = !!history && history.completed > 0;

                let cellClass = 'fw-cal-cell';
                if (!day.isCurrentMonth) cellClass += ' muted-month';
                if (isDayToday) cellClass += ' is-today';
                if (isSelected) cellClass += ' is-selected';

                return (
                  <button
                    type="button"
                    key={day.dateStr}
                    className={cellClass}
                    onClick={() => handleSelectDay(day)}
                    aria-label={`${day.dateStr}, ${hasTasksCompleted ? `${history.completed} of ${history.total} tasks completed` : 'tasks'}`}
                    aria-selected={isSelected}
                  >
                    <span className="fw-cal-num">{day.dayNum}</span>
                    {hasTasksCompleted && (
                      <span
                        className={`fw-cal-dot ${history.isAll ? 'complete' : ''}`}
                        title={`${history.completed} completed`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="fw-cal-legend">
              <div className="fw-cal-legend-item">
                <span className="fw-cal-legend-dot today-border" />
                <span>{t('today', 'Today')}</span>
              </div>
              <div className="fw-cal-legend-item">
                <span className="fw-cal-legend-dot green-dot" />
                <span>{t('today.hasDone', 'Has completed tasks')}</span>
              </div>
            </div>
          </div>

          {/* Quick Date Stepper & Status Card */}
          <div className="card fw-date-stepper-card">
            <div className="fw-stepper-header">
              <span className="fw-stepper-label">{t('today.selectedDay', 'Selected Date')}</span>
              <div className="fw-stepper-arrows">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => handleStepDay(-1)}
                  aria-label={t('today.prevDay', 'Previous day')}
                  title="Previous day"
                >
                  <Icon name="chevron-left" className="ico sm" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => handleStepDay(1)}
                  aria-label={t('today.nextDay', 'Next day')}
                  title="Next day"
                >
                  <Icon name="chevron-right" className="ico sm" />
                </button>
              </div>
            </div>

            <div className="fw-stepper-body">
              <b className="fw-stepper-date">{formattedSelectedDate}</b>
              <div className="fw-stepper-tags">
                {isToday ? (
                  <span className="pill fw-tag-today">{t('today', 'Today')}</span>
                ) : selectedDate < todayStr ? (
                  <span className="pill fw-tag-history">{t('today.historyBadge', 'Past History')}</span>
                ) : (
                  <span className="pill fw-tag-future">{t('today.upcomingBadge', 'Upcoming')}</span>
                )}
                <span className="fw-stepper-count-tag">
                  {doneCount}/{tasks.length} {t('today.done', 'done')}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Daily Tasks List & CRUD */}
        <main className="fw-tasks-main">
          {/* Main Tasks Card */}
          <div className="card fw-tasks-card">
            {!hasWeatherForSelectedDate && (
              <div className="fw-task-data-note" role="status">
                <Icon name={weatherLoading && !weatherData ? 'refresh' : 'info'} className="ico sm" />
                <span>
                  {weatherLoading && !weatherData
                    ? t('today.weatherLoading', 'Preparing suggestions from farm records while weather loads. Field conditions are not measured.')
                    : weatherError
                      ? t('today.weatherFallback', 'Weather is unavailable for this date. Suggestions use farm records or general checks, not measured field conditions.')
                      : t('today.weatherMissing', 'No forecast is available for this date. Check field conditions directly; suggestions are general guidance.')}
                </span>
              </div>
            )}
            {/* Card Header */}
            <div className="fw-tasks-card-header">
              <div>
                <h2>{formattedSelectedDate}</h2>
                <span className="muted fw-tasks-subtitle">
                  {tasks.length === 0
                    ? t('today.noTasks', 'No tasks scheduled for this day')
                    : `${doneCount} of ${tasks.length} ${t('today.completed', 'completed')}`}
                </span>
              </div>

              <div className="fw-tasks-actions">
                <button
                  type="button"
                  className="btn btn-green fw-add-task-btn"
                  onClick={openAddModal}
                  id="addTaskBtn"
                >
                  <Icon name="plus" className="ico sm" />
                  <span>{t('today.addTask', 'Add Task')}</span>
                </button>
              </div>
            </div>

            {/* Task Items List */}
            <div className="fw-tasks-list" id="tasks">
              {tasks.map((task) => {
                const isChecked = !!task.completed;
                const cat = CATEGORIES[task.category] || CATEGORIES.general;
                const titleText = typeof task.title === 'object' ? L(task.title) : (task.title || L(task.t));
                const descText = typeof task.desc === 'object' ? L(task.desc) : (task.desc || L(task.d));
                const isFarmerCustom = task.isCustom && !task.isSuggested;
                const isFarmerEdited = task.isEdited;
                const isOverdue = selectedDate < todayStr && !isChecked;

                return (
                  <div
                    key={task.id}
                    className={`fw-task-item ${isChecked ? 'is-done' : ''} ${isOverdue ? 'is-overdue' : ''}`}
                  >
                    {/* Accessible Checkbox */}
                    <div className="fw-task-check-wrap">
                      <button
                        type="button"
                        className="fw-task-check-btn"
                        aria-pressed={isChecked}
                        aria-label={`${isChecked ? t('today.markIncomplete', 'Mark incomplete') : t('today.markComplete', 'Mark complete')}: ${titleText}`}
                        onClick={() => toggleDailyTask(selectedDate, task.id)}
                      >
                        <span className="box">
                          <Icon name="check" className="ico sm" />
                        </span>
                      </button>
                    </div>

                    {/* Category Icon */}
                    <span className="ic fw-task-icon" aria-hidden="true">
                      <Icon name={task.icon || cat.icon || 'check'} className="ico" />
                    </span>

                    {/* Task Content */}
                    <div className="fw-task-content">
                      <div className="fw-task-title-row">
                        <b className="fw-task-title">{titleText}</b>
                      </div>

                      {descText && <p className="fw-task-desc">{descText}</p>}

                      {/* Metadata Pills */}
                      <div className="fw-task-meta">
                        {/* Time & Duration Pill */}
                        <span className="pill when fw-time-pill">
                          {`${task.timeOfDay || 'Anytime'} · ${task.duration || '20 min'}`}
                        </span>

                        {/* Category Pill */}
                        <span className="pill fw-cat-pill">
                          {L(cat.label)}
                        </span>
                        {task.field && <span className="pill fw-field-pill">{task.field}</span>}
                        {isOverdue && (
                          <span className="fw-task-badge fw-badge-overdue">
                            {t('today.overdue', 'Overdue')}
                          </span>
                        )}

                        {/* Distinction Badges (Requirement 4) */}
                        {isFarmerCustom ? (
                          <span className="fw-task-badge fw-badge-custom" title="Created by farmer">
                            <Icon name="user" className="ico xs" />
                            <span>{t('today.farmerTask', 'Farmer Task')}</span>
                          </span>
                        ) : isFarmerEdited ? (
                          <span className="fw-task-badge fw-badge-edited" title="Suggested task edited by farmer">
                            <Icon name="edit" className="ico xs" />
                            <span>{t('today.edited', 'Edited')}</span>
                          </span>
                        ) : (
                          <span className="fw-task-badge fw-badge-sugg" title="Smart suggestion based on crops, soil, and weather">
                            <Icon name="sparkle" className="ico xs" />
                            <span>{t('today.suggested', 'FarmWise Suggestion')}</span>
                          </span>
                        )}
                        {isFarmerCustom && isFarmerEdited && (
                          <span className="fw-task-badge fw-badge-edited" title="Edited by farmer">
                            <Icon name="edit" className="ico xs" />
                            <span>{t('today.edited', 'Edited')}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Task Row Action Buttons */}
                    <div className="fw-task-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="fw-task-tool-btn"
                        onClick={(e) => openEditModal(task, e)}
                        title={t('today.editTask', 'Edit Task')}
                        aria-label={`${t('today.editTask', 'Edit Task')}: ${titleText}`}
                      >
                        <Icon name="edit" className="ico sm" />
                      </button>
                      <button
                        type="button"
                        className="fw-task-tool-btn fw-btn-del"
                        onClick={(e) => promptDeleteTask(task, e)}
                        title={t('today.deleteTask', 'Delete Task')}
                        aria-label={`${t('today.deleteTask', 'Delete Task')}: ${titleText}`}
                      >
                        <Icon name="trash" className="ico sm" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Empty State (Requirement 5) */}
              {tasks.length === 0 && (
                <div className="fw-tasks-empty">
                  <div className="fw-empty-ic">
                    <Icon name="check-sq" className="ico lg" />
                  </div>
                  <h3>{t('today.noTasksTitle', 'No tasks scheduled')}</h3>
                  <p className="muted">
                    {t(
                      'today.noTasksDesc',
                      'No time-sensitive suggestions or saved tasks apply to this date yet. Add a task whenever you need one.'
                    )}
                  </p>
                  <div className="fw-empty-actions">
                    <button
                      type="button"
                      className="btn btn-green"
                      onClick={openAddModal}
                    >
                      <Icon name="plus" className="ico sm" />
                      <span>{t('today.addTask', 'Add a Task')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* All Done Celebration Message */}
            {isAllDone && tasks.length > 0 && (
              <div className="fw-all-done-banner" aria-live="polite">
                <span className="fw-done-check">✓</span>
                <div>
                  <b>{L(W.allDone)}</b>
                  <p className="muted">{t('today.allDoneSub', 'All planned tasks for this date have been completed.')}</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL 1: Add Task Modal */}
      {isAddModalOpen && (
        <div
          className="fw-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalAddTitle"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div className="fw-modal-content card" onClick={(e) => e.stopPropagation()}>
            <div className="fw-modal-h">
              <div>
                <h3 id="modalAddTitle">{t('today.addNewTask', 'Add Task')}</h3>
                <span className="muted" style={{ fontSize: '13px' }}>
                  {formattedSelectedDate}
                </span>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close"
              >
                <Icon name="x" className="ico sm" />
              </button>
            </div>

            <form onSubmit={handleSaveNewTask} className="fw-modal-form">
              <label className="fw-form-group">
                <span>{t('today.fieldTitle', 'Task Title')} *</span>
                <input
                  type="text"
                  className="input fw-input"
                  required
                  autoFocus
                  placeholder={t('today.titlePlaceholder', 'e.g. Inspect maize leaf whorls in Plot A')}
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                />
              </label>

              <label className="fw-form-group">
                <span>{t('today.fieldDesc', 'Description (Optional)')}</span>
                <textarea
                  className="input fw-input"
                  rows={2}
                  placeholder={t('today.descPlaceholder', 'e.g. Walk 20 plants in W pattern, check for fall armyworm')}
                  value={taskForm.desc}
                  onChange={(e) => setTaskForm({ ...taskForm, desc: e.target.value })}
                />
              </label>

              <label className="fw-form-group">
                <span>{t('today.fieldPlot', 'Field or Plot (Optional)')}</span>
                <input
                  type="text"
                  className="input fw-input"
                  placeholder={t('today.plotPlaceholder', 'e.g. Plot A · Maize')}
                  value={taskForm.field}
                  onChange={(e) => setTaskForm({ ...taskForm, field: e.target.value })}
                />
              </label>

              <div className="grid g2" style={{ gap: '12px' }}>
                <label className="fw-form-group">
                  <span>{t('today.fieldTime', 'Time of Day')}</span>
                  <select
                    className="select fw-select"
                    value={taskForm.timeOfDay}
                    onChange={(e) => setTaskForm({ ...taskForm, timeOfDay: e.target.value })}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {L(slot.label)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="fw-form-group">
                  <span>{t('today.fieldDuration', 'Duration')}</span>
                  <input
                    type="text"
                    className="input fw-input"
                    placeholder="e.g. 20 min"
                    value={taskForm.duration}
                    onChange={(e) => setTaskForm({ ...taskForm, duration: e.target.value })}
                  />
                </label>
              </div>

              <label className="fw-form-group">
                <span>{t('today.fieldCategory', 'Category / Type')}</span>
                <select
                  className="select fw-select"
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                >
                  {Object.values(CATEGORIES).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {L(cat.label)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="fw-modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  {t('today.cancel', 'Cancel')}
                </button>
                <button type="submit" className="btn btn-green">
                  {t('today.saveTask', 'Add Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Task Modal */}
      {editingTask && (
        <div
          className="fw-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalEditTitle"
          onClick={() => setEditingTask(null)}
        >
          <div className="fw-modal-content card" onClick={(e) => e.stopPropagation()}>
            <div className="fw-modal-h">
              <div>
                <h3 id="modalEditTitle">{t('today.editTask', 'Edit Task')}</h3>
                <span className="muted" style={{ fontSize: '13px' }}>
                  {formattedSelectedDate}
                </span>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setEditingTask(null)}
                aria-label="Close"
              >
                <Icon name="x" className="ico sm" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTask} className="fw-modal-form">
              <label className="fw-form-group">
                <span>{t('today.fieldTitle', 'Task Title')} *</span>
                <input
                  type="text"
                  className="input fw-input"
                  required
                  autoFocus
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                />
              </label>

              <label className="fw-form-group">
                <span>{t('today.fieldDesc', 'Description (Optional)')}</span>
                <textarea
                  className="input fw-input"
                  rows={2}
                  value={taskForm.desc}
                  onChange={(e) => setTaskForm({ ...taskForm, desc: e.target.value })}
                />
              </label>

              <label className="fw-form-group">
                <span>{t('today.fieldPlot', 'Field or Plot (Optional)')}</span>
                <input
                  type="text"
                  className="input fw-input"
                  value={taskForm.field}
                  onChange={(e) => setTaskForm({ ...taskForm, field: e.target.value })}
                />
              </label>

              <div className="grid g2" style={{ gap: '12px' }}>
                <label className="fw-form-group">
                  <span>{t('today.fieldTime', 'Time of Day')}</span>
                  <select
                    className="select fw-select"
                    value={taskForm.timeOfDay}
                    onChange={(e) => setTaskForm({ ...taskForm, timeOfDay: e.target.value })}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {L(slot.label)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="fw-form-group">
                  <span>{t('today.fieldDuration', 'Duration')}</span>
                  <input
                    type="text"
                    className="input fw-input"
                    value={taskForm.duration}
                    onChange={(e) => setTaskForm({ ...taskForm, duration: e.target.value })}
                  />
                </label>
              </div>

              <label className="fw-form-group">
                <span>{t('today.fieldCategory', 'Category / Type')}</span>
                <select
                  className="select fw-select"
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                >
                  {Object.values(CATEGORIES).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {L(cat.label)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="fw-modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEditingTask(null)}
                >
                  {t('today.cancel', 'Cancel')}
                </button>
                <button type="submit" className="btn btn-green">
                  {t('today.saveChanges', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation Modal (Requirement 4) */}
      {deletingTask && (
        <div
          className="fw-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalDelTitle"
          onClick={() => setDeletingTask(null)}
        >
          <div className="fw-modal-content card fw-del-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fw-del-icon">
              <Icon name="trash" className="ico md" />
            </div>

            <h3 id="modalDelTitle">{t('today.confirmDeleteTitle', 'Delete Task?')}</h3>
            <p className="muted" style={{ margin: '8px 0 16px' }}>
              {t(
                'today.confirmDeletePrompt',
                'Are you sure you want to delete this task? This cannot be undone.'
              )}
            </p>

            <div className="fw-del-task-preview">
              <b>{typeof deletingTask.title === 'object' ? L(deletingTask.title) : (deletingTask.title || L(deletingTask.t))}</b>
            </div>

            <div className="fw-modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setDeletingTask(null)}
              >
                {t('today.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                autoFocus
              >
                {t('today.deleteConfirmBtn', 'Yes, Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
