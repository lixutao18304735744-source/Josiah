import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, Department, TransactionMatrix, TransactionRecord } from '../types';
import { Camera, Save, Plus, Trash2, Calendar, ArrowRight, ArrowLeft, Check, X, ArrowRightLeft, History, FileText, AlertCircle } from 'lucide-react';

// Declare html2canvas globally
declare const html2canvas: any;

interface TransactionTableProps {
  items: InventoryItem[];
  departments: Department[];
  history?: TransactionRecord[]; // Optional history for reconstructing past views
  onUpdateInventory: (matrix: TransactionMatrix, date: string) => void;
  onAddDepartment: (name: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  items,
  departments,
  history = [],
  onUpdateInventory,
  onAddDepartment,
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  // Committed transactions (read-only from history) - these show as "Saved"
  const [committedTransactions, setCommittedTransactions] = useState<TransactionMatrix>({});
  
  // New transactions (drafts) - these show as "Editable/Pending"
  const [newTransactions, setNewTransactions] = useState<TransactionMatrix>({});
  
  // Drafts storage: date -> { selectedItemIds, newTransactions, activeRows }
  const [drafts, setDrafts] = useState<Record<string, { 
    selectedItemIds: string[], 
    newTransactions: TransactionMatrix,
    activeRows: Record<string, { deptId: string, type: 'out' | 'in', qty: string }>
  }>>({});

  // Local state for the "Add Transaction" inline form
  const [activeRows, setActiveRows] = useState<Record<string, { deptId: string, type: 'out' | 'in', qty: string }>>({});

  const [newDeptName, setNewDeptName] = useState('');
  const [selectedAddItem, setSelectedAddItem] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const tableRef = useRef<HTMLDivElement>(null);

  // Helper to rebuild committed transactions from the global history log
  const reconstructHistoryForDate = (targetDate: string) => {
      const historyForDate = history.filter(h => h.date === targetDate);
      const matrix: TransactionMatrix = {};
      const historyItemIds = new Set<string>();

      historyForDate.forEach(h => {
        historyItemIds.add(h.itemId);
        if (!matrix[h.itemId]) matrix[h.itemId] = {};
        if (!matrix[h.itemId][h.departmentId]) matrix[h.itemId][h.departmentId] = { in: 0, out: 0 };
        
        if (h.type === 'in') matrix[h.itemId][h.departmentId].in += h.quantity;
        if (h.type === 'out') matrix[h.itemId][h.departmentId].out += h.quantity;
      });

      setCommittedTransactions(matrix);
      return Array.from(historyItemIds);
  };

  // --- Date Switch Logic with Auto-Save Drafts ---
  const switchDate = (newDate: string) => {
    // 1. Save CURRENT state to draft (Snapshot)
    // We save whatever is currently on screen (except committed stuff which comes from history)
    setDrafts(prev => ({
        ...prev,
        [date]: {
            selectedItemIds: [...selectedItemIds], // Save the list of items user is working on
            newTransactions: { ...newTransactions }, // Save uncommitted numbers
            activeRows: { ...activeRows } // Save open input boxes
        }
    }));

    // 2. Switch Date
    setDate(newDate);

    // 3. Load NEXT state
    // First, always load committed history for the new date (Base Layer)
    const historyItems = reconstructHistoryForDate(newDate);

    if (drafts[newDate]) {
        // A. If we have a draft, load it overlaying the history
        const draft = drafts[newDate];
        
        // Merge history items with draft items (ensure no duplicates)
        const combinedItems = Array.from(new Set([...historyItems, ...draft.selectedItemIds]));
        
        setSelectedItemIds(combinedItems);
        setNewTransactions(draft.newTransactions);
        setActiveRows(draft.activeRows);
    } else {
        // B. No draft? Just show history.
        setSelectedItemIds(historyItems);
        setNewTransactions({});
        setActiveRows({});
    }
  };

  // Initial load
  useEffect(() => {
     const historyItems = reconstructHistoryForDate(date);
     if (historyItems.length > 0) {
         setSelectedItemIds(prev => Array.from(new Set([...prev, ...historyItems])));
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]); // Re-run if history prop updates (e.g. after submit)

  // --- Inline Form Handlers ---
  const startAddingTransaction = (itemId: string) => {
    setActiveRows(prev => ({
      ...prev,
      [itemId]: { deptId: departments[0]?.id || '', type: 'out', qty: '' }
    }));
  };

  const cancelAddingTransaction = (itemId: string) => {
    const newRows = { ...activeRows };
    delete newRows[itemId];
    setActiveRows(newRows);
  };

  const saveTransaction = (itemId: string) => {
    const formState = activeRows[itemId];
    if (!formState || !formState.deptId || !formState.qty) return;

    const qtyNum = parseInt(formState.qty);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    // Update newTransactions (Draft)
    setNewTransactions(prev => {
      const itemTrans = prev[itemId] || {};
      const deptTrans = itemTrans[formState.deptId] || { in: 0, out: 0 };
      
      return {
        ...prev,
        [itemId]: {
          ...itemTrans,
          [formState.deptId]: {
            ...deptTrans,
            [formState.type]: deptTrans[formState.type] + qtyNum
          }
        }
      };
    });

    // Close the inline form
    cancelAddingTransaction(itemId);
  };

  // --- General Handlers ---

  const handleAddItemRow = () => {
    if (selectedAddItem && !selectedItemIds.includes(selectedAddItem)) {
      setSelectedItemIds([...selectedItemIds, selectedAddItem]);
      setSelectedAddItem('');
    }
  };

  const handleRemoveItemRow = (id: string) => {
    // Only remove if no history exists for this day to preserve data integrity
    if (committedTransactions[id]) {
        if(!confirm('This item has saved records for this date. Removing it will only hide it from view (records remain in history). Continue?\n此物品已有今日保存的记录。从表格移除仅会在视图中隐藏（历史记录保留）。继续？')) {
            return;
        }
    }
    setSelectedItemIds(selectedItemIds.filter(itemId => itemId !== id));
    
    // Clear draft data for this item
    const newTrans = { ...newTransactions };
    delete newTrans[id];
    setNewTransactions(newTrans);
  };

  const removeDraftTransaction = (itemId: string, deptId: string, type: 'in' | 'out') => {
      setNewTransactions(prev => {
          const newItemTrans = { ...(prev[itemId] || {}) };
          if (newItemTrans[deptId]) {
              newItemTrans[deptId] = {
                  ...newItemTrans[deptId],
                  [type]: 0 
              };
              // Clean up empty objects
              if (newItemTrans[deptId].in === 0 && newItemTrans[deptId].out === 0) {
                  delete newItemTrans[deptId];
              }
          }
          return { ...prev, [itemId]: newItemTrans };
      });
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDeptName.trim()) {
      onAddDepartment(newDeptName.trim());
      setNewDeptName('');
    }
  };

  const handleScreenshot = async () => {
    if (tableRef.current) {
      // Temporarily hide actions column if needed, or just keep it
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `Inventory_Sheet_${date}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleSubmit = () => {
    if (Object.keys(newTransactions).length === 0) return;
    
    // 1. Commit to History (App Level)
    onUpdateInventory(newTransactions, date); 
    
    // 2. Clear Drafts for this date (because they are now history)
    setNewTransactions({});
    setDrafts(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[date]; // Remove draft for today since we saved it
        return newDrafts;
    });

    // 3. IMPORTANT: The App will update 'history' prop. 
    // The useEffect dependent on [history] will run and pull the new records 
    // into 'committedTransactions', so they stay visible on screen as "Saved".
    
    alert('✅ Updated successfully! The daily record is saved below.\n✅ 更新成功！今日记录已保存至下方表格，您可以直接截图。');
  };

  const availableItems = items.filter(item => !selectedItemIds.includes(item.id));
  const isToday = date === new Date().toISOString().split('T')[0];
  const hasDrafts = Object.keys(newTransactions).length > 0;

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-5">
        
        {/* Status Bar */}
        <div className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm border ${isToday ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
            <div className="flex items-center gap-2">
                {isToday ? <FileText size={16}/> : <History size={16}/>}
                <span className="font-bold">
                    {isToday ? 'Editing Mode: Today (Auto-Save Active)' : 'History View: Past Date'}
                </span>
                <span className="hidden md:inline text-xs opacity-80">
                    {isToday ? '| 编辑模式：今日 (自动保存草稿)' : '| 历史模式：过去日期 (仅查看)'}
                </span>
            </div>
            {hasDrafts && (
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 animate-pulse">
                    <Save size={12} /> Draft Saved 草稿已暂存
                </div>
            )}
        </div>

        <div className="flex flex-col md:flex-row gap-5 justify-between items-end">
          {/* Add Row Control */}
          <div className="w-full md:w-1/3 space-y-2">
            <label className="text-sm font-bold text-gray-700">Add Item to Table 添加物品到表格</label>
            <div className="flex gap-2">
              <select
                value={selectedAddItem}
                onChange={(e) => setSelectedAddItem(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-gray-50"
              >
                <option value="">Select Item 选择物品...</option>
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.location === 'Warehouse 1' ? 'W1' : 'W2'})</option>
                ))}
              </select>
              <button
                onClick={handleAddItemRow}
                disabled={!selectedAddItem}
                className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors shadow-sm"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Date */}
          <div className="w-full md:w-auto space-y-2">
             <label className="text-sm font-bold text-gray-700 block">Date 日期 (Switch to view past 切换查看过去)</label>
             <input 
                type="date" 
                value={date}
                onChange={(e) => switchDate(e.target.value)}
                className="w-full md:w-48 px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-gray-50 font-medium cursor-pointer hover:bg-white transition-colors"
             />
          </div>
        </div>

        {/* Lower Controls */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center border-t border-gray-100 pt-4">
           {/* Add Dept Control */}
           <div className="flex gap-2 w-full md:w-auto items-center">
               <input
                 type="text"
                 value={newDeptName}
                 onChange={(e) => setNewDeptName(e.target.value)}
                 placeholder="New Dept Name 新部门名称..."
                 className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
               />
               <button
                 onClick={handleAddDepartment}
                 disabled={!newDeptName}
                 className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                 title="Add Department 添加部门"
               >
                 <Plus size={20} />
               </button>
           </div>

           {/* Actions */}
           <div className="flex gap-3 w-full md:w-auto justify-end">
            <button
              onClick={handleScreenshot}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
            >
              <Camera size={18} /> Screenshot 截图
            </button>
            <button
              onClick={handleSubmit}
              disabled={!hasDrafts}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md shadow-emerald-200 disabled:bg-gray-300 disabled:shadow-none disabled:text-gray-500 transition-all active:scale-95"
            >
              <Save size={18} /> Confirm & Update 确认并更新
            </button>
          </div>
        </div>
      </div>

      {/* The List-Based Table */}
      {selectedItemIds.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">
             Current Date: {date} <br/>
             Add items to start recording or select a date with history. <br/> 
             请添加物品以开始记录，或选择有历史记录的日期。
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto pb-4 bg-white" ref={tableRef}>
            <div className="min-w-[800px] p-8 bg-white">
                {/* Report Header */}
                <div className="flex justify-between items-end mb-8 border-b-2 border-gray-800 pb-4">
                   <div>
                     <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">物品出入库记录表</h2>
                     <div className="text-gray-500 font-medium mt-1">INVENTORY TRANSACTION LOG</div>
                   </div>
                   <div className="text-right">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="font-bold text-gray-900 uppercase text-sm">Date 日期:</span>
                        <span className="text-xl font-mono font-bold text-gray-800 border-b border-gray-300 px-2">{date}</span>
                      </div>
                   </div>
                </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 bg-gray-50 border-y border-gray-200 font-bold text-gray-700 w-[25%] uppercase text-xs tracking-wider">
                        Item Info 物品信息
                      </th>
                      <th className="py-3 px-4 bg-gray-50 border-y border-gray-200 font-bold text-gray-700 w-[65%] uppercase text-xs tracking-wider">
                        Distribution Details 部门分发记录
                      </th>
                      <th className="py-3 px-4 bg-gray-50 border-y border-gray-200 font-bold text-center text-gray-700 w-[10%] uppercase text-xs tracking-wider">
                        Action 操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedItemIds.map(itemId => {
                      const item = items.find(i => i.id === itemId);
                      if (!item) return null;

                      const committed = committedTransactions[itemId] || {};
                      const draft = newTransactions[itemId] || {};
                      const hasActiveForm = !!activeRows[itemId];
                      
                      // Merge all department keys from both Committed and Draft
                      const allDepts = Array.from(new Set([...Object.keys(committed), ...Object.keys(draft)]));
                      
                      return (
                        <tr key={itemId} className="group hover:bg-gray-50 transition-colors">
                          {/* Item Details */}
                          <td className="p-4 align-top">
                            <div className="flex items-start gap-4">
                              <div className="relative">
                                  <img 
                                    src={item.image} 
                                    alt="" 
                                    className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm" 
                                  />
                                  {(item.minStock || 0) > 0 && item.quantity <= (item.minStock || 0) && (
                                     <div className="absolute -top-1 -right-1 bg-rose-500 w-3 h-3 rounded-full border border-white"></div>
                                  )}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-base">{item.name}</div>
                                <div className="text-xs text-gray-500 mt-1">Stock 库存: {item.quantity} {item.unit}</div>
                                <div className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                   {item.location === 'Warehouse 1' ? 'W1' : 'W2'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Transactions List */}
                          <td className="p-4 align-top">
                            <div className="flex flex-wrap gap-3 items-center min-h-[48px]">
                              
                              {/* Render Tags (Mixing Committed + Draft) */}
                              {allDepts.map(deptId => {
                                const dept = departments.find(d => d.id === deptId);
                                if (!dept) return null;
                                
                                const cVal = committed[deptId] || { in: 0, out: 0 }; // Saved
                                const dVal = draft[deptId] || { in: 0, out: 0 };     // Draft

                                // Calculate Totals for display
                                const totalIn = cVal.in + dVal.in;
                                const totalOut = cVal.out + dVal.out;
                                
                                return (
                                  <React.Fragment key={deptId}>
                                    {/* IN TAG */}
                                    {totalIn > 0 && (
                                        <div className={`flex items-center border rounded-md overflow-hidden shadow-sm group/tag transition-all ${
                                            dVal.in > 0 ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-gray-200'
                                        }`}>
                                            <div className="px-3 py-1.5 text-sm font-bold flex items-center gap-2 text-gray-700">
                                                <span>{dept.name}</span>
                                                <span className={`flex items-center text-xs px-1.5 py-0.5 rounded ${
                                                    dVal.in > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                    {/* Icon changes based on whether it is Saved or Draft */}
                                                    {dVal.in > 0 ? <AlertCircle size={10} className="mr-1"/> : <Check size={10} className="mr-1"/>} 
                                                    In 入
                                                </span>
                                            </div>
                                            <div className={`px-3 py-1.5 font-mono font-bold border-l ${
                                                dVal.in > 0 ? 'bg-indigo-100 border-indigo-200 text-indigo-800' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                            }`}>
                                                +{totalIn}
                                            </div>
                                            {dVal.in > 0 && (
                                                <button 
                                                    onClick={() => removeDraftTransaction(itemId, deptId, 'in')}
                                                    className="px-1.5 hover:bg-rose-500 hover:text-white text-gray-400 transition-colors flex items-center h-full border-l border-indigo-200"
                                                    title="Remove Draft 删除草稿"
                                                >
                                                    <X size={14}/>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* OUT TAG */}
                                    {totalOut > 0 && (
                                         <div className={`flex items-center border rounded-md overflow-hidden shadow-sm group/tag transition-all ${
                                            dVal.out > 0 ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200' : 'bg-white border-gray-200'
                                        }`}>
                                            <div className="px-3 py-1.5 text-sm font-bold flex items-center gap-2 text-gray-700">
                                                <span>{dept.name}</span>
                                                <span className={`flex items-center text-xs px-1.5 py-0.5 rounded ${
                                                    dVal.out > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {dVal.out > 0 ? <AlertCircle size={10} className="mr-1"/> : <Check size={10} className="mr-1"/>} 
                                                    Out 出
                                                </span>
                                            </div>
                                            <div className={`px-3 py-1.5 font-mono font-bold border-l ${
                                                dVal.out > 0 ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-100 text-rose-700'
                                            }`}>
                                                -{totalOut}
                                            </div>
                                            {dVal.out > 0 && (
                                                <button 
                                                    onClick={() => removeDraftTransaction(itemId, deptId, 'out')}
                                                    className="px-1.5 hover:bg-rose-500 hover:text-white text-gray-400 transition-colors flex items-center h-full border-l border-amber-200"
                                                    title="Remove Draft 删除草稿"
                                                >
                                                    <X size={14}/>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                  </React.Fragment>
                                );
                              })}

                              {/* Inline Form or Add Button */}
                              {hasActiveForm ? (
                                <div className="flex items-center gap-2 bg-white border-2 border-indigo-500 p-1 rounded-lg shadow-lg z-10 animate-in zoom-in duration-200">
                                   <select
                                     className="px-2 py-1 text-sm border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none max-w-[120px]"
                                     value={activeRows[itemId].deptId}
                                     onChange={(e) => setActiveRows(prev => ({
                                         ...prev, [itemId]: { ...prev[itemId], deptId: e.target.value }
                                     }))}
                                   >
                                     {departments.map(d => (
                                         <option key={d.id} value={d.id}>{d.name}</option>
                                     ))}
                                   </select>
                                   
                                   <div className="flex bg-gray-100 rounded p-0.5">
                                      <button
                                        onClick={() => setActiveRows(prev => ({...prev, [itemId]: {...prev[itemId], type: 'in'} }))}
                                        className={`px-2 py-0.5 text-xs font-bold rounded transition-all ${activeRows[itemId].type === 'in' ? 'bg-emerald-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
                                      >
                                        In 入
                                      </button>
                                      <button
                                        onClick={() => setActiveRows(prev => ({...prev, [itemId]: {...prev[itemId], type: 'out'} }))}
                                        className={`px-2 py-0.5 text-xs font-bold rounded transition-all ${activeRows[itemId].type === 'out' ? 'bg-rose-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
                                      >
                                        Out 出
                                      </button>
                                   </div>

                                   <input
                                      type="number"
                                      min="1"
                                      placeholder="Qty 数量"
                                      autoFocus
                                      className="w-20 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                      value={activeRows[itemId].qty}
                                      onChange={(e) => setActiveRows(prev => ({
                                         ...prev, [itemId]: { ...prev[itemId], qty: e.target.value }
                                     }))}
                                      onKeyDown={(e) => { if (e.key === 'Enter') saveTransaction(itemId); }}
                                   />
                                   
                                   <div className="flex gap-1">
                                       <button onClick={() => saveTransaction(itemId)} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                                            <Check size={14} />
                                       </button>
                                       <button onClick={() => cancelAddingTransaction(itemId)} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                                            <X size={14} />
                                       </button>
                                   </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startAddingTransaction(itemId)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-full transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                                >
                                  <Plus size={16} /> Add Record
                                </button>
                              )}

                            </div>
                          </td>

                          {/* Row Actions */}
                          <td className="p-4 align-middle text-center">
                            <button
                              onClick={() => handleRemoveItemRow(itemId)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                              title="Remove Row 移除此行"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-100">
                     <tr>
                        <td colSpan={3} className="pt-6 pb-2 text-center">
                             <div className="flex justify-between text-xs text-gray-400 px-4">
                                <div>System: SmartInventory Pro</div>
                                <div>Approved By (签字): _________________</div>
                             </div>
                        </td>
                     </tr>
                  </tfoot>
                </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};