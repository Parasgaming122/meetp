export function generateRoomId(): string {
  // Generates a format like 'abc-defg-hij'
  const segment = () => Math.random().toString(36).substring(2, 5);
  return `${segment()}-${segment()}-${segment()}`;
}

export function getRandomColor(): string {
  const colors = [
    '#ea4335', // Red
    '#fbbc04', // Yellow
    '#34a853', // Green
    '#4285f4', // Blue
    '#ff6d01', // Orange
    '#46bdc6', // Teal
    '#7baaf7', // Light Blue
    '#f06292', // Pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
