export type LogEvent = {
  id: string;
  name: string;
  ts: number;
  payload?: Record<string, any>;
};