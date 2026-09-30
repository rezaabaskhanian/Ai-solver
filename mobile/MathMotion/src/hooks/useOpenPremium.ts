import { useNavigation, type NavigationProp } from '@react-navigation/native';

import type { DrawerParamList } from '../navigation/types';

// Opens the «اشتراک پرمیوم» screen from anywhere — a stack screen or the
// side drawer. Going through the drawer's "Main" route works from both:
// inside the stack the call bubbles up to the drawer navigator.
export function useOpenPremium(): () => void {
  const navigation = useNavigation<NavigationProp<DrawerParamList>>();
  return () => navigation.navigate('Main', { screen: 'Premium' });
}
