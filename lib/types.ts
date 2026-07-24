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
}
