import React from 'react';
import { PortfolioData } from '@/lib/types';

interface JsonLdSchemaProps {
  data: PortfolioData;
}

export const JsonLdSchema: React.FC<JsonLdSchemaProps> = ({ data }) => {
  const { profile, publications, socialLinks, education } = data;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.fullName,
    jobTitle: profile.title,
    description: profile.bio,
    image: profile.avatarUrl,
    email: `mailto:${profile.email}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location,
    },
    alumniOf: education.map((edu) => ({
      '@type': 'EducationalOrganization',
      name: edu.institution,
    })),
    knowsAbout: [
      'İslam Hukuku',
      'Blok Zincir Teknolojisi',
      'Yapay Zeka Etiği',
      'Fıkıh',
      'Akıllı Sözleşmeler',
    ],
    sameAs: socialLinks.map((link) => link.url),
    publication: publications.map((pub) => ({
      '@type': 'ScholarlyArticle',
      name: pub.title,
      datePublished: pub.year,
      publisher: pub.publisher,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
