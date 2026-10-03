import React from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { TASKS } from '../../data/tasksData';

export default function TasksPage() {
  const { t, L, W } = useLanguage();
  const { tasksDone, toggleTask } = useApp();

  const doneCount = TASKS.filter((task) => tasksDone[task.id]).length;
  const isAllDone = doneCount === TASKS.length;
  const ringOffset = 226.2 * (1 - doneCount / TASKS.length);

  return (
    <section className="panel page" data-page="tasks" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('today.q', 'What should I do today?')}</h1>
          <p>{t('today.p', 'Chosen from today’s weather, crop stages and soil.')}</p>
        </div>

        <div className="ring">
          <svg viewBox="0 0 88 88" aria-hidden="true">
            <circle
              cx="44"
              cy="44"
              r="36"
              fill="none"
              stroke="#CEE2E3"
              strokeWidth="8"
            />
            <circle
              id="progRing"
              cx="44"
              cy="44"
              r="36"
              fill="none"
              stroke="#192F0B"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="226.2"
              strokeDashoffset={ringOffset}
              transform="rotate(-90 44 44)"
              style={{ transition: 'stroke-dashoffset .6s var(--ease)' }}
            />
          </svg>
          <div>
            <b id="progNum">{`${doneCount} / ${TASKS.length}`}</b>
            <span className="muted">{t('today.done', 'done today')}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div id="tasks">
          {TASKS.map((task) => {
            const isChecked = !!tasksDone[task.id];
            return (
              <label key={task.id} className="task">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleTask(task.id)}
                />
                <span className="box">
                  <Icon name="check" className="ico sm" />
                </span>
                <span className="ic">
                  <Icon name={task.icon} className="ico" />
                </span>
                <div>
                  <b>{L(task.t)}</b>
                  <p>{L(task.d)}</p>
                  <span className="pill when">{L(task.w)}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <p
        className="muted"
        id="allDone"
        style={{ marginTop: '12px', fontSize: '15px' }}
        aria-live="polite"
      >
        {isAllDone ? L(W.allDone) : ''}
      </p>
    </section>
  );
}
