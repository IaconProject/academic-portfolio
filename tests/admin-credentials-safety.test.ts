import { describe, expect, it } from 'vitest';

import {
  omitAdminCredentials,
  redactAdminPassword,
} from '../lib/admin-credentials-safety';
import { initialPortfolioData } from '../lib/initial-data';

describe('admin credential boundaries', () => {
  it('removes credentials from generic CMS payloads', () => {
    const payload = {
      profile: initialPortfolioData.profile,
      adminCredentials: {
        email: 'admin@example.com',
        password: 'must-not-be-sent',
      },
    };

    expect(omitAdminCredentials(payload)).not.toHaveProperty('adminCredentials');
  });

  it('redacts cached passwords without changing the email', () => {
    const result = redactAdminPassword({
      ...initialPortfolioData,
      adminCredentials: {
        email: 'admin@example.com',
        password: 'must-not-be-cached',
      },
    });

    expect(result.adminCredentials).toEqual({
      email: 'admin@example.com',
      password: '',
    });
  });
});
