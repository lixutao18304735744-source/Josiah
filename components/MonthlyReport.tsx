import React, { useState, useMemo } from 'react';
import { InventoryItem, TransactionRecord } from '../types';
import { Search, ArrowDown, ArrowUp, Download, Calendar, Filter, FileBarChart, AlertCircle } from 'lucide-react';

interface MonthlyReportProps {
  items: InventoryItem[];
  history: TransactionRecord[];
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ items, history }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZero, setHideZero] = useState(false);

  // Core Aggregation Logic
  const reportData = useMemo(() => {
    const stats: Record<string, { in: number; out: number; itemRef?: InventoryItem; historyRef?: TransactionRecord }> = {};

    // 1. Initialize with current items to ensure they appear even with 0 activity
    items.forEach(item => {
      stats[item.id] = { in: 0, out: 0, itemRef: item };
    });

    // 2. Process history for selected month
    history.forEach(record => {
      if (record.date.startsWith(selectedMonth)) {
        if (!stats[record.itemId]) {
          // Item might be deleted, initialize from history record
          stats[record.itemId] = { in: 0, out: 0, historyRef: record };
        }
        
        if (record.type === 'in') {
          stats[record.itemId].in += record.quantity;
        } else {
          stats[record.itemId].out += record.quantity;
        }
      }
    });

    // 3. Convert to array
    return Object.entries(stats).map(([id, stat]) => {
      // Prefer current item details, fallback to history snapshot
      const name = stat.itemRef?.name || stat.historyRef?.itemName || 'Unknown Item';
      const image = stat.itemRef?.image || stat.historyRef?.itemImage;
      const unit = stat.itemRef?.unit || 'units';
      const isDeleted = !stat.itemRef;

      return {
        id,
        name,
        image,
        unit,
        isDeleted,
        totalIn: stat.in,
        totalOut: stat.out,
        netChange: stat.in - stat.out
      };
    });
  }, [items, history, selectedMonth]);

  // Filtering
  const filteredData = reportData.filter(row => {
    const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasActivity = row.totalIn > 0 || row.totalOut > 0;
    
    if (hideZero && !hasActivity) return false;
    return matchesSearch;
  }).sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut)); // Sort by total activity

  // Summary for Cards
  const totalInMonth = filteredData.reduce((acc, curr) => acc + curr.totalIn, 0);
  const totalOutMonth = filteredData.reduce((acc, curr) => acc + curr.totalOut, 0);

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += `Monthly Report 月度报表: ${selectedMonth}\n`;
    csvContent += "Item(物品名称),Status(状态),Total In(入库总量),Total Out(出库总量),Net Change(净变动)\n";
    
    filteredData.forEach(row => {
      csvContent += `${row.name},${row.isDeleted ? 'Deleted' : 'Active'},${row.totalIn},${row.totalOut},${row.netChange}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="text-indigo-600" /> Monthly Report 月度库存报表
          </h2>
          <p className="text-gray-500 text-sm">Aggregate item flow by month. 统计指定月份内所有物品的流动总量。</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
               type="month" 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-gray-50"
             />
          </div>

          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input
               type="text"
               placeholder="Filter items 筛选物品..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
             />
          </div>

          <button 
             onClick={exportCSV}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 text-sm"
          >
            <Download size={16} /> Export 导出
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl border border-emerald-100 shadow-sm">
             <div className="text-emerald-800 text-sm font-medium mb-1 flex items-center gap-1">
                <ArrowUp size={16} /> Total In 本月总入库
             </div>
             <div className="text-3xl font-bold text-emerald-700">{totalInMonth}</div>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-xl border border-rose-100 shadow-sm">
             <div className="text-rose-800 text-sm font-medium mb-1 flex items-center gap-1">
                <ArrowDown size={16} /> Total Out 本月总出库
             </div>
             <div className="text-3xl font-bold text-rose-700">{totalOutMonth}</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                  <div className="text-gray-500 text-sm font-medium mb-1">Active Items 活跃物品数</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {filteredData.filter(d => d.totalIn > 0 || d.totalOut > 0).length} 
                    <span className="text-gray-400 text-sm font-normal"> / {filteredData.length}</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                 <label className="text-xs text-gray-600 font-medium cursor-pointer select-none">Hide No Activity 隐藏无变动</label>
                 <button 
                   onClick={() => setHideZero(!hideZero)}
                   className={`w-10 h-5 rounded-full flex items-center transition-colors px-1 ${hideZero ? 'bg-indigo-600' : 'bg-gray-300'}`}
                 >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${hideZero ? 'translate-x-5' : ''}`}></div>
                 </button>
              </div>
          </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4 w-[40%]">Item 物品名称</th>
                <th className="px-6 py-4 text-center w-[20%] text-emerald-700 bg-emerald-50/50">Total In 入库总量</th>
                <th className="px-6 py-4 text-center w-[20%] text-rose-700 bg-rose-50/50">Total Out 出库总量</th>
                <th className="px-6 py-4 text-center w-[20%]">Net Change 净变动</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                         <img src={row.image || 'https://picsum.photos/200'} alt="" className={`w-10 h-10 rounded-lg object-cover border border-gray-200 ${row.isDeleted ? 'grayscale opacity-60' : ''}`} />
                         {row.isDeleted && (
                           <div className="absolute -top-1 -right-1 bg-gray-600 text-white rounded-full p-0.5" title="Item deleted from inventory 该物品已删除">
                             <AlertCircle size={10} />
                           </div>
                         )}
                      </div>
                      <div>
                        <div className={`font-bold text-gray-900 ${row.isDeleted ? 'line-through text-gray-400' : ''}`}>{row.name}</div>
                        <div className="text-xs text-gray-400">{row.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center bg-emerald-50/20 group-hover:bg-emerald-50/40 transition-colors">
                    {row.totalIn > 0 ? (
                      <span className="font-mono font-bold text-emerald-600">+{row.totalIn}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center bg-rose-50/20 group-hover:bg-rose-50/40 transition-colors">
                     {row.totalOut > 0 ? (
                      <span className="font-mono font-bold text-rose-600">-{row.totalOut}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-mono">
                    <span className={`font-bold px-2 py-1 rounded ${
                      row.netChange > 0 ? 'bg-emerald-100 text-emerald-800' : 
                      row.netChange < 0 ? 'bg-rose-100 text-rose-800' : 'text-gray-400'
                    }`}>
                      {row.netChange > 0 ? '+' : ''}{row.netChange}
                    </span>
                  </td>
                </tr>
              ))}
              
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    No records found for this month. 本月没有找到相关记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};