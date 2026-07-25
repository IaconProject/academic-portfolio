export interface Profile {
  fullName: string;
  title: string;
  subtitle: string;
  bio: string;
  avatarUrl: string;
  email: string;
  location: string;
  cvUrl?: string;
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
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  years: string;
  tags: string[];
  url?: string;
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

export interface SeoSettings {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImageUrl: string;
  canonicalUrl: string;
  authorName: string;
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
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
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
  adminCredentials?: AdminCredentials;
  notificationSettings?: NotificationSettings;
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
