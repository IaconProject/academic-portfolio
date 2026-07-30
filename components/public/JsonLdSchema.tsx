import React from 'react';
import { PortfolioData } from '@/lib/types';
import { buildHomeJsonLd } from '@/lib/seo';

interface JsonLdSchemaProps {
  data: PortfolioData;
}

export const JsonLdSchema: React.FC<JsonLdSchemaProps> = ({ data }) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(buildHomeJsonLd(data)).replace(/</g, '\\u003c'),
      }}
    />
  );
};
