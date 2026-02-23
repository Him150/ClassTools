'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  ButtonGroup,
  Card,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  Skeleton,
  Switch,
} from '@heroui/react';
import { SettingsGroup, SettingsItem } from './SettingsGroup';
import { getConfigSync } from '@renderer/features/ipc/config';
import { deleteFile, Item, loadFile, loadList, saveFile } from '@renderer/features/cloudStorage';
import { CloudArrowUpIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Download, Upload, Trash2, RefreshCcw } from 'lucide-react';

type BackupPayload = {
  ts: number;
  data: unknown;
};

type RestorePreview = {
  fileName: string;
  ts: number;
  data: Record<string, unknown>;
};

function trimPrefix(path: string) {
  return path.replace(/^ClassTools\//, '');
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getProgressColor(value: number | undefined): 'primary' | 'success' | 'danger' {
  if (value === undefined) return 'primary';
  if (value >= 100) return 'success';
  return 'primary';
}

function parseBackupPayload(text: string): RestorePreview {
  const payload = JSON.parse(text) as BackupPayload;
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new Error('备份格式不正确');
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('备份数据为空');
  }
  return {
    fileName: '',
    ts: typeof payload.ts === 'number' ? payload.ts : Date.now(),
    data: payload.data as Record<string, unknown>,
  };
}

export function DataPrivacySettings() {
  const [cloudBackup, setCloudBackup] = useState(false);

  return (
    <SettingsGroup
      title='数据隐私'
      description='管理您的数据收集和隐私选项'
      icon={<ShieldCheckIcon className='w-6 h-6' />}>
      <div className='bg-blue-50 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4'>
        <h4 className='font-medium mb-2'>必要诊断数据</h4>
        <p className='text-sm text-content3-foreground'>
          部分运行数据可能会发送到 Sentry 和 Cloudflare Web Analytics（仅在线模式），用于排错和稳定性改进。
        </p>
      </div>

      <SettingsItem title='配置云端备份' description='启用配置文件的云端备份功能'>
        <Switch isSelected={cloudBackup} onChange={() => setCloudBackup(!cloudBackup)} />
      </SettingsItem>
    </SettingsGroup>
  );
}

export function BackupSettings() {
  const [name, setName] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [ioLoading, setIoLoading] = useState(false);
  const [actionProgress, setActionProgress] = useState<{ value: number }>();
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const progressColor = useMemo(() => getProgressColor(actionProgress?.value), [actionProgress?.value]);
  const progressIndeterminate = ioLoading && actionProgress?.value === undefined;

  const refreshList = useCallback(async () => {
    setListLoading(true);
    try {
      const list = await loadList();
      list.sort((a, b) => b.lastModified - a.lastModified);
      setItems(list);
    } catch (error) {
      alert(`加载失败: ${String(error)}`);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const saveByName = useCallback(
    async (rawName: string) => {
      const fileName = rawName.trim();
      if (!fileName) return;
      setIoLoading(true);
      setActionProgress({ value: 0 });
      try {
        const payload: BackupPayload = {
          ts: Date.now(),
          data: await getConfigSync(),
        };
        await saveFile(fileName, JSON.stringify(payload), percent => setActionProgress({ value: percent }));
        await refreshList();
      } catch (error) {
        alert(`保存失败: ${String(error)}`);
      } finally {
        setIoLoading(false);
        setTimeout(() => setActionProgress(undefined), 600);
      }
    },
    [refreshList],
  );

  const openRestoreModalByName = useCallback(async (fileName: string) => {
    setIoLoading(true);
    setActionProgress({ value: 0 });
    try {
      const text = await loadFile(fileName, percent => setActionProgress({ value: percent }));
      const parsed = parseBackupPayload(text);
      setRestorePreview({
        fileName,
        ts: parsed.ts,
        data: parsed.data,
      });
    } catch (error) {
      alert(`加载失败: ${String(error)}`);
    } finally {
      setIoLoading(false);
      setTimeout(() => setActionProgress(undefined), 600);
    }
  }, []);

  const confirmRestore = useCallback(async () => {
    if (!restorePreview) return;
    setIoLoading(true);
    setActionProgress({ value: 0 });
    try {
      Object.entries(restorePreview.data).forEach(([key, value]) => {
        window.ipc?.send('set-config', key, value);
      });
      setRestorePreview(null);
      alert('恢复成功，配置已写入');
    } catch (error) {
      alert(`恢复失败: ${String(error)}`);
    } finally {
      setIoLoading(false);
      setTimeout(() => setActionProgress(undefined), 600);
    }
  }, [restorePreview]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIoLoading(true);
    setActionProgress(undefined);
    try {
      await deleteFile(deleteTarget);
      setDeleteTarget(null);
      await refreshList();
    } catch (error) {
      alert(`删除失败: ${String(error)}`);
    } finally {
      setIoLoading(false);
    }
  }, [deleteTarget, refreshList]);

  return (
    <SettingsGroup title='数据备份' description='备份和恢复应用配置' icon={<CloudArrowUpIcon className='w-6 h-6' />}>
      <div className='flex gap-2'>
        <Input
          placeholder='名称'
          value={name}
          isClearable
          onClear={() => {
            setName('');
          }}
          onChange={e => setName(e.target.value)}
        />

        <Button onPress={() => saveByName(name)} isDisabled={!name.trim() || ioLoading} isIconOnly color='primary'>
          <Upload className='w-4 h-4' />
        </Button>

        <Button onPress={refreshList} isDisabled={ioLoading} isIconOnly>
          <RefreshCcw className='w-4 h-4' />
        </Button>
      </div>

      {ioLoading && (
        <Progress
          size='sm'
          value={actionProgress?.value}
          maxValue={100}
          className='w-full'
          color={progressColor}
          isIndeterminate={progressIndeterminate}
        />
      )}

      <Card>
        {listLoading &&
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className='p-3 flex gap-2 flex-wrap border-divider border-b last:border-b-0'>
              <Skeleton className='h-8 w-full rounded-md' />
            </div>
          ))}

        {!listLoading &&
          items.map(item => {
            const fileName = trimPrefix(item.key);

            return (
              <div key={fileName} className='p-3 flex gap-2 flex-wrap border-divider border-b last:border-b-0'>
                <span className='flex items-center break-all'>{safeDecode(fileName)}</span>
                <div className='ml-auto flex gap-2'>
                  <ButtonGroup>
                    <Button onPress={() => openRestoreModalByName(fileName)} isDisabled={ioLoading}>
                      <Download className='w-4 h-4' />
                      恢复
                    </Button>
                    <Button color='primary' onPress={() => saveByName(fileName)} isDisabled={ioLoading}>
                      <Upload className='w-4 h-4' />
                      备份
                    </Button>
                    <Button color='danger' onPress={() => setDeleteTarget(fileName)} isDisabled={ioLoading}>
                      <Trash2 className='w-4 h-4' />
                      删除
                    </Button>
                  </ButtonGroup>
                </div>
              </div>
            );
          })}
      </Card>

      <Modal isOpen={!!restorePreview} onOpenChange={open => !open && setRestorePreview(null)} size='2xl' scrollBehavior='inside'>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader>确认恢复备份</ModalHeader>
              <ModalBody>
                <p>备份名: {safeDecode(restorePreview?.fileName ?? '')}</p>
                <p>
                  备份时间:{' '}
                  {restorePreview ? new Date(restorePreview.ts).toLocaleString('zh-CN', { hour12: false }) : '-'}
                </p>
                <p>内容项数: {restorePreview ? Object.keys(restorePreview.data).length : 0}</p>
                <pre className='text-xs bg-content2 p-3 rounded-md whitespace-pre-wrap break-all'>
                  {restorePreview ? JSON.stringify(restorePreview.data, null, 2) : ''}
                </pre>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant='ghost'
                  onPress={() => {
                    setRestorePreview(null);
                    onClose();
                  }}>
                  取消
                </Button>
                <Button color='primary' onPress={confirmRestore} isDisabled={ioLoading}>
                  确认恢复
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader>确认删除备份</ModalHeader>
              <ModalBody>
                <p>确定要删除这个备份吗？</p>
                <p className='break-all'>{safeDecode(deleteTarget ?? '')}</p>
                <p className='text-danger text-sm'>此操作无法撤销。</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant='ghost'
                  onPress={() => {
                    setDeleteTarget(null);
                    onClose();
                  }}>
                  取消
                </Button>
                <Button color='danger' onPress={confirmDelete} isDisabled={ioLoading}>
                  删除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </SettingsGroup>
  );
}
