'use client';
import { useEffect } from 'react';
// @ts-ignore
import '@renderer/styles/globals.css';
// @ts-ignore
import 'overlayscrollbars/overlayscrollbars.css';
import { addToast } from '@heroui/react';
import { ToastProvider } from '@heroui/toast';
import * as Sentry from '@sentry/electron/renderer';
import * as SentryReact from '@sentry/react';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let sentryConfig = {
      dsn: 'https://6dca168d15f311911a41313d88e9ecd7@o4509214755782657.ingest.us.sentry.io/4510573802291200',
      sendDefaultPii: true,
      integrations: [],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      enableLogs: true,
    };
    if (window.ipc) {
      sentryConfig.integrations = [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
      ];
      Sentry.init(sentryConfig);
    } else {
      sentryConfig.integrations = [
        SentryReact.browserTracingIntegration(),
        SentryReact.replayIntegration({ maskAllText: false, blockAllMedia: false }),
      ];
      SentryReact.init(sentryConfig);
    }
  }, []);
  useEffect(() => {
    window.alert = function (...args: any[1]) {
      console.log('[Alert]', args[0]);
      addToast({
        hideIcon: false,
        color: 'primary',
        description: args[0],
        classNames: {
          description: 'whitespace-pre-wrap',
        },
      });
      return true;
    };
  }, []);

  return (
    <>
      <html suppressHydrationWarning className='h-full'>
        <head>
          <title>Class Tools</title>
          <meta charSet='UTF-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        </head>
        <body className='h-full'>
          <ToastProvider />
          <Providers>{children}</Providers>
        </body>
      </html>
    </>
  );
}
