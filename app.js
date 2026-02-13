import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import VocabularyScreen from './src/screens/VocabularyScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = {
    dark: isDarkMode,
    colors: {
      primary: isDarkMode ? '#3b82f6' : '#2563eb',
      background: isDarkMode ? '#1a1a1a' : '#f3f4f6',
      card: isDarkMode ? '#27272a' : '#ffffff',
      text: isDarkMode ? '#f3f4f6' : '#1f2937',
      border: isDarkMode ? '#3f3f46' : '#e5e7eb',
      notification: '#10b981',
    },
  };

  return (
    <NavigationContainer theme={theme}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            title: 'Word Learning Games',
            headerShown: true,
          }}
        />
        <Stack.Screen 
          name="Game" 
          component={GameScreen}
          options={({ route }) => ({
            title: route.params?.gameName || 'Game',
            headerBackTitle: 'Back',
          })}
        />
        <Stack.Screen 
          name="Vocabulary" 
          component={VocabularyScreen}
          options={{
            title: 'My Vocabulary',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});