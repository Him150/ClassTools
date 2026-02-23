import { useEffect, useRef, useState, Fragment } from 'react';
import { Card, CardBody, CardHeader, Divider, Progress } from '@heroui/react';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import {
  getChangeDay,
  getWeekNumber,
  getWeekDate,
  listClassesForDay,
} from '@renderer/features/p_function';

export default function ClassList({
  schedule,
  timeDisplay = 'active',
  progressDisplay = 'active',
  slidingPosition = 'nearest',
}) {
  const containerRef = useRef(null);
  const [classes, setClasses] = useState([]);
  const [weekInfo, setWeekInfo] = useState({ now: 0, total: 0 });
  const [tick, setTick] = useState(0);
  const [currentDate, setCurrentDate] = useState(dayjs().format('YYYY-MM-DD')); // 当前日期字符串
  const refList = useRef([]);

  useEffect(() => {
    dayjs.extend(weekOfYear);
    (async () => {
      const inputTime = dayjs();
      const changed = await getChangeDay(true, inputTime);
      let weekStartDate = dayjs(schedule?.weekStartDate);
      const weekChanged = getWeekNumber(weekStartDate, changed);
      const weekNow = getWeekNumber(weekStartDate, inputTime) || 0;
      const weekTotal = inputTime.week() || 0;
      setWeekInfo({ now: weekNow, total: weekTotal });

      let classDay = getWeekDate(changed).toLowerCase();
      let dayClasses = listClassesForDay(schedule, classDay, Math.abs(weekChanged % 2) === 1);
      setClasses(dayClasses);
    })();
  }, [schedule, currentDate]);

  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  // 当tick变化，判断是否跨天
  useEffect(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    if (todayStr !== currentDate) {
      setCurrentDate(todayStr); // 触发重新获取课程数据
    }
  }, [tick, currentDate]);

  const prevStateRef = useRef(null);
  useEffect(() => {
    let target = null;

    // 优先：滚到最后一个不是 after 的
    for (let i = refList.current.length - 1; i >= 0; i--) {
      const el = refList.current[i];
      if (el && el.dataset.state !== 'after') {
        target = el;
        break;
      }
    }
    // 如果全是 after → target 为空 → 滚到第一节 after
    if (!target) {
      target = refList.current.find(el => el && el.dataset.state === 'after');
    }

    if (target && target !== prevStateRef.current) {
      target.scrollIntoView({ behavior: 'smooth', block: slidingPosition });
      prevStateRef.current = target;
    }
  }, [tick, slidingPosition]);

  const groupedClasses = [];
  let currentGroup = [];

  for (let i = 0; i < classes?.length; i++) {
    if (classes[i].startTime && classes[i].endTime && classes[i].subject) {
      currentGroup.push(classes[i]);
    }
    if (classes[i].divide || i === classes.length - 1) {
      if (currentGroup.length > 0) groupedClasses.push(currentGroup);
      currentGroup = [];
    }
  }

  return (
    <div className='class-list pt-2' ref={containerRef}>
      {!groupedClasses || groupedClasses.length === 0 ? (
        <Card className='mx-2 mb-2 shadow-md bg-white/60 dark:black/40'>
          <div className='text-center py-6 text-neutral-900 font-bold' style={{ fontSize: `min(1.8em,5rem)` }}>
            暂无课程
          </div>
        </Card>
      ) : (
        groupedClasses
          .filter(group => group.length > 0)
          .map((group, groupIdx) => (
            <div key={groupIdx} className='mb-2'>
              <Card className='mx-2 shadow-md bg-transparent'>
                {group.map((cls, idx) => {
                  const refIndex = groupIdx * 100 + idx; // 避免冲突

                  const currentTime = new Date();
                  const [sh, sm] = cls.startTime.split(':').map(Number);
                  const [eh, em] = cls.endTime.split(':').map(Number);
                  const start = new Date(
                    currentTime.getFullYear(),
                    currentTime.getMonth(),
                    currentTime.getDate(),
                    sh,
                    sm,
                  );
                  const end = new Date(
                    currentTime.getFullYear(),
                    currentTime.getMonth(),
                    currentTime.getDate(),
                    eh,
                    em,
                  );

                  // state timeline: default | before > active > after
                  let state = 'default';
                  if (currentTime >= start && currentTime <= end) state = 'active';
                  else if (currentTime > end) state = 'before';
                  else state = 'after';

                  const percent = ((currentTime.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
                  const baseClass = `transition-all duration-300 ease-in-out ${
                    state === 'active'
                      ? 'bg-blue-200/60 shadow-inner'
                      : state === 'before'
                        ? 'bg-neutral-300/60'
                        : 'bg-white/60 dark:black/40'
                  }`;

                  return (
                    <Fragment key={refIndex}>
                      {idx !== 0 && <Divider className='bg-neutral-400/60' />}
                      <div
                        ref={el => {
                          refList.current[groupIdx * 100 + idx] = el;
                        }}
                        data-state={state}
                        className={`px-4 py-2 ${baseClass} first:rounded-t-2xl last:rounded-b-2xl`}>
                        {(timeDisplay === 'always' || (timeDisplay === 'active' && state === 'active')) && (
                          <div
                            className={`mb-0 whitespace-pre text-[0.875em]  ${
                              state === 'before' ? 'text-neutral-600' : 'text-neutral-800'
                            }`}>
                            {`${cls.startTime} - ${cls.endTime}`}
                          </div>
                        )}
                        <div
                          className={`font-semibold mb-0 whitespace-pre-wrap text-[1.5em] ${
                            state === 'before' ? 'text-neutral-800' : 'text-black'
                          }`}>
                          {`${cls.subject.replace('\\n', '\n')}`}
                        </div>
                        {(progressDisplay === 'always' || (progressDisplay === 'active' && state === 'active')) && (
                          <Progress
                            aria-label='progress'
                            size='sm'
                            value={Math.min(Math.max(percent, 0), 100)}
                            color='primary'
                            className='mt-1 w-full'
                          />
                        )}
                      </div>
                    </Fragment>
                  );
                })}
              </Card>
            </div>
          ))
      )}
      <div className='p-2'>
        <span id='weekNumber' className={`text-neutral-800 bg-neutral-100/50 p-2 rounded-md shadow-md`}>
          {weekInfo.now}周/年{weekInfo.total}周
        </span>
      </div>
    </div>
  );
}
