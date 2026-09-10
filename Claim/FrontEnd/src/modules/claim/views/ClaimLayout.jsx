import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import '../styles/claim.css';

const ClaimLayout = () => {
  const context = useOutletContext() || {};
  return <Outlet context={context} />;
};

export default ClaimLayout;
