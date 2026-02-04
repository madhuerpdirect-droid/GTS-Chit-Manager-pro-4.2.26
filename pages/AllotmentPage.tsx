
import React, { useState } from 'react';
import { db } from '../db';

const AllotmentPage: React.FC = () => {
  const chits = db.getChits();
  const allotments = db.getAllotments();
  const members = db.getMembers();

  const [selectedChit, setSelectedChit] = useState(chits[0]?.chitGroupId || '');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedMember, setSelectedMember] = useState('');
  const [prizeAmount, setPrizeAmount] = useState(0);

  const currentChit = chits.find(c => c.chitGroupId === selectedChit);
  // Only search for allotment in THIS specific month
  const existingMonthAllotment = allotments.find(a => 
    a.chitGroupId === selectedChit && 
    a.monthNo === selectedMonth && 
    a.isConfirmed && 
    !a.revoked
  );

  const memberships = db.getMemberships().filter(m => m.chitGroupId === selectedChit);
  
  const alreadyWonMemberIds = allotments
    .filter(a => a.chitGroupId === selectedChit && a.isConfirmed && !a.revoked)
    .map(a => a.memberId);
  
  const candidates = memberships
    .filter(gm => !alreadyWonMemberIds.includes(gm.memberId))
    .map(gm => members.find(m => m.memberId === gm.memberId))
    .filter(m => m && m.isActive);

  const handleConfirm = () => {
    if (!selectedMember || prizeAmount <= 0) return alert('Please select a winner and enter prize amount.');
    db.confirmAllotment({
      allotmentId: `allot_${Date.now()}`,
      chitGroupId: selectedChit,
      monthNo: selectedMonth,
      memberId: selectedMember,
      allottedAmount: prizeAmount,
      isConfirmed: true,
      createdAt: new Date().toISOString(),
      createdBy: 'admin'
    });
    setSelectedMember('');
    setPrizeAmount(0);
    alert('Allotment confirmed for this month.');
  };

  const handleRevoke = (allotmentId: string) => {
    if (confirm('Are you sure you want to revoke this allotment? This will reset installment amounts for the member.')) {
      db.revokeAllotment(allotmentId);
    }
  };

  return (
    <div className="space-y-6 px-1 md:px-0 max-w-5xl mx-auto pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="ms-bg-card p-6 rounded-lg border ms-border ms-shadow space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest border-b pb-3">Monthly Allotment Processor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Chit Group</label>
                <select className="border ms-border p-2.5 rounded text-sm" value={selectedChit} onChange={(e) => setSelectedChit(e.target.value)}>
                   {chits.map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}
                </select>
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Process for Month</label>
                <select className="border ms-border p-2.5 rounded text-sm" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                   {currentChit && Array.from({length: currentChit.totalMonths}, (_, i) => i + 1).map(m => <option key={m} value={m}>Month {m}</option>)}
                </select>
             </div>
          </div>

          {existingMonthAllotment ? (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter mb-1">Status: Allotted</p>
                    <p className="text-sm font-bold text-gray-900">Winner: {members.find(m => m.memberId === existingMonthAllotment.memberId)?.name}</p>
                    <p className="text-sm font-semibold text-blue-600">Amount: ₹{existingMonthAllotment.allottedAmount.toLocaleString()}</p>
                 </div>
                 <button onClick={() => handleRevoke(existingMonthAllotment.allotmentId)} className="text-[10px] font-bold text-red-600 border border-red-200 px-2 py-1 rounded-md hover:bg-red-50 active:scale-95 transition-all">REVOKE</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t mt-4 animate-in fade-in duration-300">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Selected Winner</label>
                <select className="border ms-border p-2.5 rounded text-sm" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map(c => <option key={c?.memberId} value={c?.memberId}>{c?.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Winning / Prize Amount</label>
                <input type="number" className="border ms-border p-2.5 rounded text-sm font-semibold" value={prizeAmount || ''} onChange={(e) => setPrizeAmount(Number(e.target.value))} placeholder="₹ Amount" />
              </div>
              <button onClick={handleConfirm} className="w-full py-3 ms-bg-primary text-white rounded-md font-bold text-sm shadow-lg active:scale-95 transition-transform">Confirm Allotment</button>
            </div>
          )}
        </div>

        <div className="ms-bg-card p-6 rounded-lg border ms-border ms-shadow hidden md:block bg-gray-50/50">
           <h4 className="text-xs font-bold mb-4 uppercase text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              Rules & Guidelines
           </h4>
           <ul className="text-xs space-y-3 text-gray-600 list-disc pl-5 leading-relaxed">
              <li>Confirming a month <strong>locks</strong> only that specific month's data.</li>
              <li>You can select future months from the dropdown to plan ahead.</li>
              <li>A member can win only <strong>once</strong> per chit group.</li>
              <li>Winning members pay higher installments (Allotted Rate) starting <strong>after</strong> their win month.</li>
              <li>Revoking clears the win and resets the member's future installments back to the Regular Rate.</li>
           </ul>
        </div>
      </div>

      <div className="ms-bg-card rounded-lg border ms-border ms-shadow overflow-hidden">
        <h3 className="p-4 text-xs font-bold border-b ms-border text-gray-400 uppercase bg-gray-50 tracking-widest">History: Allotment Register</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white font-semibold text-gray-600 border-b">
              <tr>
                <th className="px-6 py-4">Month</th>
                <th className="px-6 py-4">Winner Name</th>
                <th className="px-6 py-4 text-right">Prize Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {allotments.filter(a => a.chitGroupId === selectedChit).sort((a,b) => b.monthNo - a.monthNo).map((a, i) => {
                const winner = members.find(m => m.memberId === a.memberId);
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-400">M{a.monthNo}</td>
                    <td className="px-6 py-4 font-medium">{winner?.name}</td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">₹{a.allottedAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded text-[9px] font-bold ${a.revoked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{a.revoked ? 'REVOKED' : 'CONFIRMED'}</span>
                    </td>
                  </tr>
                );
              })}
              {allotments.filter(a => a.chitGroupId === selectedChit).length === 0 && (
                <tr><td colSpan={4} className="p-16 text-center text-gray-400 italic">No historical records found for this group.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllotmentPage;
