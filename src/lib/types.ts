export type TradeStatus = "OPEN" | "CLOSED";
export type CashFlowType = "DEPOSIT" | "WITHDRAW";

export interface TradeEntry {
  date: string;
  price: number;
  capital: number;
}

export interface Trade {
  id: string;
  asset: string;
  market: string;
  position: "Long" | "Short" | null;
  entries: TradeEntry[];
  entry_date: string;
  leverage: number | null;
  mark_price: number | null;
  entry_screenshot: string | null;
  exit_date: string | null;
  exit_price: number | null;
  lowest_price: number | null;
  highest_price: number | null;
  pnl: number | null;
  pnl_manual: number | null;
  pnl_percent: number | null;
  exit_screenshot: string | null;
  entry_note: string | null;
  exit_note: string | null;
  setup: string | null;
  status: TradeStatus;
  created_at: string;
  updated_at: string;
}

export interface CashFlow {
  id: string;
  type: CashFlowType;
  market: "Spot" | "Futures" | null;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

export interface EquityPoint {
  date: string;
  equity: number;
}