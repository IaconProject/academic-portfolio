export interface Profile {
  fullName: string;
  title: string;
  subtitle: string;
  bio: string;
  avatarUrl: string;
  email: string;
  location: string;
  cvUrl?: string;
  updatedAt?: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  years: string;
  status: string;
  description?: string;
  isCurrent?: boolean;
}

export interface PublicationItem {
  id: string;
  type: string;
  title: string;
  publisher?: string;
  year: string;
  url?: string;
  doi?: string;
  slug?: string;
  locale?: SiteLocale;
  translationGroupId?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  detailStatus?: ContentStatus;
  isFeatured?: boolean;
  sortOrder?: number;
  publishedAt?: string;
  updatedAt?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  years: string;
  tags: string[];
  url?: string;
  slug?: string;
  locale?: SiteLocale;
  translationGroupId?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  relatedPublicationIds?: string[];
  detailStatus?: ContentStatus;
  isFeatured?: boolean;
  sortOrder?: number;
  publishedAt?: string;
  updatedAt?: string;
}

export interface ConferenceItem {
  id: string;
  title: string;
  eventName: string;
  location: string;
  year: string;
  role: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  organization: string;
  years: string;
  description?: string;
}

export interface ReferenceItem {
  id: string;
  name: string;
  title: string;
  institution: string;
  email?: string;
  phone?: string;
  isFeatured: boolean;
}

export interface SocialLink {
  id: string;
  platform: 'LinkedIn' | 'ORCID' | 'GitHub' | 'Google Scholar' | 'Twitter' | 'Academic';
  url: string;
  iconName: string;
}

export interface SeoRobotsRule {
  id: string;
  name: string;
  enabled: boolean;
  userAgents: string[];
  allow: string[];
  disallow: string[];
}

export interface SeoSitemapConfig {
  enabled: boolean;
  includePublications: boolean;
  includeProjects: boolean;
  includeArticles: boolean;
  additionalPaths: string[];
}

export interface SeoSettings {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImageUrl: string;
  canonicalUrl: string;
  authorName: string;
  siteName?: string;
  titleTemplate?: string;
  defaultLocale?: SiteLocale;
  twitterHandle?: string;
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  ga4MeasurementId?: string;
  gscProperty?: string;
  ga4PropertyId?: string;
  enableAnalytics?: boolean;
  allowIndexing?: boolean;
  alternateName?: string;
  orcidUrl?: string;
  scholarUrl?: string;
  robotsRules?: SeoRobotsRule[];
  sitemapConfig?: SeoSitemapConfig;
}

export type SiteLocale = 'tr' | 'en';
export type ContentStatus = 'none' | 'draft' | 'scheduled' | 'published';
export type SearchIntent = 'informational' | 'navigational' | 'academic' | 'transactional';

export interface SeoPage {
  id?: string;
  routeKey: string;
  path: string;
  locale: SiteLocale;
  title?: string;
  description?: string;
  focusKeyword?: string;
  relatedKeywords: string[];
  searchIntent?: SearchIntent;
  topicCluster?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  canonicalOverride?: string;
  index: boolean;
  follow: boolean;
  includeInSitemap: boolean;
  presentation?: SeoPagePresentation;
  updatedAt?: string;
}

export interface SeoPagePresentation {
  eyebrow?: string;
  heading?: string;
  intro?: string;
}

export interface SeoRedirect {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 308;
  reason?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeoRevision {
  id: string;
  entityType: 'settings' | 'page' | 'redirect';
  entityKey: string;
  snapshot: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
}

export interface SeoAuditIssue {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'indexing' | 'metadata' | 'content' | 'schema' | 'performance';
  title: string;
  detail: string;
  path?: string;
}

export interface SeoAuditResult {
  id?: string;
  score: number;
  categoryScores?: Record<SeoAuditIssue['category'], number>;
  issues: SeoAuditIssue[];
  checkedAt: string;
}

export interface ArticleItem {
  id: string;
  slug: string;
  locale: SiteLocale;
  translationGroupId?: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  status: Exclude<ContentStatus, 'none'>;
  isFeatured?: boolean;
  sortOrder?: number;
  authorName?: string;
  publishedAt?: string;
  updatedAt?: string;
  relatedKeywords: string[];
  topicCluster?: string;
  references: string[];
}

export interface AdminCredentials {
  email: string;
  password: string;
  updatedAt?: string;
}

export interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  notifyOnNewMessage: boolean;
  notifyOnNewVisitor: boolean;
  recipientEmail: string;
  recipientEmails?: string[];
  senderEmail?: string;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

export type TabBarActionId = 'home' | 'blog' | 'theme' | 'email' | 'contact';
export type TabBarLightPalette = 'ivory' | 'sand' | 'sage' | 'mist';
export type TabBarDarkPalette = 'obsidian' | 'midnight' | 'forest' | 'plum';

export interface TabBarButtonSetting {
  id: TabBarActionId;
  visible: boolean;
}

export interface TabBarSettings {
  version: 1;
  enabled: boolean;
  buttons: TabBarButtonSetting[];
  lightPalette: TabBarLightPalette;
  darkPalette: TabBarDarkPalette;
}

export interface PortfolioData {
  profile: Profile;
  education: EducationItem[];
  publications: PublicationItem[];
  projects: ProjectItem[];
  conferences: ConferenceItem[];
  activities: ActivityItem[];
  references: ReferenceItem[];
  socialLinks: SocialLink[];
  seoSettings: SeoSettings;
  tabBarSettings: TabBarSettings;
  adminCredentials?: AdminCredentials;
  notificationSettings?: NotificationSettings;
  articles?: ArticleItem[];
  seoPages?: SeoPage[];
  seoRedirects?: SeoRedirect[];
}

export interface VisitorLog {
  id: string;
  ipAddress: string;
  country: string;
  countryCode: string;
  city: string;
  region: string;
  isp: string;
  isMobileNetwork: boolean;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  deviceBrand: string;
  deviceModel: string;
  osName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
  screenResolution: string;
  language: string;
  pagePath: string;
  referrer: string;
  userAgent: string;
  timestamp: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  phone?: string;
  message: string;
  isRead: boolean;
  isStarred: boolean;
  ipAddress?: string;
  createdAt: string;
}

export interface PageNavStep {
  path: string;
  title: string;
  timestamp: string;
}

export interface VisitorSession {
  id: string;
  sessionId: string;
  legacySource?: 'visitor_sessions' | 'visitor_logs';
  legacySourceId?: string;
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  region: string;
  isp: string;
  isMobileNetwork: boolean;
  deviceBrand: string;
  deviceModel: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  osName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
  userAgent: string;
  lat: number;
  lon: number;
  pages: PageNavStep[];
  createdAt: string;
  updatedAt: string;
}
