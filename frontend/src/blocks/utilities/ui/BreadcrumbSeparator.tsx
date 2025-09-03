/**
 * @file Pure UI block for the breadcrumb separator.
 * @coder Gemini
 * @category Utility Block
 * @complexity Simple
 */
import React from 'react';
import { useBreadcrumbStyles } from '../hooks/useBreadcrumbStyles';

export const BreadcrumbSeparator: React.FC = () => {
  const styles = useBreadcrumbStyles();
  return <span style={styles.separator}>•</span>;
};
