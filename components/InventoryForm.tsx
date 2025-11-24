import React, { useState, useEffect } from 'react';
import { InventoryItem, WarehouseType } from '../types';
import { X, Upload, Calendar, AlertCircle } from 'lucide-react';

interface InventoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: InventoryItem) => void;
  initialData?: InventoryItem | null;
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [quantity, setQuantity] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [location, setLocation] = useState<WarehouseType>('Warehouse 1');
  const [productionDate, setProductionDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setUnit(initialData.unit);
      setQuantity(initialData.quantity);
      setMinStock(initialData.minStock || 0);
      setLocation(initialData.location);
      setProductionDate(initialData.productionDate || '');
      setExpiryDate(initialData.expiryDate || '');
      setImage(initialData.image);
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setName('');
    setUnit('pcs');
    setQuantity(0);
    setMinStock(0);
    setLocation('Warehouse 1');
    setProductionDate('');
    setExpiryDate('');
    setImage('https://picsum.photos/200/200'); // Default placeholder
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: InventoryItem = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      name,
      unit,
      quantity,
      minStock: minStock > 0 ? minStock : undefined,
      location,
      image,
      lastUpdated: new Date().toISOString(),
      ...(location === 'Warehouse 1' ? { productionDate, expiryDate } : {})
    };
    onSubmit(newItem);
    onClose();
    if (!initialData) resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData ? 'Edit Item 编辑物品' : 'Add New Item 添加新物品'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Image Upload */}
          <div className="flex justify-center mb-6">
            <div className="relative group cursor-pointer w-32 h-32 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors">
              <img src={image || 'https://picsum.photos/200/200'} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="text-white" size={24} />
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <p className="absolute mt-36 text-xs text-gray-400">Click to upload image 点击上传图片</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name 物品名称</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g., Widget A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity 数量</label>
              <input
                required
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit 单位</label>
              <input
                required
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., kg, pcs, 箱"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              Low Stock Alert 最低库存预警
              <span className="text-xs font-normal text-gray-400">(Optional 可选)</span>
            </label>
            <div className="relative">
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Alert when quantity reaches..."
                />
            </div>
            <p className="text-xs text-gray-500 mt-1">Leave as 0 to disable. 设置为0以禁用。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Location 仓库位置</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as WarehouseType)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="Warehouse 1">Warehouse 1 仓库一 (需日期)</option>
              <option value="Warehouse 2">Warehouse 2 仓库二 (标准)</option>
            </select>
          </div>

          {location === 'Warehouse 1' && (
            <div className="grid grid-cols-2 gap-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <div>
                <label className="block text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Production Date 生产日期
                </label>
                <input
                  required
                  type="date"
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-indigo-200 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Expiry Date 过期日期
                </label>
                <input
                  required
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-indigo-200 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel 取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all transform active:scale-95"
            >
              {initialData ? 'Update 更新' : 'Add 添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};