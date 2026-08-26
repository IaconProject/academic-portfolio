import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'warn',
    },
  },
  {
    // These legacy components predate React 19's effect rule. Keep the rule
    // enabled for all new CMS and blog code while the old screens are migrated.
    files: [
      'app/admin/login/page.tsx',
      'app/admin/page.tsx',
      'components/admin/AdminNavbar.tsx',
      'components/admin/AnalyticsV2Dashboard.tsx',
      'components/admin/CredentialsEditor.tsx',
      'components/admin/MessagesManager.tsx',
      'components/admin/NotificationSettingsEditor.tsx',
      'components/admin/SeoEditor.tsx',
      'components/admin/TabBarSettingsEditor.tsx',
      'components/admin/VisitorLogsManager.tsx',
      'components/public/AnalyticsRuntime.tsx',
      'components/public/ConsentManager.tsx',
      'components/public/PublicExperience.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: [
      'components/admin/VisitorLogsManager.tsx',
      'components/public/VisitorTracker.tsx',
    ],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
