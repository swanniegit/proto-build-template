/**
 * @file Builder block for a clickable breadcrumb link.
 * @coder Claude
 * @category Builder Block
 * @complexity Simple
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbLinkProps } from '../../blocks/types/breadcrumb';

export const BreadcrumbLink: React.FC<BreadcrumbLinkProps> = ({ item, style, hoverStyle }) => {
  const [currentStyle, setCurrentStyle] = React.useState(style);

  const handleMouseEnter = () => {
    setCurrentStyle(hoverStyle);
  };

  const handleMouseLeave = () => {
    setCurrentStyle(style);
  };

  return (
    <Link
      to={item.path!}
      style={currentStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {item.icon && <span>{item.icon}</span>}
      {item.label}
    </Link>
  );
};
