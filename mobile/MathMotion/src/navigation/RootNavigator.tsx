import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ArSolutionScreen } from '../screens/ArSolution/ArSolutionScreen';
import { CheckStepsScreen } from '../screens/CheckSteps/CheckStepsScreen';
import { ExamResultScreen } from '../screens/Exam/ExamResultScreen';
import { ExamScreen } from '../screens/Exam/ExamScreen';
import { ExamSetupScreen } from '../screens/Exam/ExamSetupScreen';
import { GeometryScreen } from '../screens/Geometry/GeometryScreen';
import { GuideScreen } from '../screens/Guide/GuideScreen';
import { HistoryScreen } from '../screens/History/HistoryScreen';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { ProblemInputScreen } from '../screens/ProblemInput/ProblemInputScreen';
import { QuizScreen } from '../screens/Quiz/QuizScreen';
import { RecognizedProblemsScreen } from '../screens/RecognizedProblems/RecognizedProblemsScreen';
import { ScanScreen } from '../screens/Scan/ScanScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { SolutionScreen } from '../screens/Solution/SolutionScreen';
import { TopicScreen } from '../screens/Topics/TopicScreen';
import { TopicsScreen } from '../screens/Topics/TopicsScreen';
import { fontFamily, useColors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontFamily: fontFamily.fa.bold, color: colors.textPrimary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        // Home draws its own header with the menu button (HomeHeader);
        // the title still labels the Back button on screens above it.
        options={{ title: t('common.appName'), headerShown: false }}
      />
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
      {/* Scan shows the camera in a card under a normal header (Stitch
          "camera_scan"); AR stays full-bleed with no header bar. */}
      <Stack.Screen name="Scan" component={ScanScreen} options={{ title: t('scan.title') }} />
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
      <Stack.Screen
        name="ExamSetup"
        component={ExamSetupScreen}
        options={{ title: t('exam.title') }}
      />
      <Stack.Screen name="Exam" component={ExamScreen} options={{ title: t('exam.inProgress') }} />
      <Stack.Screen
        name="ExamResult"
        component={ExamResultScreen}
        options={{ title: t('exam.resultTitle') }}
      />
      <Stack.Screen
        name="Geometry"
        component={GeometryScreen}
        options={{ title: t('geometry.title') }}
      />
      <Stack.Screen name="Guide"component={GuideScreen} options={{ title: t('guide.title') }} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings.title') }}
      />
      <Stack.Screen name="Topics" component={TopicsScreen} options={{ title: t('topics.title') }} />
      {/* Title is set by TopicScreen itself from the topic's i18n key. */}
      <Stack.Screen name="Topic" component={TopicScreen} />
    </Stack.Navigator>
  );
}
