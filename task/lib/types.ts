export type Priority = 'low' | 'medium' | 'high';
export type Status = 'open' | 'done';
export type FilterKey =
  | 'open'
  | 'done'
  | 'all'
  | 'assigned_me'
  | 'assigned_partner'
  | 'due_today'
  | 'overdue'
  | 'archived';

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
};

export type Task = {
  id: string;
  title: string;
  memo: string | null;
  due_date: string | null;
  priority: Priority;
  assignee: string | null;
  status: Status;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
