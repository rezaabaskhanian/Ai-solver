import React from 'react';
import { AppBottomNav } from '../common/AppBottomNav';

// Height the dock covers, for HomeScreen's bottom padding.
export const HOME_DOCK_SPACE = 75;

export function HomeDock() {
  return <AppBottomNav activeTab="Home" />;
}
