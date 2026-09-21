import React from 'react';
import { Outlet } from 'react-router-dom';
import { FeedbackHeader } from './FeedbackHeader';
import { FeedbackSidebar } from './FeedbackSidebar';

export const FeedbackLayout = () => {
  return (
    <div className="feedback-shell">
      <FeedbackSidebar />
      <div className="feedback-main-wrapper">
        <FeedbackHeader />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FeedbackLayout;
