export interface ComplaintRow {
  id: string;
  originalText: string;
  officialText: string;
  category: string;
  priority: string;
  assignedTo: string;
  assignedUser: string | null;
  status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnDutyUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  status: string;
}
