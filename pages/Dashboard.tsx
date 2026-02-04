
import React, { useState } from 'react';
import { db } from '../db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const chits = db.getChits();
  const [selectedChitId, setSelectedChitId] = useState(chits[0]?.chitGroupId || 'all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');

  const members = db.getMembers();
  const installments = db.getInstallments();
  const payments = db.getPayments();

  // Filter criteria
  const filteredInstallments = installments.filter(s => {
    const chitMatch = selectedChitId === 'all' || s.chitGroupId === selectedChitId;
    const monthMatch = selectedMonth === 'all' || s.monthNo === selectedMonth;
    return chitMatch && monthMatch;
  });

  const filteredPayments = payments.filter(p => {
    const chitMatch = selectedChitId === 'all' || p.chitGroupId === selectedChitId;
    const monthMatch = selectedMonth === 'all' || p.monthNo === selectedMonth;
    return chitMatch && monthMatch;
  });

  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalOutstanding = filteredInstallments.reduce((sum, s) => sum + Math.max(0, s.dueAmount - s.paidAmount), 0);
  const activeChits = chits.filter(c => c.status === 'active').length;
  const activeMembers = members.filter(m => m.isActive).length;

  const currentChit = chits.find(c => c.chitGroupId === selectedChitId);

  const cards = [
    { label: 'Active Groups', value: activeChits, icon: '📋', color: 'text-blue-600' },
    { label: 'Total Members', value: activeMembers, icon: '👥', color: 'text-purple-600' },
    { label: 'Total Collection', value: `₹${totalCollected.toLocaleString()}`, icon: '💰', color: 'text-green-600' },
    { label: 'Outstanding', value: `₹${totalOutstanding.toLocaleString()}`, icon: '⏳', color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Selection Control */}
      <div className="ms-bg-card p-4 rounded border ms-border ms-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase">Analysis Filters</h3>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
           <div className="flex flex-col flex-1 min-w-[140px]">
             <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Select Group</label>
             <select 
               className="border ms-border rounded p-2 text-sm outline-none w-full"
               value={selectedChitId}
               onChange={(e) => {
                 setSelectedChitId(e.target.value);
                 setSelectedMonth('all');
               }}
             >
                <option value="all">All Groups</option>
                {chits.map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}
             </select>
           </div>
           <div className="flex flex-col flex-1 min-w-[100px]">
             <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Select Month</label>
             <select 
               className="border ms-border rounded p-2 text-sm outline-none w-full"
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
             >
                <option value="all">Consolidated</option>
                {currentChit && Array.from({length: currentChit.totalMonths}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Month {m}</option>
                ))}
                {!currentChit && Array.from({length: 24}, (_, i) => i + 1).map(m => <option key={m} value={m}>Month {m}</option>)}
             </select>
           </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="ms-bg-card p-6 rounded border ms-border ms-shadow flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
              <h3 className={`text-xl md:text-2xl font-bold ${card.color}`}>{card.value}</h3>
            </div>
            <div className="text-2xl md:text-3xl opacity-50">{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Collection Info */}
      <div className="ms-bg-card p-6 rounded border ms-border ms-shadow">
        <h3 className="text-sm font-bold mb-6 text-gray-700">Financial Performance</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'Target', value: filteredInstallments.reduce((s,i) => s + i.dueAmount, 0) },
              { name: 'Collection', value: totalCollected }
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{borderRadius: '6px', border: '1px solid #edebe9', fontSize: '12px'}} />
              <Bar dataKey="value" fill="#0078d4" radius={[6, 6, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
