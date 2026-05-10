import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import SubjectsScreen from '../screens/SubjectsScreen';


export type HomeStackParamList = {
  HomeMain: undefined;
  Subjects: undefined;
 
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }} // ✅ IMPORTANT (removes second "Home" header)
      />
      <Stack.Screen name="Subjects" component={SubjectsScreen} options={{ title: 'Subjects' }} />
     
    </Stack.Navigator>
  );
}
