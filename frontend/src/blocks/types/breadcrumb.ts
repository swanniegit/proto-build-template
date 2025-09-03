/**
 * @file Defines the type interfaces for the Breadcrumb component blocks.
 * @coder Gemini
 * @rewritetime 1 minute
 */
import React from 'react';

export interface BreadcrumbItemData {
  label: string;
  path?: string;
  icon?: string;
}

export interface BreadcrumbContainerProps {
  items: BreadcrumbItemData[];
}

export interface BreadcrumbItemProps {
  item: BreadcrumbItemData;
}

export interface BreadcrumbLinkProps {
  item: BreadcrumbItemData;
  style: React.CSSProperties;
  hoverStyle: React.CSSProperties;
}

export interface BreadcrumbTextProps {
  item: BreadcrumbItemData;
  style: React.CSSProperties;
}
