import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Department, TransactionMatrix, TransactionRecord, WarehouseType } from './types';
import { InventoryForm } from './components/InventoryForm';
import { TransactionTable } from './components/TransactionTable';
import { Dashboard } from './components/Dashboard';
import { HistoryTable } from './components/HistoryTable';
import { MonthlyReport } from './components/MonthlyReport';
import { Package, ArrowRightLeft, Plus, Search, Calendar, Share2, ClipboardList, AlertTriangle, LayoutDashboard, History, FileSpreadsheet, BarChart3, Trash2, MapPin, CheckSquare, Square, X, Database, Upload, Download, Settings } from 'lucide-react';

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Frontdesk一楼' },
  { id: 'd2', name: '2ND FLOOR 二楼' },
  { id: 'd3', name: '3RD FLOOR 男宾 NAN BIN' },
  { id: 'd4', name: '3RD FLOOR 女宾 NU BIN' },
  { id: 'd5', name: '5TH FLOOR 五楼' },
  { id: 'd6', name: '6TH FLOOR 六楼' },
  { id: 'd7', name: '7TH FLOOR 七楼' },
  { id: 'd8', name: 'kitchen 厨房' },
  { id: 'd9', name: 'therapist技师' },
  { id: 'd10', name: '财务finance' },
  { id: 'd11', name: 'HR人事' },
  { id: 'd12', name: 'back scrubber后勤' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'transactions' | 'history' | 'reports'>('dashboard');
  
  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [history, setHistory] = useState<TransactionRecord[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false); // Toggle for data menu

  // Multi-selection State
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([]);
  
  // File input ref for restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from LocalStorage
  useEffect(() => {
    const storedItems = localStorage.getItem('inventory_items');
    const storedDepts = localStorage.getItem('inventory_depts');
    const storedHistory = localStorage.getItem('inventory_history');
    
    if (storedItems) setItems(JSON.parse(storedItems));
    if (storedDepts) setDepartments(JSON.parse(storedDepts));
    if (storedHistory) setHistory(JSON.parse(storedHistory));
  }, []);

  // Save data to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('inventory_items', JSON.stringify(items));
    localStorage.setItem('inventory_depts', JSON.stringify(departments));
    localStorage.setItem('inventory_history', JSON.stringify(history));
  }, [items, departments, history]);

  // Clear selection when tab changes
  useEffect(() => {
    setSelectedInventoryIds([]);
  }, [activeTab]);

  const handleAddItem = (item: InventoryItem) => {
    if (editingItem) {
      setItems(items.map(i => i.id === item.id ? item : i));
    } else {
      setItems([...items, item]);
    }
    setEditingItem(null);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this item?\n确定要删除这个物品吗？')) {
      setItems(items.filter(i => i.id !== id));
      setSelectedInventoryIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedInventoryIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedInventoryIds.length} items? Irreversible.\n确定要删除选中的 ${selectedInventoryIds.length} 个物品吗？此操作无法撤销。`)) {
        setItems(items.filter(i => !selectedInventoryIds.includes(i.id)));
        setSelectedInventoryIds([]);
    }
  };

  const handleBulkMove = (targetLocation: WarehouseType) => {
      if (selectedInventoryIds.length === 0) return;
      if (confirm(`Move ${selectedInventoryIds.length} items to ${targetLocation === 'Warehouse 1' ? 'Warehouse 1' : 'Warehouse 2'}?\n确定将选中的 ${selectedInventoryIds.length} 个物品移动到 ${targetLocation === 'Warehouse 1' ? '仓库1' : '仓库2'} 吗？`)) {
          setItems(items.map(item => {
              if (selectedInventoryIds.includes(item.id)) {
                  return { ...item, location: targetLocation, lastUpdated: new Date().toISOString() };
              }
              return item;
          }));
          setSelectedInventoryIds([]);
      }
  };

  const toggleSelection = (id: string) => {
      setSelectedInventoryIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleAddDepartment = (name: string) => {
    if (departments.some(d => d.name === name)) {
        alert('Department already exists 该部门已存在');
        return;
    }
    const newDept: Department = { id: crypto.randomUUID(), name };
    setDepartments([...departments, newDept]);
  };

  const handleUpdateInventory = (matrix: TransactionMatrix, date: string) => {
    const newItems = [...items];
    const newHistoryRecords: TransactionRecord[] = [];
    const timestamp = new Date().toISOString();

    Object.entries(matrix).forEach(([itemId, deptTrans]) => {
      const itemIndex = newItems.findIndex(i => i.id === itemId);
      if (itemIndex > -1) {
        let netChange = 0;
        const item = newItems[itemIndex];

        Object.entries(deptTrans).forEach(([deptId, { in: inQty, out: outQty }]) => {
          const dept = departments.find(d => d.id === deptId);
          const deptName = dept ? dept.name : 'Unknown Dept';

          netChange += (inQty - outQty);
          
          // Create History Record for IN
          if (inQty > 0) {
            newHistoryRecords.push({
              id: crypto.randomUUID(),
              date: date,
              timestamp: timestamp,
              itemId: itemId,
              itemName: item.name,
              itemImage: item.image,
              departmentId: deptId,
              departmentName: deptName,
              type: 'in',
              quantity: inQty
            });
          }

          // Create History Record for OUT
          if (outQty > 0) {
             newHistoryRecords.push({
              id: crypto.randomUUID(),
              date: date,
              timestamp: timestamp,
              itemId: itemId,
              itemName: item.name,
              itemImage: item.image,
              departmentId: deptId,
              departmentName: deptName,
              type: 'out',
              quantity: outQty
            });
          }
        });
        
        // Update item quantity
        newItems[itemIndex] = {
            ...newItems[itemIndex],
            quantity: newItems[itemIndex].quantity + netChange,
            lastUpdated: timestamp
        };
      }
    });

    setItems(newItems);
    setHistory(prev => [...newHistoryRecords, ...prev]);
  };

  const handleDeleteHistoryRecord = (recordId: string) => {
      const record = history.find(r => r.id === recordId);
      if (!record) return;

      const shouldRevertInventory = confirm("Do you also want to revert the inventory change?\n您希望同时撤销库存数量的变动吗？\n\nOK = Delete record AND revert stock (撤销库存)\nCancel = Only delete record (仅删除记录)");

      // Remove record
      setHistory(prev => prev.filter(r => r.id !== recordId));

      if (shouldRevertInventory) {
          setItems(currentItems => currentItems.map(item => {
              if (item.id === record.itemId) {
                  // If original was IN (+), we need to MINUS (-). If original was OUT (-), we need to ADD (+).
                  const reversal = record.type === 'in' ? -record.quantity : record.quantity;
                  return { ...item, quantity: item.quantity + reversal };
              }
              return item;
          }));
          alert("Record deleted and inventory reverted. 记录已删除，库存已回滚。");
      } else {
          alert("Record deleted. Inventory unchanged. 记录已删除，库存未变动。");
      }
  };

  const exportCSV = () => {
    // CSV Header
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Excel Chinese support
    
    // Part 1: Current Inventory
    csvContent += "--- Current Inventory 当前库存清单 ---\n";
    csvContent += "ID,Name(名称),Unit(单位),Quantity(数量),MinStock(最低库存),Location(位置),LastUpdated(上次更新)\n";
    
    items.forEach(item => {
      csvContent += `${item.id},${item.name},${item.unit},${item.quantity},${item.minStock || 0},${item.location},${item.lastUpdated}\n`;
    });

    // Part 2: Transaction History
    csvContent += "\n--- Transaction History 历史记录 ---\n";
    csvContent += "Date(日期),Time(时间),Item(物品),Department(部门),Type(类型),Qty(数量)\n";
    
    history.forEach(h => {
       csvContent += `${h.date},${new Date(h.timestamp).toLocaleTimeString()},${h.itemName},${h.departmentName},${h.type === 'in' ? 'IN 入库' : 'OUT 出库'},${h.quantity}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Backup & Restore Logic ---
  const handleBackup = () => {
    const data = {
        items,
        departments,
        history,
        version: '1.0',
        timestamp: new Date().toISOString()
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartInventory_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDataMenu(false);
  };

  const handleRestoreClick = () => {
      if(fileInputRef.current) {
          fileInputRef.current.click();
      }
      setShowDataMenu(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json && json.items && json.departments) {
                  if (confirm("WARNING: This will overwrite all current data with the backup file. Continue?\n警告：此操作将使用备份文件覆盖当前所有数据。确定继续吗？")) {
                      setItems(json.items);
                      setDepartments(json.departments);
                      setHistory(json.history || []);
                      alert("Data restored successfully! 数据恢复成功！");
                  }
              } else {
                  alert("Invalid backup file format. 无效的备份文件格式。");
              }
          } catch (error) {
              console.error(error);
              alert("Error reading file. 读取文件出错。");
          }
          // Reset input
          if(fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isLowStock = (item.minStock || 0) > 0 && item.quantity <= (item.minStock || 0);

    if (showLowStockOnly && !isLowStock) {
      return false;
    }
    
    return matchesSearch;
  });

  const toggleSelectAll = () => {
      if (selectedInventoryIds.length === filteredItems.length && filteredItems.length > 0) {
          setSelectedInventoryIds([]);
      } else {
          setSelectedInventoryIds(filteredItems.map(i => i.id));
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hidden File Input for Restore */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center h-auto md:h-16 py-2 md:py-0 gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Package className="text-white" size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Inventory <span className="text-indigo-600">系统</span></h1>
            </div>
            
            <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto max-w-full">
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <LayoutDashboard size={18} /> Dashboard 仪表盘
              </button>
              <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <ClipboardList size={18} /> Inventory 库存一览
              </button>
              <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'transactions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <ArrowRightLeft size={18} /> Transactions 出入库
              </button>
              <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'reports' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <BarChart3 size={18} /> Reports 报表
              </button>
              <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <History size={18} /> History 历史记录
              </button>
            </nav>

            <div className="flex items-center gap-2 relative">
               <button 
                  onClick={() => setShowDataMenu(!showDataMenu)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 font-medium"
               >
                 <Settings size={16} /> Data 数据
               </button>

               {/* Data Management Menu */}
               {showDataMenu && (
                 <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                        <button onClick={exportCSV} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                            <FileSpreadsheet size={16} className="text-emerald-600"/> Export Excel 导出
                        </button>
                        <div className="my-1 border-t border-gray-100"></div>
                        <button onClick={handleBackup} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                            <Download size={16} className="text-blue-600"/> Backup JSON 备份数据
                        </button>
                        <button onClick={handleRestoreClick} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                            <Upload size={16} className="text-amber-600"/> Restore JSON 恢复数据
                        </button>
                    </div>
                 </div>
               )}

               {/* Click outside closer overlay */}
               {showDataMenu && <div className="fixed inset-0 z-40" onClick={() => setShowDataMenu(false)}></div>}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {activeTab === 'dashboard' && (
           <Dashboard items={items} history={history} departments={departments} />
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Inventory Toolbar */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex flex-1 gap-2 items-center">
                 {/* Select All Checkbox */}
                 {filteredItems.length > 0 && (
                     <button 
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-indigo-600 transition-colors"
                        title={selectedInventoryIds.length === filteredItems.length ? "Deselect All 取消全选" : "Select All Current Page 全选当前页"}
                     >
                        {selectedInventoryIds.length > 0 && selectedInventoryIds.length === filteredItems.length ? (
                            <CheckSquare size={20} className="text-indigo-600" />
                        ) : (
                            <Square size={20} />
                        )}
                     </button>
                 )}
                
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search items... 搜索物品名称或位置..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                  className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-lg border transition-all ${
                    showLowStockOnly
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Filter Low Stock 仅显示低库存"
                >
                  <AlertTriangle size={18} className={showLowStockOnly ? 'text-rose-600' : 'text-gray-400'} />
                  <span className="hidden sm:inline">Low Stock 库存预警</span>
                </button>
              </div>
              <button
                onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                <Plus size={20} /> Add Item 添加物品
              </button>
            </div>

            {/* Bulk Actions Bar */}
            {selectedInventoryIds.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">{selectedInventoryIds.length}</span>
                        <span className="text-indigo-900 font-medium text-sm">Selected 已选择物品</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleBulkMove('Warehouse 1')}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            <MapPin size={14} /> Move to W1 移至仓库1
                        </button>
                        <button 
                            onClick={() => handleBulkMove('Warehouse 2')}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            <MapPin size={14} /> Move to W2 移至仓库2
                        </button>
                        <div className="w-px h-8 bg-indigo-200 mx-1"></div>
                        <button 
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-sm transition-colors"
                        >
                            <Trash2 size={14} /> Batch Delete 批量删除
                        </button>
                        <button 
                            onClick={() => setSelectedInventoryIds([])}
                            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors ml-1"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Inventory Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="text-gray-400" size={40} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No Items Found 未找到物品</h3>
                <p className="text-gray-500">
                  {showLowStockOnly ? "Great! No low stock items. 太棒了！目前没有库存不足的物品。" : "Click 'Add Item' to start. 点击右上角添加您的第一个物品。"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => {
                  const isLowStock = (item.minStock || 0) > 0 && item.quantity <= (item.minStock || 0);
                  const isSelected = selectedInventoryIds.includes(item.id);
                  
                  return (
                    <div 
                        key={item.id} 
                        className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden group relative ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200'}`}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2 z-20">
                           <button
                             onClick={() => toggleSelection(item.id)}
                             className={`w-6 h-6 rounded flex items-center justify-center border transition-colors bg-white ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-transparent hover:border-indigo-400'}`}
                           >
                              <CheckSquare size={16} className={isSelected ? 'block' : 'hidden'} />
                           </button>
                      </div>

                      {/* Visual Indicator for Low Stock */}
                      {isLowStock && (
                        <div className="absolute top-2 right-2 z-10 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                          <AlertTriangle size={12} /> Low Stock
                        </div>
                      )}

                      <div className="aspect-video w-full bg-gray-100 relative overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute bottom-2 right-2 flex gap-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${item.location === 'Warehouse 1' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {item.location === 'Warehouse 1' ? 'W1 仓库1' : 'W2 仓库2'}
                            </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{item.name}</h3>
                          <span className={`text-sm font-medium px-2 py-1 rounded-md ${isLowStock ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-600'}`}>
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          {(item.minStock || 0) > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="w-20">Min Stock 最低:</span>
                              <span className="font-medium">{item.minStock} {item.unit}</span>
                            </div>
                          )}
                          {item.location === 'Warehouse 1' && (
                            <>
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" /> 
                                <span>Prod: <span className="text-gray-900">{item.productionDate}</span></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-rose-400" /> 
                                <span>Exp: <span className="text-gray-900">{item.expiryDate}</span></span>
                              </div>
                            </>
                          )}
                          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100 mt-2">
                              Updated 更新: {new Date(item.lastUpdated).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditItem(item)}
                            className="flex-1 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            Edit 编辑
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="flex-1 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          >
                            Delete 删除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Transactions 出入库记录</h2>
                <p className="text-gray-500">Manage daily distribution and stock movement. 管理每日分发和库存变动。</p>
             </div>
             <TransactionTable 
                items={items}
                departments={departments}
                history={history}
                onAddDepartment={handleAddDepartment}
                onUpdateInventory={handleUpdateInventory}
             />
          </div>
        )}

        {activeTab === 'reports' && (
          <MonthlyReport items={items} history={history} />
        )}

        {activeTab === 'history' && (
          <HistoryTable history={history} onDeleteRecord={handleDeleteHistoryRecord}/>
        )}
      </main>

      {/* Modal */}
      <InventoryForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
        onSubmit={handleAddItem}
        initialData={editingItem}
      />
    </div>
  );
};

export default App;