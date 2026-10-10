import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayIndexOf } from '../content/konkur/dayIndex';

// The current local day index (content/konkur/dayIndex.ts), kept fresh:
// re-read when the app returns to the foreground, when the timezone or
// clock changed in the background, and once a minute while open — so a
// screen left open past midnight rolls over to the new day.
export function useToday(): number {
  const [today, setToday] = useState(() => dayIndexOf(Date.now()));
  useEffect(() => {
    const refresh = () => setToday(dayIndexOf(Date.now()));
    const timer = setInterval(refresh, 60 * 1000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return today;
}
