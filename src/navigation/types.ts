import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DeviceBrand, DeviceCategory } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  Welcome: undefined;
  DeviceType: undefined;
  Brand: { deviceType: DeviceCategory };
  Connection: { deviceType: DeviceCategory; brand: DeviceBrand };
  Scan: undefined;
  Remote: undefined;
  Keyboard: undefined;
  Macros: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Devices: undefined;
  RemoteTab: undefined;
  Favorites: undefined;
  Settings: undefined;
};

export type RootStackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
