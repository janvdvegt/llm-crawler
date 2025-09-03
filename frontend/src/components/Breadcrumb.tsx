import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const location = useLocation();

  return (
    <nav 
      aria-label="breadcrumb" 
      className={`breadcrumb ${className}`}
      style={{
        padding: '0.75rem 0',
        borderBottom: '1px solid #e1e5e9',
        marginBottom: '1.5rem'
      }}
    >
      <ol style={{
        display: 'flex',
        alignItems: 'center',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        fontSize: '0.875rem'
      }}>
        {items.map((item, index) => (
          <li key={item.path} style={{ display: 'flex', alignItems: 'center' }}>
            {index > 0 && (
              <span style={{
                margin: '0 0.5rem',
                color: '#6c757d',
                fontSize: '0.75rem'
              }}>
                /
              </span>
            )}
            {item.isActive || location.pathname === item.path ? (
              <span style={{
                color: '#495057',
                fontWeight: '500',
                textDecoration: 'none'
              }}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                style={{
                  color: '#007bff',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0056b3'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#007bff'}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
