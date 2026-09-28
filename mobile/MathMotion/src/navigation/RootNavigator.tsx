import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ArSolutionScreen } from '../screens/ArSolution/ArSolutionScreen';
import { CheckStepsScreen } from '../screens/CheckSteps/CheckStepsScreen';
import { HistoryScreen } from '../screens/History/HistoryScreen';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { ProblemInputScreen } from '../screens/ProblemInput/ProblemInputScreen';
import { QuizScreen } from '../screens/Quiz/QuizScreen';
import { RecognizedProblemsScreen } from '../screens/RecognizedProblems/RecognizedProblemsScreen';
import { ScanScreen } from '../screens/Scan/ScanScreen';
import { SolutionScreen } from '../screens/Solution/SolutionScreen';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: t('common.appName') }} />
      <Stack.Screen
        name="ProblemInput"
        component={ProblemInputScreen}
        options={{ title: t('problemInput.title') }}
      />
      <Stack.Screen
        name="Solution"
        component={SolutionScreen}
        options={{ title: t('solution.title') }}
      />
      <Stack.Screen name="History" component={HistoryScreen} options={{ title: t('history.title') }} />
      {/* Full-bleed camera/AR — no room for a header bar (see ScanScreen's
          absolute-fill black layout). */}
      <Stack.Screen name="Scan" component={ScanScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ArSolution" component={ArSolutionScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="RecognizedProblems"
        component={RecognizedProblemsScreen}
        options={{ title: t('scan.recognizedTitle') }}
      />
      <Stack.Screen
        name="CheckSteps"
        component={CheckStepsScreen}
        options={{ title: t('checkSteps.title') }}
      />
      <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: t('quiz.title') }} />
    </Stack.Navigator>
  );
}
