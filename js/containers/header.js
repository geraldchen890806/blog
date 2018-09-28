import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <div className="layout-header">
      <div className="container">
        <h3>
          <Link to="/">GeraldChen's Blog</Link>
        </h3>
      </div>
    </div>
  );
}
