'use client';
import {
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from '@heroui/react';
import { Calendar, DateValue } from '@heroui/calendar';
import { useEffect, useState } from 'react';
import * as lodash from 'lodash';
import { getConfigSync } from '@renderer/features/ipc/config';
import { parseDate } from '@internationalized/date';
import { PlusIcon, ArrowRightIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SettingsGroup, SettingsPage } from '@renderer/components/settings/SettingsGroup';
import { I18nProvider } from '@react-aria/i18n';

interface DayChange {
  from: string;
  to: string;
}

function useDayChangeRules() {
  const [rules, setRules] = useState<DayChange[]>([]);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const config = (await getConfigSync('lessonsList.changeDay')) as string;
    if (!config) return;

    const parsed = config
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('//'))
      .map(line => {
        const [from, to] = line.split(/\s*-\s*/);
        return { from, to };
      })
      .filter(r => r.from && r.to);

    setRules(parsed);
  };

  const saveRules = (newRules: DayChange[]) => {
    const uniqueRules = lodash.uniqBy(newRules, r => `${r.from}-${r.to}`);
    const content = uniqueRules.map(r => `${r.from} - ${r.to}`).join('\n');
    window.ipc?.send('set-config', 'lessonsList.changeDay', content);
    setRules(uniqueRules);
  };

  const addRule = (rule: DayChange) => saveRules([...rules, rule]);
  const deleteRule = (index: number) => saveRules(rules.filter((_, i) => i !== index));

  return { rules, addRule, deleteRule };
}

export default function App() {
  const { rules, addRule, deleteRule } = useDayChangeRules();
  const today = new Date();
  const [newFrom, setNewFrom] = useState(
    `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(
      2,
      '0',
    )}`,
  );
  const [newTo, setNewTo] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleAdd = () => {
    if (!newFrom || !newTo) return;
    addRule({ from: newFrom, to: newTo });
  };

  const confirmDelete = (index: number) => {
    setDeleteIndex(index);
    onOpen();
  };

  const handleConfirmDelete = () => {
    if (deleteIndex !== null) deleteRule(deleteIndex);
    onClose();
  };

  return (
    <SettingsPage>
      <SettingsGroup title='添加替换规则'>
        <div className='flex flex-wrap gap-5 justify-center'>
          <I18nProvider locale='zh-CN-u-ca-chinese'>
            <div className='flex flex-col items-center'>
              <span>原始日期</span>
              <Calendar
                value={newFrom ? (parseDate(newFrom.replaceAll('/', '-')) as any) : undefined}
                onChange={(date: DateValue) =>
                  setNewFrom(`${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`)
                }
                className='rounded-md border scrollbar-hide'
                showMonthAndYearPickers={true}
                firstDayOfWeek='sun'
              />
            </div>
            <div className='flex flex-col items-center'>
              <span>替换日期</span>
              <Calendar
                value={newTo ? (parseDate(newTo.replaceAll('/', '-')) as any) : undefined}
                onChange={(date: DateValue) =>
                  setNewTo(`${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`)
                }
                className='rounded-md border scrollbar-hide'
                showMonthAndYearPickers={true}
                firstDayOfWeek='sun'
              />
            </div>
          </I18nProvider>
        </div>
        <div className='flex justify-center'>
          <Button onPress={handleAdd} disabled={!newFrom || !newTo}>
            <PlusIcon className='w-6 h-6'></PlusIcon>
          </Button>
        </div>
      </SettingsGroup>

      <SettingsGroup title='当前替换规则'>
        <div className='grid gap-2 lg:grid-cols-2'>
          {rules.length === 0 ? (
            <p className='text-content3-foreground'>暂无替换规则</p>
          ) : (
            rules.map((rule, index) => (
              <div key={index} className='flex items-center gap-2 w-full'>
                <span className='bg-neutral-200 dark:bg-neutral-800 px-2 py-1 rounded-md'>{rule.from}</span>
                <ArrowRightIcon className='w-6 h-6'></ArrowRightIcon>
                <span className='bg-neutral-200 dark:bg-neutral-800 px-2 py-1 rounded-md'>{rule.to}</span>
                <Button
                  variant='flat'
                  isIconOnly
                  size='sm'
                  className='text-red-600'
                  onPress={() => {
                    // confirmDelete(index);
                    deleteRule(index);
                  }}>
                  <TrashIcon className='w-6 h-6'></TrashIcon>
                </Button>
              </div>
            ))
          )}
        </div>
      </SettingsGroup>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>确认删除</ModalHeader>
          <ModalBody>确定要删除这条规则吗？此操作无法撤销。</ModalBody>
          <ModalFooter>
            <Button variant='ghost' onPress={onClose}>
              取消
            </Button>
            <Button color='danger' onPress={handleConfirmDelete}>
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SettingsPage>
  );
}
