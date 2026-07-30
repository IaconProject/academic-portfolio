import React from 'react';
import { PortfolioData } from '@/lib/types';

interface JsonLdSchemaProps {
  data: PortfolioData;
}

export const JsonLdSchema: React.FC<JsonLdSchemaProps> = ({ data }) => {
  const { profile, publications, socialLinks, education, seoSettings } = data;

  const dynamicKeywords = seoSettings?.keywords
    ? seoSettings.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : [
        'İslam Hukuku',
        'Blok Zincir Teknolojisi',
        'Yapay Zeka Etiği',
        'Fıkıh',
        'Akıllı Sözleşmeler',
      ];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.fullName,
    jobTitle: profile.title,
    description: profile.bio,
    image: profile.avatarUrl,
    url: seoSettings?.canonicalUrl || 'https://muhammedakan.com',
    email: profile.email ? `mailto:${profile.email}` : undefined,
    address: profile.location ? {
      '@type': 'PostalAddress',
      addressLocality: profile.location,
    } : undefined,
    alumniOf: education.map((edu) => ({
      '@type': 'EducationalOrganization',
      name: edu.institution,
    })),
    knowsAbout: dynamicKeywords,
    sameAs: socialLinks.map((link) => link.url),
    publication: publications.map((pub) => ({
      '@type': 'ScholarlyArticle',
      name: pub.title,
      datePublished: pub.year,
      publisher: pub.publisher,
      url: pub.url || undefined,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
