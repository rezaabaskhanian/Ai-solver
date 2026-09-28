import { createDrawerNavigator } from '@react-navigation/drawer';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import React from 'react';

import { DrawerMenu } from '../components/Drawer/DrawerMenu';
import { useIsRTL } from '../hooks/useIsRTL';
import { colors } from '../theme';
import { RootNavigator } from './RootNavigator';
import type { DrawerParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();

// Screens where an edge swipe may open the drawer. Everywhere else it's
// off: deeper screens have a Back gesture on that edge, and Scan/AR are
// full-bleed camera views where a stray swipe shouldn't pull a menu over.
const SWIPE_ENABLED_ON = ['Home', 'Topics', 'History'];

export function AppDrawer() {
  const isRTL = useIsRTL();

  return (
    <Drawer.Navigator
      drawerContent={props => <DrawerMenu {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: isRTL ? 'right' : 'left',
        drawerType: 'front',
        overlayColor: colors.overlay,
        drawerStyle: { backgroundColor: colors.surface },
      }}
    >
      <Drawer.Screen
        name="Main"
        component={RootNavigator}
        options={({ route }) => ({
          swipeEnabled: SWIPE_ENABLED_ON.includes(getFocusedRouteNameFromRoute(route) ?? 'Home'),
        })}
      />
    </Drawer.Navigator>
  );
}
