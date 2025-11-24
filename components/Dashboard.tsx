import React, { useState } from 'react';
import { InventoryItem, TransactionRecord, Department, WarehouseType } from '../types';
import { TrendingDown, TrendingUp, AlertTriangle, Package, Activity, Printer, Copy, Check, Warehouse, X, Calendar, Clock, ArrowRightLeft, ArrowRight, Share2 } from 'lucide-react';

// Declare html2canvas globally
declare const html2canvas: any;

interface DashboardProps {
  items: InventoryItem[];
  history: TransactionRecord[];
  departments: Department[];
}

export const Dashboard: React.FC<DashboardProps> = ({ items, history, departments }) => {
  const [warehouseFilter, setWarehouseFilter] = useState<'all' | WarehouseType>('all');
  const [detailView, setDetailView] = useState<'in' | 'out' | null>(null);

  // 1. Calculate Summary Stats
  const totalItems = items.length;
  const lowStockItems = items.filter(i => (i.minStock || 0) > 0 && i.quantity <= (i.minStock || 0));
  
  // Dynamic Stock Count based on Filter
  const filteredStockItems = items.filter(i => {
      if (warehouseFilter === 'all') return true;
      return i.location === warehouseFilter;
  });
  const displayStockCount = filteredStockItems.reduce((acc, curr) => acc + curr.quantity, 0);

  // Date Filtering for Monthly Stats
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyHistory = history.filter(h => h.date.startsWith(currentMonthPrefix));

  const monthlyIn = monthlyHistory.filter(h => h.type === 'in').reduce((acc, curr) => acc + curr.quantity, 0);
  const monthlyOut = monthlyHistory.filter(h => h.type === 'out').reduce((acc, curr) => acc + curr.quantity, 0);

  // 3. Top 5 Departments by Consumption (Out transactions)
  const deptConsumption: Record<string, number> = {};
  monthlyHistory.forEach(h => {
    if (h.type === 'out') {
      deptConsumption[h.departmentName] = (deptConsumption[h.departmentName] || 0) + h.quantity;
    }
  });
  
  const topDepartments = Object.entries(deptConsumption)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Find max value for bar scaling
  const maxConsumption = topDepartments.length > 0 ? topDepartments[0][1] : 1;

  // 4. Procurement List Logic
  // Filter items that are either 0 quantity OR below minStock
  const procurementItems = items.filter(i => i.quantity === 0 || (i.minStock && i.quantity <= i.minStock));

  const handleCopyProcurement = () => {
    const text = procurementItems.map(i => {
         const shortage = Math.max(0, (i.minStock || 0) - i.quantity);
         const suggested = shortage > 0 ? shortage : (i.quantity === 0 ? 'Custom' : 0);
         return `[${i.quantity === 0 ? 'Out 缺货' : 'Low 预警'}] ${i.name} | Stock:${i.quantity} | Buy:+${suggested} ${i.unit}`;
    }).join('\n');
    navigator.clipboard.writeText(`Procurement List 采购清单 (${currentMonthPrefix}):\n${text}`);
    alert('Procurement list copied! 采购清单已复制！');
  };

  // 5. Get details for the modal
  const detailRecords = detailView 
    ? monthlyHistory
        .filter(h => h.type === detailView)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  // 6. Share/Screenshot Logic for Modal
  const handleShareDetails = async () => {
    const element = document.getElementById('detail-modal-content');
    if (element) {
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });
            const link = document.createElement('a');
            link.download = `Report_${detailView}_${currentMonthPrefix}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (e) {
            console.error("Screenshot failed", e);
            alert('Image generation failed. 生成图片失败。');
        }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard 仪表盘</h2>
        <p className="text-gray-500">Key metrics overview. 关键指标概览。</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Items 总物品数" 
          value={totalItems} 
          icon={<Package className="text-blue-600" />} 
          bg="bg-blue-50" 
          border="border-blue-100"
        />
        <StatCard 
          title="Low Stock 库存预警" 
          value={lowStockItems.length} 
          icon={<AlertTriangle className="text-rose-600" />} 
          bg="bg-rose-50" 
          border="border-rose-100"
          textColor="text-rose-600"
        />
        
        {/* Interactive Stock Count Card */}
        <div className={`p-5 rounded-xl border shadow-sm transition-all bg-emerald-50 border-emerald-100`}>
            <div className="flex justify-between items-start mb-3">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Current Stock 当前库存总量</p>
                
                {/* Warehouse Toggle */}
                <div className="flex bg-white/60 p-1 rounded-lg gap-1 mb-2 w-max">
                    <button 
                        onClick={() => setWarehouseFilter('all')}
                        className={`px-2 py-0.5 text-xs font-bold rounded ${warehouseFilter === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:bg-emerald-100'}`}
                    >
                        All 全部
                    </button>
                    <button 
                        onClick={() => setWarehouseFilter('Warehouse 1')}
                        className={`px-2 py-0.5 text-xs font-bold rounded ${warehouseFilter === 'Warehouse 1' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:bg-purple-100'}`}
                    >
                        W1 一库
                    </button>
                    <button 
                        onClick={() => setWarehouseFilter('Warehouse 2')}
                        className={`px-2 py-0.5 text-xs font-bold rounded ${warehouseFilter === 'Warehouse 2' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-blue-100'}`}
                    >
                        W2 二库
                    </button>
                </div>

                <h4 className="text-2xl font-black text-emerald-900 animate-in fade-in">
                    {displayStockCount}
                    <span className="text-sm font-normal text-gray-500 ml-1">Units 单位</span>
                </h4>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
                <Warehouse className="text-emerald-600" />
            </div>
            </div>
        </div>

        <div className="flex flex-col gap-2">
            <div 
                onClick={() => setDetailView('in')}
                className="flex-1 p-3 rounded-xl border bg-indigo-50 border-indigo-100 flex justify-between items-center cursor-pointer hover:shadow-md hover:bg-indigo-100 transition-all group"
                title="View Inbound Details 查看入库明细"
            >
                <div>
                    <div className="text-xs text-indigo-800 font-bold uppercase flex items-center gap-1 group-hover:underline">Monthly In 本月入库</div>
                    <div className="text-xl font-black text-indigo-900">+{monthlyIn}</div>
                </div>
                <TrendingUp size={18} className="text-indigo-400 group-hover:text-indigo-600 transition-colors"/>
            </div>
            <div 
                onClick={() => setDetailView('out')}
                className="flex-1 p-3 rounded-xl border bg-amber-50 border-amber-100 flex justify-between items-center cursor-pointer hover:shadow-md hover:bg-amber-100 transition-all group"
                title="View Outbound Details 查看出库明细"
            >
                <div>
                    <div className="text-xs text-amber-800 font-bold uppercase flex items-center gap-1 group-hover:underline">Monthly Out 本月出库</div>
                    <div className="text-xl font-black text-amber-900">-{monthlyOut}</div>
                </div>
                <TrendingDown size={18} className="text-amber-400 group-hover:text-amber-600 transition-colors"/>
            </div>
        </div>
      </div>

      {/* Department Consumption Chart (Full Width) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingDown size={20} className="text-amber-500"/> Dept Consumption 部门消耗排行 (Top 5)
        </h3>
        <div className="space-y-4">
            {topDepartments.map(([name, qty]) => (
            <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{name}</span>
                <span className="text-gray-500">{qty} Units</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div 
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${(qty / maxConsumption) * 100}%` }}
                ></div>
                </div>
            </div>
            ))}
            {topDepartments.length === 0 && <p className="text-gray-400 text-sm">No outbound records this month. 本月暂无出库记录。</p>}
        </div>
      </div>

      {/* Smart Procurement List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="text-rose-500" size={20} /> Smart Procurement List 智能采购建议单
                </h3>
                <p className="text-xs text-gray-500 mt-1">Items out of stock or below threshold. 缺货或低库存物品。</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleCopyProcurement}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <Copy size={14} /> Copy 复制
                </button>
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
                >
                    <Printer size={14} /> Print 打印
                </button>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                        <th className="px-6 py-3">Item 物品</th>
                        <th className="px-6 py-3">Status 状态</th>
                        <th className="px-6 py-3">Stock 库存</th>
                        <th className="px-6 py-3">Unit 单位</th>
                        <th className="px-6 py-3">Threshold 警戒线</th>
                        <th className="px-6 py-3 text-right">Shortage 缺口</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {procurementItems.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 bg-white">
                                <div className="flex flex-col items-center gap-2">
                                    <Check className="text-emerald-500" size={32} />
                                    <span>All Good. Stock Sufficient. 库存充足，无需采购。</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        procurementItems.map(item => {
                            const minStock = item.minStock || 0;
                            const shortage = Math.max(0, minStock - item.quantity);
                            // If quantity is 0 but no minStock set, we suggest purchasing 10 as default or just show 'N/A'
                            const suggestedBuy = shortage > 0 ? shortage : (item.quantity === 0 ? 'Custom' : 0);

                            return (
                                <tr key={item.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <img src={item.image} alt="" className="w-10 h-10 rounded object-cover border border-gray-200" />
                                            <div>
                                                <div className="font-bold text-gray-800">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.location === 'Warehouse 1' ? 'W1' : 'W2'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        {item.quantity === 0 ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                                Out of Stock 缺货
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                                Low Stock 预警
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 font-mono font-medium">
                                        {item.quantity}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600">
                                        {item.unit}
                                    </td>
                                    <td className="px-6 py-3 text-gray-500 font-mono">
                                        {item.minStock || '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="text-rose-600 font-bold font-mono">
                                            +{suggestedBuy}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Details Modal */}
      {detailView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className={`p-5 border-b flex justify-between items-center ${detailView === 'in' ? 'bg-indigo-50 border-indigo-100' : 'bg-amber-50 border-amber-100'}`}>
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${detailView === 'in' ? 'bg-indigo-200 text-indigo-700' : 'bg-amber-200 text-amber-700'}`}>
                       {detailView === 'in' ? <TrendingUp size={24}/> : <TrendingDown size={24}/>}
                    </div>
                    <div>
                        <h3 className={`text-xl font-bold ${detailView === 'in' ? 'text-indigo-900' : 'text-amber-900'}`}>
                           {detailView === 'in' ? 'Inbound Details 入库明细' : 'Outbound Details 出库明细'}
                        </h3>
                        <p className={`text-sm ${detailView === 'in' ? 'text-indigo-600' : 'text-amber-600'}`}>
                           {currentMonthPrefix}
                        </p>
                    </div>
                 </div>
                 
                 <div className="flex gap-2">
                    <button 
                        onClick={handleShareDetails}
                        className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-100 shadow-sm transition-colors border border-gray-200"
                    >
                        <Share2 size={16} /> Share/Save Image 分享图片
                    </button>
                    <button 
                        onClick={() => setDetailView(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                 </div>
              </div>

              {/* List (Capture Target) */}
              <div id="detail-modal-content" className="overflow-y-auto flex-1 p-0 bg-white">
                  {/* Additional header info for screenshot only context (optional, but good for context) */}
                  <div className="p-4 bg-gray-50 border-b border-gray-100 text-center md:hidden">
                       <h4 className="font-bold text-gray-800">{detailView === 'in' ? 'Inbound Record 入库记录表' : 'Outbound Record 出库记录表'}</h4>
                       <div className="text-xs text-gray-500">{currentMonthPrefix}</div>
                  </div>

                  {detailRecords.length === 0 ? (
                      <div className="py-20 text-center text-gray-400">
                          No {detailView === 'in' ? 'inbound' : 'outbound'} records this month. <br/> 本月暂无记录。
                      </div>
                  ) : (
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr className="text-xs uppercase text-gray-500 font-semibold tracking-wider border-b border-gray-200">
                                  <th className="px-6 py-3">Time 时间</th>
                                  <th className="px-6 py-3">Item 物品</th>
                                  {detailView === 'out' && <th className="px-6 py-3">Dept 部门</th>}
                                  <th className="px-6 py-3 text-right">Qty 数量</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                              {detailRecords.map(record => (
                                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-3">
                                          <div className="flex flex-col">
                                              <span className="font-medium text-gray-900 flex items-center gap-1">
                                                <Calendar size={12} className="text-gray-400"/> {record.date}
                                              </span>
                                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock size={12} className="text-gray-400"/> {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                              </span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-3">
                                          <div className="flex items-center gap-3">
                                              <img src={record.itemImage || 'https://picsum.photos/200'} alt="" className="w-8 h-8 rounded object-cover border border-gray-200" />
                                              <span className="font-bold text-gray-700">{record.itemName}</span>
                                          </div>
                                      </td>
                                      {detailView === 'out' && (
                                          <td className="px-6 py-3 text-gray-600">
                                              {record.departmentName}
                                          </td>
                                      )}
                                      <td className="px-6 py-3 text-right font-mono font-bold">
                                          {detailView === 'in' 
                                            ? <span className="text-emerald-600">+{record.quantity}</span> 
                                            : <span className="text-amber-600">-{record.quantity}</span>
                                          }
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
                  {/* Footer inside content for screenshot context */}
                  <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-center text-gray-400">
                      Generated by SmartInventory Pro • {new Date().toLocaleDateString()}
                  </div>
              </div>
              
              {/* Actual Modal Footer Actions */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                  <button 
                    onClick={() => setDetailView(null)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Close 关闭
                  </button>
              </div>

           </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, bg, border, textColor }: any) => (
  <div className={`p-5 rounded-xl border ${bg} ${border} shadow-sm transition-transform hover:-translate-y-1`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h4 className={`text-2xl font-black ${textColor || 'text-gray-900'}`}>{value}</h4>
      </div>
      <div className="p-2 bg-white rounded-lg shadow-sm">
        {icon}
      </div>
    </div>
  </div>
);