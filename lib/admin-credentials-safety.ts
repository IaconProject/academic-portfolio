import { PortfolioData } from './types';

export function omitAdminCredentials<T extends object>(
  value: T
): Omit<T, 'adminCredentials'> {
  const safeValue = { ...value } as T & { adminCredentials?: unknown };
  delete safeValue.adminCredentials;
  return safeValue as Omit<T, 'adminCredentials'>;
}

export function redactAdminPassword(data: PortfolioData): PortfolioData {
  if (!data.adminCredentials) return data;

  return {
    ...data,
    adminCredentials: {
      ...data.adminCredentials,
      password: '',
    },
  };
}
