import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, FolderPlus, HelpCircle } from 'lucide-react';
import { Category, CategoryType } from '../types';
import DynamicIcon, { AVAILABLE_ICONS } from './DynamicIcon';

interface CategoryManagerProps {
  categories: Category[];
  onCreateCategory: (name: string, type: CategoryType, icon: string, color: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#64748b'  // Slate
];

export default function CategoryManager({ categories, onCreateCategory, onDeleteCategory }: CategoryManagerProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [selectedIcon, setSelectedIcon] = useState('Sparkles');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[3]);
  const [customColor, setCustomColor] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide a valid category name.');
      return;
    }

    if (name.trim().length > 30) {
      setError('Name is too long (maximum 30 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalColor = customColor.trim() || selectedColor;
      await onCreateCategory(name.trim(), type, selectedIcon, finalColor);
      setName('');
      // Reset defaults
      setSelectedIcon('Sparkles');
      setCustomColor('');
    } catch (err) {
      setError('Failed to create category. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeStyle = (categoryType: CategoryType) => {
    switch (categoryType) {
      case 'income':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900';
      case 'expense':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900';
      case 'savings':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900';
      case 'friend':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-900';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400 border border-slate-200';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="category-manager-root">
      {/* List Existing Categories */}
      <div className="lg:col-span-12 xl:col-span-7 glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/65 dark:border-slate-800/30" id="category-list-box">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <DynamicIcon name="Sparkles" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Active Categories</h2>
            <p className="text-xs text-slate-500 dark:text-slate-450">Categories used for your cash flows and charts</p>
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3" id="categories-scroller">
          {categories.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center">
              <HelpCircle className="w-10 h-10 mb-2 opacity-50" />
              <p>No active categories defined.</p>
              <p className="text-xs mt-1">Use the right side builder to add standard or custom categories!</p>
            </div>
          ) : (
            <AnimatePresence>
              {categories.map((cat, idx) => (
                <motion.div
                  key={cat.id}
                  id={`cat-item-${cat.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center justify-between p-4 bg-white/45 dark:bg-slate-900/30 rounded-2xl border border-white/55 dark:border-slate-800/10 transition-all duration-250 hover:bg-white/70 dark:hover:bg-slate-900/50 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    {/* Circle icon displaying color */}
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/5"
                      style={{ backgroundColor: cat.color }}
                    >
                      <DynamicIcon name={cat.icon} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-white text-sm">{cat.name}</h4>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getTypeStyle(cat.type)}`}>
                        {cat.type}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Delete the "${cat.name}" category? This will delete associated transaction summaries.`)) {
                        onDeleteCategory(cat.id);
                      }
                    }}
                    id={`btn-del-cat-${cat.id}`}
                    type="button"
                    className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                    title="Delete Category"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* category creation form */}
      <div className="lg:col-span-12 xl:col-span-5 glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30" id="category-builder-box">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-500 text-white rounded-2xl">
            <FolderPlus size={18} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Category Builder</h2>
            <p className="text-xs text-slate-500 dark:text-slate-450">Add custom channels to segregate budgets</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" id="add-category-form">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name fields */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Groceries, Gym, Stocks, Alex Bal..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 shadow-sm"
              maxLength={30}
              id="category-name-input"
            />
          </div>

          {/* Type picker */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Budget Category Type
            </label>
            <div className="grid grid-cols-2 gap-2" id="category-type-picker">
              {(['expense', 'income', 'savings', 'friend'] as CategoryType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 cursor-pointer ${
                    type === t
                      ? 'bg-slate-800 border-slate-950 text-white dark:bg-indigo-650 dark:border-indigo-550 dark:text-white shadow-md'
                      : 'border-white/40 dark:border-slate-800 bg-white/30 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 hover:bg-white/65'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
              * Choosing <strong className="text-slate-600 dark:text-slate-300">savings</strong> marks allocations. Choosing <strong className="text-slate-600 dark:text-slate-300">friend</strong> sets social group tabs.
            </p>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Custom theme color
            </label>
            <div className="flex flex-wrap gap-2 mb-3" id="category-colors-strip">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    setCustomColor('');
                  }}
                  className={`w-8 h-8 rounded-full transition-all duration-150 relative ${
                    selectedColor === color && !customColor ? 'scale-115 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor || selectedColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-8 h-8 rounded-xl border-0 cursor-pointer overflow-hidden p-0 bg-transparent flex-shrink-0"
                title="Custom Color Pick"
                id="category-hex-picker"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {customColor ? `Hex Code: ${customColor}` : `Preset Selection: ${selectedColor}`}
              </span>
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Select Category Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-[140px] overflow-y-auto pr-1" id="category-icons-grid">
              {AVAILABLE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`p-3 rounded-2xl flex items-center justify-center transition-all duration-200 border cursor-pointer ${
                    selectedIcon === icon
                      ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'border-white/40 dark:border-slate-800 bg-white/30 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-white/65'
                  }`}
                  title={icon}
                >
                  <DynamicIcon name={icon} size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            id="category-submit-button"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-101 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            {isSubmitting ? 'Architecting...' : 'Assemble Category'}
          </button>
        </form>
      </div>
    </div>
  );
}
