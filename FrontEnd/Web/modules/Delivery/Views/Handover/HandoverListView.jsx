import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import DeliveryTracking from '../Tracking/DeliveryTrackingView';

const HandoverList = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/handovers');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  return <DeliveryTracking />;
};

export default HandoverList;
