import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import '../styles/claim.css';

const ClaimLayout = ({ children }) => {
  const context = useOutletContext() || {};
  return (
    <div className="claim-module-container" style={{ width: '100%', minHeight: '100%' }}>
      {children ? (
        React.isValidElement(children)
          ? React.cloneElement(children, { outletContext: context })
          : children
      ) : (
        <Outlet context={context} />
      )}
    </div>
  );
};

export default ClaimLayout;

