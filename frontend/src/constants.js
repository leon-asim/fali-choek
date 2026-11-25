export const SPORTS = [
  { name: 'Football', icon: '⚽' },
  { name: 'Basketball', icon: '🏀' },
  { name: 'Volleyball', icon: '🏐' },
  { name: 'Futsal', icon: '🥅' },
  { name: 'Tennis', icon: '🎾' },
  { name: 'Handball', icon: '🤾' },
  { name: 'Other', icon: '🏅' },
];
export const CITIES = [
  'Skopje', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo', 'Ohrid', 'Veles',
  'Štip', 'Strumica', 'Gostivar', 'Kočani', 'Kavadarci', 'Kičevo', 'Struga',
];
export const LEVELS = ['Beginner', 'Casual', 'Intermediate', 'Advanced'];
export const SHIRTS = ['Dark', 'Light', 'Any'];
export const VIBES = ['Just for fun', 'Tryhard'];
export const iconFor = (sport) => SPORTS.find((s) => s.name === sport)?.icon ?? '🏅';

// Approximate city centers, used to open the map in the right place
export const CITY_COORDS = {
  Skopje: [41.9981, 21.4254], Bitola: [41.0319, 21.3347], Kumanovo: [42.1322, 21.7144],
  Prilep: [41.3451, 21.555], Tetovo: [42.0069, 20.9715], Ohrid: [41.1231, 20.8016],
  Veles: [41.7156, 21.7755], 'Štip': [41.7458, 22.1958], Strumica: [41.4378, 22.6427],
  Gostivar: [41.7983, 20.9082], 'Kočani': [41.9164, 22.4128], Kavadarci: [41.4331, 22.0119],
  'Kičevo': [41.5129, 20.9589], Struga: [41.1778, 20.6783],
};
// Same box the backend accepts
export const inMacedonia = (c) => c.latitude >= 40.8 && c.latitude <= 42.4 && c.longitude >= 20.4 && c.longitude <= 23.1;
