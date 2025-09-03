/**
 * @file Builder block for a non-clickable breadcrumb item.
 * @coder Claude
 * @category Builder Block
 * @complexity Simple
 */
import React from 'react';
import { BreadcrumbTextProps } from '../../blocks/types/breadcrumb';

export const BreadcrumbText: React.FC<BreadcrumbTextProps> = ({ item, style }) => {
  return (
    <span style={style}>
      {item.icon && <span>{item.icon}</span>}
      {item.label}
    </span>
  );
};
