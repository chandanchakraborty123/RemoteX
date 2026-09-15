import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { BrandScreen } from '../screens/BrandScreen';
import { DeviceConnectionScreen } from '../screens/DeviceConnectionScreen';
import { DeviceTypeScreen } from '../screens/DeviceTypeScreen';
import { DevicesScreen } from '../screens/DevicesScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { KeyboardScreen } from '../screens/KeyboardScreen';
import { MacrosScreen } from '../screens/MacrosScreen';
import { RemoteScreen } from '../screens/RemoteScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { colors } from '../theme';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.secondaryBackground,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
    notification: colors.secondary,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.secondaryBackground,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home-outline',
            Devices: 'tv-outline',
            RemoteTab: 'radio-outline',
            Favorites: 'star-outline',
            Settings: 'settings-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={WelcomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="RemoteTab" component={RemoteScreen} options={{ title: 'Remote' }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { ready } = useApp();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DeviceType" component={DeviceTypeScreen} options={{ title: 'Device Type' }} />
        <Stack.Screen name="Brand" component={BrandScreen} options={{ title: 'Brand' }} />
        <Stack.Screen name="Connection" component={DeviceConnectionScreen} options={{ title: 'Connect' }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan Wi‑Fi' }} />
        <Stack.Screen name="Remote" component={RemoteScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Keyboard" component={KeyboardScreen} options={{ title: 'Type on Device', presentation: 'modal' }} />
        <Stack.Screen name="Macros" component={MacrosScreen} options={{ title: 'Scenes & Macros' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
