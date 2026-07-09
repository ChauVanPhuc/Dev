import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import '../styles/claim.css';

const PortalLayout = () => {
  const context = useOutletContext();
  return <Outlet context={context} />;
};

export default PortalLayout;
