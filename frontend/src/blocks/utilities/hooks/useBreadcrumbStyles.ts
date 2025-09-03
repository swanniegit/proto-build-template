/**
 * @file Utility hook for providing styles to the Breadcrumb components.
 * @coder Gemini
 * @category Utility Block
 * @complexity Simple
 */
import React from 'react';

const baseLinkStyles: React.CSSProperties = {
  color: '#6b7280',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'color 0.2s',
  fontSize: '14px'
};

const hoverLinkStyles: React.CSSProperties = {
  ...baseLinkStyles,
  color: '#3b82f6'
};

const textStyles: React.CSSProperties = {
  color: '#1f2937',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
};

const separatorStyles: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px'
};

const containerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '16px',
  padding: '0 20px'
};

export const useBreadcrumbStyles = () => {
  return React.useMemo(() => ({
    container: containerStyles,
    link: baseLinkStyles,
    linkHover: hoverLinkStyles,
    text: textStyles,
    separator: separatorStyles,
  }), []);
};
