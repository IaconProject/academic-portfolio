type RefinedDeviceDetails = {
  brand: string | null;
  model: string | null;
};

function cleanDeviceText(
  value: string | null | undefined,
  maxLength = 128
): string | null {
  const cleaned = (value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return cleaned || null;
}

function inferAndroidModel(userAgent: string): string | null {
  const match = userAgent.match(
    /Android\s+[^;()]+;\s*(?:[a-z]{2}(?:[-_][A-Z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/[A-Za-z0-9._-]+)?[;)]/i
  );
  if (!match) return null;
  const candidate = cleanDeviceText(match[1]);
  if (!candidate || /^(?:wv|mobile|tablet)$/i.test(candidate)) return null;
  return candidate;
}

function inferBrandFromModel(model: string | null): string | null {
  if (!model) return null;
  if (/^(?:SM-|GT-|SCH-|SGH-|Samsung\b)/i.test(model)) return 'Samsung';
  if (/^(?:Pixel\b|Nexus\b)/i.test(model)) return 'Google';
  if (/^(?:Redmi\b|POCO\b|Mi\s)/i.test(model)) return 'Xiaomi';
  if (/^(?:HUAWEI\b|VOG-|ELE-|ANA-|LYA-)/i.test(model)) return 'Huawei';
  if (/^(?:CPH|OPPO\b)/i.test(model)) return 'OPPO';
  if (/^(?:ONEPLUS\b|A\d{4}\b)/i.test(model)) return 'OnePlus';
  if (/^(?:moto\b|XT\d+)/i.test(model)) return 'Motorola';
  if (/^(?:V\d{4}\b|vivo\b)/i.test(model)) return 'vivo';
  if (/^(?:RMX\d+|realme\b)/i.test(model)) return 'realme';
  if (/^(?:TECNO\b|Infinix\b|HONOR\b)/i.test(model)) {
    return model.split(/\s+/)[0];
  }
  return null;
}

/**
 * Conservatively fills gaps left by User-Agent parsers. It intentionally
 * avoids guessing a hardware manufacturer for desktop operating systems:
 * Windows does not imply Microsoft hardware and macOS does not imply a
 * MacBook. Raw User-Agent values never leave the request boundary.
 */
export function refineAnalyticsDeviceDetails({
  userAgent,
  parsedBrand,
  parsedModel,
  osName,
}: {
  userAgent: string;
  parsedBrand?: string | null;
  parsedModel?: string | null;
  osName?: string | null;
}): RefinedDeviceDetails {
  const ua = userAgent || '';
  const normalizedOs = (osName || '').toLocaleLowerCase('en-US');
  let brand = cleanDeviceText(parsedBrand);
  let model = cleanDeviceText(parsedModel);

  if (!model) {
    if (/iPhone/i.test(ua)) model = 'iPhone';
    else if (/iPad/i.test(ua)) model = 'iPad';
    else if (/Macintosh|Mac OS X/i.test(ua)) model = 'Mac';
    else if (/Windows NT/i.test(ua)) model = 'Windows PC';
    else if (/CrOS/i.test(ua)) model = 'Chromebook';
    else if (/Android/i.test(ua)) model = inferAndroidModel(ua);
    else if (/Linux/i.test(ua)) model = 'Linux PC';
  }

  if (!brand) {
    if (
      normalizedOs === 'ios' ||
      normalizedOs === 'macos' ||
      /iPhone|iPad|Macintosh|Mac OS X/i.test(ua)
    ) {
      brand = 'Apple';
    } else {
      brand = inferBrandFromModel(model);
    }
  }

  return { brand, model };
}
