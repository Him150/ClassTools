'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Input,
  Button,
  Divider,
  Spinner,
  getKeyValue,
  Accordion,
  AccordionItem,
  Dropdown,
  DropdownItem,
  DropdownTrigger,
  DropdownMenu,
  TimeInput,
} from '@heroui/react';
import { Time } from '@internationalized/date';

import { OverlayScrollbars } from 'overlayscrollbars';
import { getConfigSync } from '@renderer/features/p_function';

const columns = [
  {
    id: 'id',
    label: '#',
  },
  {
    id: 'all',
    label: 'All',
  },
  {
    id: 'sunday',
    label: 'S',
  },
  {
    id: 'monday',
    label: 'M',
  },
  {
    id: 'tuesday',
    label: 'T',
  },
  {
    id: 'wednesday',
    label: 'W',
  },
  {
    id: 'thursday',
    label: 'T',
  },
  {
    id: 'friday',
    label: 'F',
  },
  {
    id: 'saturday',
    label: 'S',
  },
];
function formattedRows(rows) {
  return rows.map((row, rowIndex) => {
    const formattedRow = { id: rowIndex, ...row };
    return formattedRow;
  });
}
const formattedColumns = columns.map(column => ({
  field: column.id,
  headerName: column.label,
  editable: true,
}));

function List({ rows, setRows, children, isStriped = true }) {
  const refTable = useRef(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const Table = refTable.current as HTMLElement;
    const osInstance = OverlayScrollbars(Table.parentElement, {
      scrollbars: { autoHide: 'move', theme: media.matches ? 'os-theme-light' : 'os-theme-dark' },
    });
  }, []);

  return (
    <>
      <div className='*:mb-4'>
        <Table
          isStriped={isStriped}
          isHeaderSticky
          aria-label=' '
          ref={refTable}
          classNames={{
            base: 'max-h-[80vh] overflow-auto',
            wrapper: 'rounded-none !p-0 scrollbar-hide',
            thead: 'z-[11]',
          }}
          isKeyboardNavigationDisabled={true}>
          <TableHeader>
            {columns.map(column => (
              <TableColumn key={column.id}>{column.label}</TableColumn>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columnKey => {
                  return (
                    <TableCell
                      className={
                        columnKey == 'id' ? 'sticky left-0 bg-white dark:bg-neutral-900 z-10' : 'min-w-[14ch]'
                      }>
                      {columnKey == 'id' ? rowIndex + 1 : children(row, rowIndex, columnKey)}
                    </TableCell>
                  );
                }}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function CustomTextarea(props) {
  const component = useRef(null);
  useEffect(() => {
    const ele = component.current as HTMLTextAreaElement;
    ele.style.height = `auto`;
    ele.style.height = `${ele.scrollHeight}px`;
  });
  return (
    <textarea
      {...props}
      className={
        'resize-none focus-visible:outline-none! bg-transparent w-full h-full rounded-sm' +
        (props.className ? ' ' + props.className : '')
      }
      onInput={e => {
        const ele = e.target as HTMLTextAreaElement;
        ele.style.height = `auto`;
        ele.style.height = `${ele.scrollHeight}px`;
      }}
      ref={component}></textarea>
  );
}

export function LessonsListName() {
  const [rows, setRows] = useState([{}]) as any;
  useEffect(() => {
    (async () => {
      const data: any = await getConfigSync('lessonsList.name');
      if (data && data.length > 0) data && setRows(data);
    })();
  }, []);

  return (
    <>
      <List rows={rows} setRows={setRows}>
        {(row, rowIndex, columnKey) => {
          return (
            <CustomTextarea
              value={getKeyValue(row, columnKey)}
              onChange={e => {
                let new_rows = [...rows];
                if (e.target.value) {
                  new_rows[rowIndex][columnKey] = e.target.value;
                } else {
                  delete new_rows[rowIndex][columnKey];
                }
                let finished_delete = false;
                for (let i = 0; i < new_rows.length; i++) {
                  const element = new_rows[new_rows.length - 1 - i];
                  if (!finished_delete) {
                    if (Object.keys(element).length == 0) {
                      new_rows[new_rows.length - 1 - i] = undefined;
                    } else {
                      finished_delete = true;
                    }
                  }
                }
                new_rows = new_rows.filter(value => value != undefined);
                new_rows.push({});
                window.ipc?.send('set-config', 'lessonsList.name', new_rows);
                setRows(new_rows);
              }}
            />
          );
        }}
      </List>
    </>
  );
}
export function LessonsListTime() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoading2, setIsLoading2] = useState(true);
  const [rows, setRows] = useState([{}]) as any;
  const [weekStart, setWeekStart] = useState('') as any;
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    rowIndex: number | null;
    columnKey: string | null;
    addDivide?: boolean;
  }>({
    open: false,
    rowIndex: null,
    columnKey: null,
  });

  const stringToTime = (value?: string): any => {
    if (!value) return null;
    const [h, m] = value.split(':').map(Number);
    return new Time(h, m);
  };

  const timeToString = (value: any) => {
    if (!value) return null;
    return `${value.hour.toString().padStart(2, '0')}:${value.minute.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    (async () => {
      try {
        const data: any = await getConfigSync('lessonsList.time');
        if (data && data.length > 0) data && setRows(data);
      } catch (error) {}
      setIsLoading(false);
    })();
    (async () => {
      try {
        const data = await getConfigSync('lessonsList.weekStart');
        data && setWeekStart(data);
      } catch (error) {}
      setIsLoading2(false);
    })();
  }, []);
  return (
    <>
      <div className='*:mb-4 relative min-h-full'>
        {(() => {
          if (isLoading || isLoading2) {
            return (
              <div className='absolute w-full bg-background h-full z-50 flex justify-center items-center'>
                <Spinner size='lg' />
              </div>
            );
          }
        })()}
        <Input
          label='学期开始日期'
          labelPlacement='outside-left'
          className='max-w-xs'
          value={weekStart}
          onChange={e => {
            window.ipc?.send('set-config', 'lessonsList.weekStart', e.target.value);
            setWeekStart(e.target.value);
          }}></Input>
        <div>
          <List rows={rows} setRows={setRows} isStriped={false}>
            {(row, rowIndex, columnKey) => {
              const context = getKeyValue(row, columnKey);
              const startTime = context?.start;
              const endTime = context?.end;
              const addDivide = context?.divide;

              return (
                <div
                  className='flex flex-col gap-1'
                  onContextMenu={e => {
                    e.preventDefault();
                    setContextMenu({
                      open: true,
                      rowIndex,
                      columnKey,
                      addDivide,
                    });
                  }}>
                  <TimeInput
                    hourCycle={24}
                    label='开始'
                    value={stringToTime(startTime)}
                    onChange={value => {
                      const time = timeToString(value);

                      let new_rows = [...rows];

                      if (time) {
                        if (!new_rows[rowIndex][columnKey]) new_rows[rowIndex][columnKey] = {};
                        new_rows[rowIndex][columnKey].start = time;
                      } else {
                        delete new_rows[rowIndex][columnKey]?.start;
                      }

                      // ===== 你原本的尾部清理逻辑 =====
                      let finished_delete = false;
                      for (let i = 0; i < new_rows.length; i++) {
                        const element = new_rows[new_rows.length - 1 - i];
                        if (!finished_delete) {
                          if (Object.keys(element).length === 0) {
                            new_rows[new_rows.length - 1 - i] = undefined;
                          } else {
                            finished_delete = true;
                          }
                        }
                      }
                      new_rows = new_rows.filter(v => v != undefined);
                      new_rows.push({});

                      window.ipc?.send('set-config', 'lessonsList.time', new_rows);
                      setRows(new_rows);
                    }}
                  />

                  <TimeInput
                    hourCycle={24}
                    label='结束'
                    value={stringToTime(endTime)}
                    onChange={value => {
                      const time = timeToString(value);

                      let new_rows = [...rows];

                      if (time) {
                        if (!new_rows[rowIndex][columnKey]) new_rows[rowIndex][columnKey] = {};
                        new_rows[rowIndex][columnKey].end = time;
                      } else {
                        delete new_rows[rowIndex][columnKey]?.end;
                      }

                      // ===== 同样的尾部清理 =====
                      let finished_delete = false;
                      for (let i = 0; i < new_rows.length; i++) {
                        const element = new_rows[new_rows.length - 1 - i];
                        if (!finished_delete) {
                          if (Object.keys(element).length === 0) {
                            new_rows[new_rows.length - 1 - i] = undefined;
                          } else {
                            finished_delete = true;
                          }
                        }
                      }
                      new_rows = new_rows.filter(v => v != undefined);
                      new_rows.push({});

                      window.ipc?.send('set-config', 'lessonsList.time', new_rows);
                      setRows(new_rows);
                    }}
                  />

                  {addDivide && <Divider />}
                  <Dropdown
                    isOpen={
                      contextMenu.open && contextMenu.rowIndex === rowIndex && contextMenu.columnKey === columnKey
                    }
                    onOpenChange={open => setContextMenu(prev => ({ ...prev, open }))}>
                    <DropdownTrigger>
                      <div></div>
                    </DropdownTrigger>

                    {/* ===== 右键菜单 ===== */}
                    <DropdownMenu
                      aria-label='Time Context Menu'
                      onAction={key => {
                        let new_rows = [...rows];

                        switch (key) {
                          case 'divide':
                            if (!new_rows[rowIndex][columnKey]) new_rows[rowIndex][columnKey] = {};
                            new_rows[rowIndex][columnKey].divide = !new_rows[rowIndex][columnKey].divide;
                            break;

                          case 'clear':
                            delete new_rows[rowIndex][columnKey];
                            break;
                        }

                        window.ipc?.send('set-config', 'lessonsList.time', new_rows);
                        setRows(new_rows);
                        setContextMenu(prev => ({ ...prev, open: false }));
                      }}>
                      <DropdownItem key='divide'>{addDivide ? '取消分割线' : '添加分割线'}</DropdownItem>
                      <DropdownItem key='clear' className='text-danger'>
                        清空
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              );
            }}
          </List>
          <Divider className='my-2'></Divider>
          <Accordion isCompact={true} variant='shadow'>
            <AccordionItem title='数据迁移'>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='faded'
                  onClick={() => {
                    const rows_ = [];
                    for (const key in rows) {
                      const element = rows[key];
                      const element_ = {};
                      if (typeof element == 'object') {
                        for (const key in element) {
                          const elementIn = element[key];
                          if (typeof elementIn == 'string') {
                            let context_: any = {};
                            let foo = (elementIn as unknown as string).split('-')[0];
                            if (foo) context_.start = foo;
                            let bar = (elementIn as unknown as string).split('-')[1];
                            if (bar) context_.end = bar;
                            element_[key] = context_;
                          } else {
                            element_[key] = elementIn;
                          }
                        }
                        rows_.push(element_);
                      }
                    }
                    window.ipc?.send('set-config', 'lessonsList.time', rows_);
                    setRows(rows_);
                  }}>
                  从旧版数据格式迁移
                </Button>
                <Button
                  color='danger'
                  variant='faded'
                  onPress={() => {
                    const rows_ = [];
                    for (const key in rows) {
                      const element = rows[key];
                      const element_ = {};
                      if (typeof element == 'object') {
                        for (const key in element) {
                          const elementIn = element[key];
                          if (typeof elementIn == 'object') {
                            const textArray = [];
                            textArray.push(elementIn?.start);
                            textArray.push(elementIn?.end);
                            // textArray.push(elementIn?.divide);
                            element_[key] = textArray.join('-');
                          } else {
                            element_[key] = elementIn;
                          }
                        }
                        rows_.push(element_);
                      }
                    }
                    window.ipc?.send('set-config', 'lessonsList.time', rows_);
                    setRows(rows_);
                  }}>
                  迁移到旧版数据格式(会丢失分隔符)
                </Button>
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </>
  );
}

export function LessonsListTime_TimeDisplayer({
  time,
  children = <>&ensp;</>,
  onChange,
}: {
  time: string;
  children?: any;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className='inline-flex items-start justify-center box-border select-none whitespace-nowrap overflow-hidden text-small rounded-medium bg-default h-auto min-h-10 flex-col gap-0 py-1 px-3'>
      <div className='text-sm text-default-foreground'>{children}</div>
      <input
        className='text-lg bg-transparent focus-visible:[outline:0]! min-w-[6ch] w-full!'
        defaultValue={time ? time : ''}
        onChange={onChange}></input>
    </div>
  );
}
