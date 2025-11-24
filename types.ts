
export type WarehouseType = 'Warehouse 1' | 'Warehouse 2';

export interface InventoryItem {
  id: string;
  name: string;
  image: string; // URL or Base64
  unit: string;
  quantity: number;
  minStock?: number; // Threshold for low stock warning
  location: WarehouseType;
  productionDate?: string; // Only for Warehouse 1
  expiryDate?: string;     // Only for Warehouse 1
  lastUpdated: string;
}

export interface Department {
  id: string;
  name: string;
}

// Represents the changes happening in the transaction table
// Map<ItemId, Map<DeptId, { in: number, out: number }>>
export interface TransactionMatrix {
  [itemId: string]: {
    [deptId: string]: {
      in: number;
      out: number;
    };
  };
}

// New: For permanent history log
export interface TransactionRecord {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  departmentId: string;
  departmentName: string;
  type: 'in' | 'out';
  quantity: number;
  timestamp: string; // The exact time the record was created
}
