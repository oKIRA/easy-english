import React from 'react';
import { formatToHtml } from './WordEditor';

export interface DocumentViewerProps {
  content: string;
  className?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ content, className = '' }) => {
  const htmlContent = formatToHtml(content || '');

  return (
    <div
      className={`word-document-viewer text-left text-sm text-[#0F172A] leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
