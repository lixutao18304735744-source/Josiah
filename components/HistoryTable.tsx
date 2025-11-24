import React, { useState } from 'react';
import { TransactionRecord } from '../types';
import { ArrowRight, ArrowRightLeft, Search, Camera, Calendar, Clock, Package, Trash2 } from 'lucide-react';

// Declare html2canvas globally
declare const html2canvas: any;

interface HistoryTableProps {
  history: TransactionRecord[];
  onDeleteRecord: (recordId: string) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ history, onDeleteRecord }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filter History
  const filteredHistory = history.filter(h => 
    h.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.departmentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Group by Date
  const groupedHistory = filteredHistory.reduce((groups, record) => {
    const date = record.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {} as Record<string, TransactionRecord[]>);

  // 3. Sort Dates Descending (Newest first)
  const sortedDates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

  const handleScreenshot = async (date: string) => {
    const element = document.getElementById(`report-${date}`);
    if (element) {
      try {
        const canvas = await html2canvas(element, {
          scale: 2, // High resolution
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false
        });
        const link = document.createElement('a');
        link.download = `Log_Export_${date}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Screenshot failed:", err);
        alert("Screenshot failed. 截图生成失败，请重试");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Inventory Log 每日库存日志</h2>
          <p className="text-gray-500">Archived daily operations. 按日期归档的操作记录。</p>
        </div>
        <div className="relative w-full md:w-72">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input
               type="text"
               placeholder="Search history... 搜索历史记录..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
             />
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No history found. 未找到相关历史记录。</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => {
            const records = groupedHistory[date].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            // Daily Stats
            const totalIn = records.filter(r => r.type === 'in').reduce((acc, r) => acc + r.quantity, 0);
            const totalOut = records.filter(r => r.type === 'out').reduce((acc, r) => acc + r.quantity, 0);

            return (
              <div key={date} className="flex flex-col gap-2">
                 {/* Action Bar for this Day */}
                 <div className="flex justify-end px-2">
                    <button 
                      onClick={() => handleScreenshot(date)}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
                    >
                      <Camera size={16} /> Save Screenshot 保存今日报表截图
                    </button>
                 </div>

                 {/* The Report Card (This part gets screenshotted) */}
                 <div id={`report-${date}`} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    {/* Report Header */}
                    <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Daily Transaction Log</div>
                            <h3 className="text-2xl font-bold flex items-center gap-3">
                                <Calendar size={24} className="text-indigo-400"/> {date}
                            </h3>
                        </div>
                        <div className="flex gap-6 text-right">
                            <div>
                                <div className="text-xs text-gray-400 uppercase">Total In 入库</div>
                                <div className="text-xl font-bold text-emerald-400">+{totalIn}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 uppercase">Total Out 出库</div>
                                <div className="text-xl font-bold text-rose-400">-{totalOut}</div>
                            </div>
                        </div>
                    </div>

                    {/* Report Content */}
                    <div className="p-6">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-100 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                    <th className="py-3 pl-2">Time 时间</th>
                                    <th className="py-3">Item 物品信息</th>
                                    <th className="py-3">Department 部门</th>
                                    <th className="py-3 text-center">Type 类型</th>
                                    <th className="py-3 pr-2 text-right">Qty 数量</th>
                                    <th className="py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {records.map(record => (
                                    <tr key={record.id} className="group">
                                        <td className="py-3 pl-2 text-gray-500 font-mono text-xs w-24">
                                            {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                {/* Allow image to fail gracefully or hide in screenshot if issues arise, but usually works with useCORS */}
                                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                                    {record.itemImage ? (
                                                        <img src={record.itemImage} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package size={14} className="text-gray-400"/>
                                                    )}
                                                </div>
                                                <span className="font-bold text-gray-800">{record.itemName}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {record.departmentName}
                                        </td>
                                        <td className="py-3 text-center">
                                            {record.type === 'in' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                                                    <ArrowRightLeft size={10} /> In
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wide">
                                                    <ArrowRight size={10} /> Out
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-2 text-right">
                                            <span className={`font-mono font-bold ${record.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {record.type === 'in' ? '+' : '-'}{record.quantity}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <button 
                                                onClick={() => onDeleteRecord(record.id)}
                                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                title="Delete Record 删除记录"
                                                data-html2canvas-ignore="true"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Report Footer */}
                    <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400">
                        <div>
                             Generated by SmartInventory Pro
                        </div>
                        <div className="flex gap-8">
                            <div>Manager Sig: __________________</div>
                            <div>Date: __________________</div>
                        </div>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};