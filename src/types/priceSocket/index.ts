export interface ChartData {
  o: number; // Open price
  h: number; // High price
  l: number; // Low price
  c: number; // Close price
  v: number; // Volume
  t: number; // Timestamp (Unix)
}
export interface ApiResponse {
  bars?: ChartData[]; // Optional bars property
}

export interface RS {
  t: number;
  o: number;
  c: number;
  h: number;
  l: number;
}
