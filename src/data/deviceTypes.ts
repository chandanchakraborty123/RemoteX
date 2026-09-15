import type { DeviceTypeConfig } from '../types';

export const DEVICE_TYPES: DeviceTypeConfig[] = [
  {
    id: 'tv',
    name: 'TV',
    description: 'Smart TV and connected televisions',
    icon: 'tv-outline',
    connectionHints: ['wifi', 'local_network', 'ir'],
  },
  {
    id: 'tv_box',
    name: 'TV Box',
    description: 'Android TV, Google TV and streaming boxes',
    icon: 'cube-outline',
    connectionHints: ['wifi', 'local_network'],
  },
  {
    id: 'ac',
    name: 'AC',
    description: 'Control temperature, fan and modes',
    icon: 'snow-outline',
    connectionHints: ['ir', 'wifi'],
  },
  {
    id: 'speaker',
    name: 'Speaker',
    description: 'Wireless speakers and soundbars',
    icon: 'volume-high-outline',
    connectionHints: ['bluetooth', 'wifi'],
  },
  {
    id: 'media_player',
    name: 'Media Player',
    description: 'Streaming sticks and media centers',
    icon: 'play-circle-outline',
    connectionHints: ['wifi', 'local_network'],
  },
  {
    id: 'projector',
    name: 'Projector',
    description: 'Home theater and portable projectors',
    icon: 'videocam-outline',
    connectionHints: ['wifi', 'ir', 'bluetooth'],
  },
  {
    id: 'pc',
    name: 'PC / Laptop',
    description: 'Control desktop with touchpad and media keys',
    icon: 'laptop-outline',
    connectionHints: ['wifi', 'local_network'],
  },
  {
    id: 'smart_home',
    name: 'Smart Home',
    description: 'Lights, plugs, fans and scenes',
    icon: 'home-outline',
    connectionHints: ['wifi', 'local_network'],
  },
  {
    id: 'gaming',
    name: 'Gaming / Media',
    description: 'Consoles and entertainment hubs',
    icon: 'game-controller-outline',
    connectionHints: ['wifi', 'bluetooth'],
  },
  {
    id: 'other',
    name: 'Other Device',
    description: 'Generic IR, Bluetooth or network devices',
    icon: 'apps-outline',
    connectionHints: ['wifi', 'bluetooth', 'ir', 'manual_ip'],
  },
];
