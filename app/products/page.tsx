'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  Trophy,
  CheckCircle2,
  GraduationCap,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  School,
  ExternalLink,
} from 'lucide-react';
import { ProductData } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProductModal, setActiveProductModal] = useState<ProductData | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url =
        selectedCategory === 'ALL'
          ? '/api/products'
          : `/api/products?category=${selectedCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.target_grades.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-3 sm:p-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 sm:p-6 border border-white/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#020C21] tracking-tight">
                Educational Product Catalogue
              </h1>
              <p className="text-xs text-[#59627E] font-medium">
                Mittsure Curriculum & National Olympiad Benchmarks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/route-planner"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0F1B31] text-white text-xs font-bold shadow-md hover:bg-[#1a2b4d] transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Plan Route with Products</span>
          </Link>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'CURRICULUM', 'OLYMPIAD'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#0F1B31] text-white shadow-sm'
                  : 'bg-white/80 text-[#59627E] hover:bg-white hover:text-[#020C21] border border-slate-200/60'
              }`}
            >
              {cat === 'ALL' ? 'All Products' : cat === 'CURRICULUM' ? 'Curriculum Series' : 'Olympiad Programs'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products or grades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/90 border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-800"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 glass-card animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((prod) => {
            const isOlympiad = prod.category === 'OLYMPIAD';
            return (
              <div
                key={prod.id}
                className="glass-card p-5 rounded-2xl border border-white/80 hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        isOlympiad
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {prod.category}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {prod.target_grades}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-[#020C21] group-hover:text-indigo-600 transition-colors">
                    {prod.name}
                  </h3>
                  {prod.series && (
                    <p className="text-[11px] font-bold text-indigo-700 mb-2">
                      {prod.series}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                    {prod.description}
                  </p>

                  {/* Included Books Preview */}
                  {prod.books && prod.books.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-200/60 mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Key Subjects & Titles ({prod.books.length} Books)
                      </span>
                      <div className="space-y-1">
                        {prod.books.slice(0, 3).map((b, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] flex items-center justify-between text-slate-700 bg-white/60 px-2.5 py-1 rounded-lg"
                          >
                            <span className="font-semibold truncate max-w-[180px]">
                              {b.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {b.grade}
                            </span>
                          </div>
                        ))}
                        {prod.books.length > 3 && (
                          <p className="text-[10px] text-indigo-600 font-bold pl-1">
                            +{prod.books.length - 3} more book titles
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>NEP / NCF Verified</span>
                  </div>
                  <button
                    onClick={() => setActiveProductModal(prod)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                  >
                    <span>View Curriculum</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {activeProductModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {activeProductModal.category}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {activeProductModal.name}
                </h2>
                <p className="text-xs text-indigo-700 font-bold">
                  {activeProductModal.series} • {activeProductModal.target_grades}
                </p>
              </div>
              <button
                onClick={() => setActiveProductModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              {activeProductModal.description}
            </p>

            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                Included Book Titles & NEP/NCF Verified Alignment
              </h4>
              <div className="space-y-2">
                {activeProductModal.books?.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{b.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {b.subject} • {b.grade}
                      </p>
                    </div>
                    {b.curriculum_claims && (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md self-start sm:self-center">
                        {b.curriculum_claims}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActiveProductModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              <Link
                href="/route-planner"
                className="px-5 py-2.5 rounded-xl bg-[#0F1B31] text-white text-xs font-bold shadow-md hover:bg-[#1a2b4d] transition-all flex items-center gap-1.5"
              >
                <span>Add to Day Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
