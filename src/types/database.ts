export type TransactionCategory = "gelir" | "gider" | "alacak" | "verecek";

export type RecurringOption = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface ProfileRow {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  invite_code?: string | null;
  invited_by?: string | null;
  premium_until?: string | null;
  theme?: string | null;
  invite_count?: number | null;
  plan?: string | null;
  monthly_transaction_count?: number | null;
  last_count_reset?: string | null;
}

export interface ContactRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  note: string | null;
  created_at: string;
}

export interface DefaultCategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  contact_id: string | null;
  category: TransactionCategory;
  amount: number;
  description: string | null;
  audio_url: string | null;
  transcript: string | null;
  date: string;
  created_at: string;
  balance_after: number | null;
  category_tag: string | null;
  due_date: string | null;
  is_paid: boolean;
  recurring: RecurringOption | string | null;
  recurring_end?: string | null;
  contacts?: { name: string; phone?: string | null } | null;
}
