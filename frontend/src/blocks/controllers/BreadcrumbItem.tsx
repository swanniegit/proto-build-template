/**
 * @file Controller block that renders the correct breadcrumb item type.
 * @coder Cursor AI
 * @category Controller Block
 * @complexity Simple
 */
import React from 'react';
import { BreadcrumbItemProps } from '../../blocks/types/breadcrumb';
import { useBreadcrumbStyles } from '../../blocks/utilities/hooks/useBreadcrumbStyles';
import { BreadcrumbLink } from '../../blocks/builders/BreadcrumbLink';
import { BreadcrumbText } from '../../blocks/builders/BreadcrumbText';

export const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({ item }) => {
  const styles = useBreadcrumbStyles();

  if (item.path) {
    return <BreadcrumbLink item={item} style={styles.link} hoverStyle={styles.linkHover} />;
  }

  return <BreadcrumbText item={item} style={styles.text} />;
};
