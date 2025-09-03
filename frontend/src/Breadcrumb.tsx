/**
 * @file Composition root for the Breadcrumb component.
 * @coder Gemini
 * @category Composition Root
 */
import React from 'react';
import { BreadcrumbContainerProps } from './blocks/types/breadcrumb';
import { useBreadcrumbStyles } from './blocks/utilities/hooks/useBreadcrumbStyles';
import { BreadcrumbItem } from './blocks/controllers/BreadcrumbItem';
import { BreadcrumbSeparator } from './blocks/utilities/ui/BreadcrumbSeparator';

const Breadcrumb: React.FC<BreadcrumbContainerProps> = ({ items }) => {
  const styles = useBreadcrumbStyles();

  return (
    <div style={styles.container}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <BreadcrumbSeparator />}
          <BreadcrumbItem item={item} />
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumb;
