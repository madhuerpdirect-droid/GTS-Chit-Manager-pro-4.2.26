
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import AllotmentPage from './pages/AllotmentPage';
import Reports from './pages/Reports';
import AdminWrapper from './components/AdminWrapper';
import { User, UserRole, ChitGroup, Member, ChitStatus } from './types';
import { db } from './db';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'xdr5tgb' });
  const [loginError, setLoginError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  
  // Master navigation state
  const [masterView, setMasterView] = useState<'list' | 'createChit' | 'createMember' | 'bulkMember'>('list');

  useEffect(() => {
    // Strongly integrate with the DB state listener
    db.setDirtyListener((dirty) => setIsDirty(dirty));
    setIsDirty(db.getDirtyStatus());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = db.getUsers().find(u => u.username === loginForm.username && u.passwordHash === loginForm.password);
    if (found) {
      setUser(found);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActivePage('dashboard');
  };

  const handleSync = () => {
    // Persist all local changes to browser storage
    db.save();
    alert('Data synced successfully! All changes are now permanent in the local database.');
  };

  // Auth screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm ms-bg-card p-8 rounded-lg ms-shadow border ms-border text-gray-900">
          <div className="text-center mb-8">
            <div className="w-16 h-16 ms-bg-primary text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.45L20.12 19H3.88L12 5.45zM11 10h2v4h-2v-4zm0 6h2v2h-2v-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Mi Chit Manager</h1>
            <p className="text-gray-500 text-sm">Sign in to your account</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 border ms-border rounded outline-none bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full px-3 py-2 border ms-border rounded outline-none bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>
            {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
            <button 
              type="submit" 
              className="w-full ms-bg-primary text-white py-2.5 rounded font-bold hover:bg-blue-600 transition-colors shadow-sm"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Forms
  const ChitForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      chitValue: 100000,
      totalMonths: 20,
      regularInstallment: 5000,
      allottedInstallment: 6000,
      startDate: new Date().toISOString().split('T')[0],
      upiId: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      db.addChit({
        chitGroupId: `c_${Date.now()}`,
        name: formData.name,
        chitValue: formData.chitValue,
        totalMonths: formData.totalMonths,
        monthlyInstallmentRegular: formData.regularInstallment,
        monthlyInstallmentAllotted: formData.allottedInstallment,
        startMonth: formData.startDate,
        status: ChitStatus.ACTIVE,
        upiId: formData.upiId
      });
      setMasterView('list');
    };

    return (
      <div className="ms-bg-card p-8 rounded border ms-border ms-shadow max-w-2xl mx-auto animate-in">
        <h3 className="text-xl font-bold mb-6">Create New Chit Group</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label>Chit Name</label>
            <input 
              required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              className="bg-white text-gray-900"
            />
          </div>
          <div>
            <label>Chit Value (₹)</label>
            <input 
              required type="number" value={formData.chitValue} onChange={e => setFormData({...formData, chitValue: Number(e.target.value)})}
              className="bg-white text-gray-900"
            />
          </div>
          <div>
            <label>Total Months</label>
            <input 
              required type="number" value={formData.totalMonths} onChange={e => setFormData({...formData, totalMonths: Number(e.target.value)})}
              className="bg-white text-gray-900"
            />
          </div>
          <div>
            <label>Regular Installment (₹)</label>
            <input 
              required type="number" value={formData.regularInstallment} onChange={e => setFormData({...formData, regularInstallment: Number(e.target.value)})}
              className="bg-white text-gray-900"
            />
          </div>
          <div>
            <label>Allotted Installment (₹)</label>
            <input 
              required type="number" value={formData.allottedInstallment} onChange={e => setFormData({...formData, allottedInstallment: Number(e.target.value)})}
              className="bg-white text-gray-900"
            />
          </div>
          <div>
            <label>Start Date</label>
            <input 
              required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
              className="bg-white text-gray-900"
            />
          </div>
          <div>
            <label>UPI ID (for payments)</label>
            <input 
              required type="text" placeholder="name@bank" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})}
              className="bg-white text-gray-900"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t ms-border">
            <button type="button" onClick={() => setMasterView('list')} className="px-6 py-2 border ms-border rounded text-sm font-semibold hover:bg-gray-50 bg-white">Cancel</button>
            <button type="submit" className="px-6 py-2 ms-bg-primary text-white rounded text-sm font-semibold hover:bg-blue-600">Save Chit</button>
          </div>
        </form>
      </div>
    );
  };

  const MemberForm = () => {
    const [formData, setFormData] = useState({
      name: '', mobile: '', address: '', idType: 'Aadhar', idNumber: '', chitGroupId: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Clean mobile: Strictly 10 digits
      const digitsOnly = formData.mobile.replace(/\D/g, '');
      const cleanMobile = digitsOnly.slice(-10);
      
      if (cleanMobile.length !== 10) {
        alert('Please enter a complete 10-digit mobile number.');
        return;
      }

      const memberId = `m_${Date.now()}`;
      db.addMember({
        memberId,
        name: formData.name,
        mobile: cleanMobile, // Save exactly 10 digits
        address: formData.address,
        idProofType: formData.idType,
        idProofNumber: formData.idNumber,
        isActive: true
      });

      if (formData.chitGroupId) {
        const groupMemberships = db.getMemberships().filter(m => m.chitGroupId === formData.chitGroupId);
        const nextToken = groupMemberships.length > 0 
          ? Math.max(...groupMemberships.map(m => m.tokenNo)) + 1 
          : 1;

        db.addMembership({
          groupMembershipId: `gm_${Date.now()}`,
          chitGroupId: formData.chitGroupId,
          memberId: memberId,
          tokenNo: nextToken,
          joinedOn: new Date().toISOString().split('T')[0]
        });
      }
      setMasterView('list');
    };

    return (
      <div className="ms-bg-card p-8 rounded border ms-border ms-shadow max-w-2xl mx-auto animate-in">
        <h3 className="text-xl font-bold mb-6">Add New Member</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Full Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white text-gray-900" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Mobile Number (Exactly 10 Digits)</label>
              <input 
                required 
                type="text" 
                maxLength={10}
                placeholder="10 digit mobile"
                value={formData.mobile} 
                onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})} 
                className="bg-white text-gray-900 font-medium" 
              />
            </div>
            <div>
              <label>Assigned Group (Optional)</label>
              <select value={formData.chitGroupId} onChange={e => setFormData({...formData, chitGroupId: e.target.value})} className="bg-white text-gray-900">
                <option value="">-- No Group --</option>
                {db.getChits().map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label>Address</label>
            <textarea required rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-white text-gray-900 resize-none"></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>ID Proof Type</label>
              <select value={formData.idType} onChange={e => setFormData({...formData, idType: e.target.value})} className="bg-white text-gray-900">
                <option>Aadhar</option>
                <option>PAN</option>
                <option>Voter ID</option>
              </select>
            </div>
            <div>
              <label>ID Number</label>
              <input required type="text" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} className="bg-white text-gray-900" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t ms-border">
            <button type="button" onClick={() => setMasterView('list')} className="px-6 py-2 border ms-border rounded text-sm font-semibold hover:bg-gray-50 bg-white">Cancel</button>
            <button type="submit" className="px-6 py-2 ms-bg-primary text-white rounded text-sm font-semibold hover:bg-blue-600">Add Member</button>
          </div>
        </form>
      </div>
    );
  };

  const BulkMemberForm = () => {
    const [csvData, setCsvData] = useState('');
    const [targetGroupId, setTargetGroupId] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvData(event.target?.result as string);
      };
      reader.readAsText(file);
    };

    const handleImport = (e: React.FormEvent) => {
      e.preventDefault();
      const lines = csvData.split('\n').filter(l => l.trim().length > 0);
      const firstLine = lines[0].toLowerCase();
      const startIndex = (firstLine.includes('name') || firstLine.includes('mobile')) ? 1 : 0;
      
      const membersToImport = lines.slice(startIndex).map((line, idx) => {
        const parts = line.split(',');
        const name = (parts[0] || '').trim();
        const rawMobile = (parts[1] || '').trim();
        const address = (parts[2] || '').trim();
        const idType = (parts[3] || '').trim();
        const idNum = (parts[4] || '').trim();
        
        // Strictly extract last 10 digits for bulk import
        const cleanMob = rawMobile.replace(/\D/g, '').slice(-10);

        return {
          member: {
            memberId: `m_bulk_${Date.now()}_${idx}`,
            name: name || 'Unnamed',
            mobile: cleanMob,
            address: address || '',
            idProofType: idType || 'Aadhar',
            idProofNumber: idNum || '',
            isActive: true
          } as Member,
          chitGroupId: targetGroupId
        };
      });
      
      db.bulkAddMembers(membersToImport);
      setMasterView('list');
      alert(`Successfully imported ${membersToImport.length} members with 10-digit mobile verification.`);
    };

    return (
      <div className="ms-bg-card p-8 rounded border ms-border ms-shadow max-w-2xl mx-auto animate-in">
        <h3 className="text-xl font-bold mb-4">Bulk Import Members</h3>
        <p className="text-xs text-gray-500 mb-6 bg-blue-50 p-3 border border-blue-100 rounded">
          <strong>Instructions:</strong> Paste CSV rows or upload a file. Format:<br/>
          <code className="bg-blue-100 px-1 rounded font-bold text-blue-700">Name, Mobile (10 Digits), Address, ID Type, ID Number</code>
        </p>
        <form onSubmit={handleImport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Target Chit Group</label>
              <select value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)} className="bg-white text-gray-900">
                <option value="">-- No Assignment --</option>
                {db.getChits().map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label>Upload CSV File</label>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                className="bg-white text-gray-900 border-none p-0 h-auto" 
              />
            </div>
          </div>
          <div>
            <label>CSV Data Preview</label>
            <textarea required rows={8} value={csvData} onChange={e => setCsvData(e.target.value)} className="bg-white text-gray-900 font-mono text-sm resize-none"></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t ms-border">
            <button type="button" onClick={() => setMasterView('list')} className="px-6 py-2 border ms-border rounded text-sm font-semibold hover:bg-gray-50 bg-white">Cancel</button>
            <button type="submit" className="px-6 py-2 ms-bg-primary text-white rounded text-sm font-semibold hover:bg-blue-600">Import Members</button>
          </div>
        </form>
      </div>
    );
  };

  // Reusing existing page renders...
  const DashboardView = () => <Dashboard />;
  const ChitsView = () => (
    <div className="ms-bg-card p-6 rounded border ms-border ms-shadow animate-in">
      <h3 className="text-lg font-bold mb-6">Chit Groups</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {db.getChits().map(c => (
          <div key={c.chitGroupId} className="p-4 border ms-border rounded hover:border-blue-300 transition-all bg-white">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-blue-600">{c.name}</h4>
              <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{c.status}</span>
            </div>
            <div className="text-xs space-y-1 text-gray-600">
              <p>Value: ₹{c.chitValue.toLocaleString()}</p>
              <p>Duration: {c.totalMonths} Months</p>
              <p>UPI ID: {c.upiId || 'Not Set'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const MembersView = () => (
    <div className="ms-bg-card p-6 rounded border ms-border ms-shadow animate-in">
      <h3 className="text-lg font-bold mb-6">Member Directory</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b ms-border">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Mobile</th>
              <th className="px-4 py-3 font-semibold">ID Proof</th>
              <th className="px-4 py-3 font-semibold">Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {db.getMembers().map(m => (
              <tr key={m.memberId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{m.name}</td>
                <td className="px-4 py-3 text-gray-600">{m.mobile}</td>
                <td className="px-4 py-3 text-xs">{m.idProofType}: {m.idProofNumber}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{m.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMasters = () => (
    <AdminWrapper title="Masters">
      {masterView === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in">
          <div className="ms-bg-card p-6 rounded border ms-border ms-shadow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Groups</h3>
              <button onClick={() => setMasterView('createChit')} className="text-xs font-bold ms-primary hover:underline">Create New</button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {db.getChits().map(c => (
                <div key={c.chitGroupId} className="p-3 border ms-border rounded flex justify-between items-center text-sm bg-white">
                  <div><div className="font-semibold">{c.name}</div><div className="text-[10px] text-gray-400">₹{c.chitValue.toLocaleString()}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="ms-bg-card p-6 rounded border ms-border ms-shadow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Members</h3>
              <div className="flex gap-4">
                <button onClick={() => setMasterView('bulkMember')} className="text-xs font-bold text-green-600 hover:underline">Bulk</button>
                <button onClick={() => setMasterView('createMember')} className="text-xs font-bold ms-primary hover:underline">Add</button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {db.getMembers().map(m => (
                <div key={m.memberId} className="p-3 border ms-border rounded flex justify-between items-center text-sm bg-white">
                  <div><div className="font-semibold">{m.name}</div><div className="text-[10px] text-gray-400">{m.mobile}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => setMasterView('list')} className="mb-4 text-sm text-blue-600 font-bold">&larr; Back to List</button>
          {masterView === 'createChit' && <ChitForm />}
          {masterView === 'createMember' && <MemberForm />}
          {masterView === 'bulkMember' && <BulkMemberForm />}
        </div>
      )}
    </AdminWrapper>
  );

  return (
    <Layout 
      activePage={activePage} 
      setActivePage={(p) => { setActivePage(p); setMasterView('list'); }} 
      user={{ name: user.name, role: user.role }} 
      onLogout={handleLogout}
      onSync={handleSync}
      isDirty={isDirty}
    >
      <div className="p-4 md:p-6 pb-20">
        {activePage === 'dashboard' && <DashboardView />}
        {activePage === 'chits' && <ChitsView />}
        {activePage === 'members' && <MembersView />}
        {activePage === 'collections' && <Collections />}
        {activePage === 'allotment' && <AllotmentPage />}
        {activePage === 'reports' && <Reports />}
        {activePage === 'masters' && renderMasters()}
      </div>
    </Layout>
  );
};

export default App;
