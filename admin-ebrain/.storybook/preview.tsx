import React from 'react';
import type { Preview } from '@storybook/react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'page',
      values: [
        { name: 'page', value: '#f6f8ff' },
        { name: 'sunken', value: '#eef3ff' },
      ],
    },
    options: {
      storySort: {
        order: [
          'Overview',
          'Pages',
          ['Login', 'Dashboard', 'Executives', 'EnterpriseApps', 'Ingestion', 'FactConflicts', 'Agents', 'RequestLog'],
          'Components',
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1f6fff',
            colorBgBase: '#f6f8ff',
            colorBgLayout: '#f6f8ff',
            colorBgContainer: '#ffffff',
            colorBgElevated: '#ffffff',
            colorBorder: 'rgba(70, 82, 120, 0.13)',
            colorBorderSecondary: 'rgba(70, 82, 120, 0.08)',
            colorText: '#172033',
            colorTextSecondary: '#4b5875',
            colorTextTertiary: '#7a86a3',
            colorTextQuaternary: '#b7bfd0',
            colorSuccess: '#20a84a',
            colorWarning: '#f59f18',
            colorError: '#e5484d',
            colorInfo: '#0ea5e9',
            borderRadius: 10,
            fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif',
            boxShadow: '0 1px 2px 0 rgba(70, 82, 120, 0.06), 0 1px 3px 0 rgba(70, 82, 120, 0.05)',
            boxShadowSecondary: '0 4px 12px 0 rgba(70, 82, 120, 0.08)',
          },
          components: {
            Layout: {
              bodyBg: '#f6f8ff',
              headerBg: 'rgba(255, 255, 255, 0.78)',
              siderBg: 'rgba(255, 255, 255, 0.94)',
            },
            Menu: {
              itemBg: 'transparent',
              itemSelectedBg: 'rgba(31, 111, 255, 0.10)',
              itemSelectedColor: '#1f6fff',
              itemHoverBg: 'rgba(31, 111, 255, 0.06)',
              itemColor: '#4b5875',
              iconSize: 16,
            },
            Card: {
              colorBgContainer: '#ffffff',
              borderRadiusLG: 12,
              boxShadowTertiary: '0 1px 3px 0 rgba(70, 82, 120, 0.06)',
            },
            Table: {
              colorBgContainer: 'transparent',
              headerBg: 'rgba(245, 247, 252, 0.6)',
              borderColor: 'rgba(70, 82, 120, 0.08)',
              cellPaddingBlock: 12,
            },
            Button: {
              borderRadius: 8,
            },
            Tag: {
              borderRadiusSM: 6,
            },
            Modal: {
              borderRadiusLG: 14,
            },
            Drawer: {
              colorBgElevated: '#ffffff',
            },
          },
        }}
      >
        <div style={{ minHeight: '100vh', background: '#f6f8ff' }}>
          <Story />
        </div>
      </ConfigProvider>
    ),
  ],
};

export default preview;
