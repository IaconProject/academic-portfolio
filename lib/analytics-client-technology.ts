'use client';

import type { AnalyticsClientTechnology } from './analytics-contract';

type UaBrandVersion = { brand: string; version: string };

type NavigatorUserAgentData = {
  brands?: UaBrandVersion[];
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (
    hints: string[]
  ) => Promise<{
    brands?: UaBrandVersion[];
    fullVersionList?: UaBrandVersion[];
    mobile?: boolean;
    model?: string;
    platform?: string;
    platformVersion?: string;
  }>;
};

let technologyPromise: Promise<AnalyticsClientTechnology | null> | null = null;

function cleanTechnologyText(
  value: string | null | undefined,
  maxLength: number
): string | undefined {
  const cleaned = (value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return cleaned || undefined;
}

function preferredBrowser(
  values: UaBrandVersion[] | undefined
): UaBrandVersion | undefined {
  const usable = (values || []).filter(
    (item) =>
      item?.brand &&
      item?.version &&
      !/not[\s_-]*a[\s_-]*brand/i.test(item.brand)
  );
  return (
    usable.find((item) => !/^chromium$/i.test(item.brand)) || usable[0]
  );
}

async function readTechnology(): Promise<AnalyticsClientTechnology | null> {
  if (typeof navigator === 'undefined') return null;

  const userAgentData = (
    navigator as Navigator & { userAgentData?: NavigatorUserAgentData }
  ).userAgentData;
  if (!userAgentData) return null;

  let values: Awaited<
    ReturnType<NonNullable<NavigatorUserAgentData['getHighEntropyValues']>>
  > = userAgentData;
  if (userAgentData.getHighEntropyValues) {
    try {
      values = await userAgentData.getHighEntropyValues([
        'fullVersionList',
        'model',
        'platformVersion',
      ]);
    } catch {
      // Low-entropy Client Hints still improve device classification.
    }
  }

  const browser = preferredBrowser(
    values.fullVersionList || values.brands || userAgentData.brands
  );
  const result: AnalyticsClientTechnology = {
    platform: cleanTechnologyText(
      values.platform || userAgentData.platform,
      64
    ),
    platformVersion: cleanTechnologyText(values.platformVersion, 64),
    deviceModel: cleanTechnologyText(values.model, 128),
    browserName: cleanTechnologyText(browser?.brand, 128),
    browserVersion: cleanTechnologyText(browser?.version, 64),
    mobile: values.mobile ?? userAgentData.mobile,
  };

  return Object.values(result).some((value) => value !== undefined)
    ? result
    : null;
}

/**
 * Cached per page runtime so the browser is queried once, not for every event.
 * Unsupported browsers simply fall back to the server-side UA parser.
 */
export function getAnalyticsClientTechnology(): Promise<AnalyticsClientTechnology | null> {
  technologyPromise ||= readTechnology();
  return technologyPromise;
}
