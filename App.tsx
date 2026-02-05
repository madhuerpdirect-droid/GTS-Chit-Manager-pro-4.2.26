
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import AllotmentPage from './pages/AllotmentPage';
import Reports from './pages/Reports';
import AdminWrapper from './components/AdminWrapper';
import { User, UserRole, Member, ChitStatus } from './types';
import { db } from './db';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'xdr5tgb' });
  const [loginError, setLoginError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // PWA/Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // State for bulk import text
  const [bulkCsvText, setBulkCsvText] = useState('');
  
  // Master navigation state
  const [masterView, setMasterView] = useState<'list' | 'createChit' | 'createMember' | 'bulkMember'>('list');

  useEffect(() => {
    // Sync UI with DB status
    db.setDirtyListener((dirty) => setIsDirty(dirty));
    setIsDirty(db.getDirtyStatus());
    
    // Initial Load: Hybrid Sync (Pull Cloud -> Local)
    db.loadCloudData();

    // Catch PWA Install Prompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Hide if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Install choice: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

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

  const handleSync = async () => {
    setIsSyncing(true);
    const cloudSuccess = await db.save();
    setIsSyncing(false);
    
    if (cloudSuccess) {
      alert('Success: Data pushed to cloud and saved locally!');
    } else if (!navigator.onLine) {
      alert('Mode: Offline. Your changes are saved locally on this device and will sync automatically when you reconnect.');
    } else {
      alert('Note: Local save successful. Cloud synchronization failed, but your data is safe on this device.');
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Mi Chit Manager</h1>
            <p className="text-gray-500 text-sm">Professional Chit Fund System</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Username</label>
              <input 
                type="text" 
                required
                className="bg-white text-gray-900"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
              <input 
                type="password" 
                required
                className="bg-white text-gray-900"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>
            {loginError && <p className="text-red-500 text-xs text-center font-semibold">{loginError}</p>}
            <button 
              type="submit" 
              className="w-full ms-bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-md active:scale-95 transform"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  const safeUser = { name: user.name || 'Admin', role: user.role || UserRole.ADMIN };

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
                <button onClick={() => { setMasterView('bulkMember'); setBulkCsvText(''); }} className="text-xs font-bold text-green-600 hover:underline">Bulk</button>
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
          {masterView === 'createChit' && (
            <div className="ms-bg-card p-8 rounded border ms-border ms-shadow max-w-2xl mx-auto animate-in">
              <h3 className="text-xl font-bold mb-6">Create New Chit Group</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const target = e.target as any;
                db.addChit({
                  chitGroupId: `c_${Date.now()}`,
                  name: target.cname.value,
                  chitValue: Number(target.cval.value),
                  totalMonths: Number(target.ctot.value),
                  monthlyInstallmentRegular: Number(target.creg.value),
                  monthlyInstallmentAllotted: Number(target.call.value),
                  startMonth: target.cstart.value,
                  status: ChitStatus.ACTIVE,
                  upiId: target.cupi.value
                });
                setMasterView('list');
              }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label>Chit Name</label>
                  <input required name="cname" type="text" className="bg-white text-gray-900" />
                </div>
                <div><label>Value (₹)</label><input required name="cval" type="number" defaultValue={100000} className="bg-white text-gray-900" /></div>
                <div><label>Months</label><input required name="ctot" type="number" defaultValue={20} className="bg-white text-gray-900" /></div>
                <div><label>Regular Installment (₹)</label><input required name="creg" type="number" defaultValue={5000} className="bg-white text-gray-900" /></div>
                <div><label>Allotted Installment (₹)</label><input required name="call" type="number" defaultValue={6000} className="bg-white text-gray-900" /></div>
                <div><label>Start Date</label><input required name="cstart" type="date" className="bg-white text-gray-900" /></div>
                <div><label>UPI ID</label><input required name="cupi" type="text" placeholder="name@bank" className="bg-white text-gray-900" /></div>
                <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t ms-border">
                  <button type="button" onClick={() => setMasterView('list')} className="px-6 py-2 border ms-border rounded text-sm font-semibold bg-white">Cancel</button>
                  <button type="submit" className="px-6 py-2 ms-bg-primary text-white rounded text-sm font-bold">Save Chit</button>
                </div>
              </form>
            </div>
          )}
          {masterView === 'createMember' && (
            <div className="ms-bg-card p-8 rounded border ms-border ms-shadow max-w-2xl mx-auto animate-in">
              <h3 className="text-xl font-bold mb-6">Add New Member</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const target = e.target as any;
                const mob = target.mmobile.value.replace(/\D/g, '').slice(-10);
                if (mob.length !== 10) return alert('Enter 10-digit mobile');
                const memberId = `m_${Date.now()}`;
                db.addMember({
                  memberId,
                  name: target.mname.value,
                  mobile: mob,
                  address: target.maddr.value,
                  idProofType: target.midtype.value,
                  idProofNumber: target.midnum.value,
                  isActive: true
                });
                if (target.mgroup.value) {
                  db.addMembership({
                    groupMembershipId: `gm_${Date.now()}`,
                    chitGroupId: target.mgroup.value,
                    memberId: memberId,
                    tokenNo: (db.getMemberships().filter(m => m.chitGroupId === target.mgroup.value).length) + 1,
                    joinedOn: new Date().toISOString().split('T')[0]
                  });
                }
                setMasterView('list');
              }} className="space-y-4">
                <div><label>Full Name</label><input required name="mname" type="text" className="bg-white" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label>Mobile (10 Digits)</label><input required name="mmobile" type="text" maxLength={10} className="bg-white" /></div>
                  <div><label>Group</label><select name="mgroup" className="bg-white"><option value="">None</option>{db.getChits().map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}</select></div>
                </div>
                <div><label>Address</label><textarea required name="maddr" className="bg-white min-h-[80px] p-2 border w-full rounded"></textarea></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label>ID Type</label><select name="midtype" className="bg-white"><option>Aadhar</option><option>PAN</option></select></div>
                  <div><label>ID Number</label><input required name="midnum" type="text" className="bg-white" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t ms-border">
                  <button type="button" onClick={() => setMasterView('list')} className="px-6 py-2 border rounded text-sm font-semibold bg-white">Cancel</button>
                  <button type="submit" className="px-6 py-2 ms-bg-primary text-white rounded text-sm font-bold">Add Member</button>
                </div>
              </form>
            </div>
          )}
          {masterView === 'bulkMember' && (
             <div className="ms-bg-card p-8 rounded border ms-border ms-shadow max-w-2xl mx-auto animate-in">
              <h3 className="text-xl font-bold mb-4">Bulk Import Members</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const target = e.target as any;
                const csvValue = bulkCsvText || target.csv.value || "";
                const lines = csvValue.split('\n').filter((l: string) => l.trim().length > 0);
                
                if (lines.length === 0) {
                  alert('Please enter CSV data to import.');
                  return;
                }

                const firstLine = lines[0] || "";
                const startIndex = (firstLine.toLowerCase().includes('name') || firstLine.toLowerCase().includes('mobile')) ? 1 : 0;
                
                const imports = lines.slice(startIndex).map((line: string, i: number) => {
                  const p = line.split(',');
                  const name = (p[0] || "Unnamed").trim();
                  const mobile = (p[1] || "").replace(/\D/g, '').slice(-10);
                  const address = (p[2] || "").trim();
                  const idType = (p[3] || "Aadhar").trim();
                  const idNum = (p[4] || "").trim();

                  return {
                    member: { 
                      memberId: `m_b_${Date.now()}_${i}`, 
                      name, 
                      mobile, 
                      address, 
                      idProofType: idType, 
                      idProofNumber: idNum, 
                      isActive: true 
                    } as Member,
                    chitGroupId: target.bgroup.value
                  };
                });

                db.bulkAddMembers(imports);
                setMasterView('list');
                setBulkCsvText('');
                alert(`Successfully imported ${imports.length} members.`);
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label>Target Group</label>
                    <select name="bgroup" className="bg-white"><option value="">No Assignment</option>{db.getChits().map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}</select>
                  </div>
                  <div>
                    <label>Upload CSV File</label>
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="bg-white border-none p-0 h-auto" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (re) => {
                            setBulkCsvText(re.target?.result as string);
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </div>
                </div>
                <label>CSV Data (Name, Mobile, Address...)</label>
                <textarea 
                  name="csv" 
                  rows={8} 
                  className="bg-white w-full border rounded font-mono text-sm p-3" 
                  placeholder="John Doe, 9999999999, Bangalore, Aadhar, 1234..."
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                ></textarea>
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button type="button" onClick={() => setMasterView('list')} className="px-6 py-2 border rounded bg-white">Cancel</button>
                  <button type="submit" className="px-6 py-2 ms-bg-primary text-white rounded font-bold">Import Now</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </AdminWrapper>
  );

  return (
    <Layout 
      activePage={activePage} 
      setActivePage={(p) => { setActivePage(p); setMasterView('list'); }} 
      user={safeUser} 
      onLogout={handleLogout}
      onSync={handleSync}
      isDirty={isDirty}
    >
      {/* Home Screen Install Prompt */}
      {showInstallBanner && (
        <div className="bg-blue-600 text-white p-3 flex items-center justify-between sticky top-0 z-50 shadow-md animate-in slide-in-from-top-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs font-bold leading-tight">Install Mi Chit Manager<br/><span className="text-[10px] font-normal opacity-80">Add to home screen for quick access</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowInstallBanner(false)} className="text-[10px] uppercase font-bold px-2 py-1 opacity-70 hover:opacity-100">Later</button>
            <button onClick={handleInstallClick} className="bg-white text-blue-600 px-3 py-1.5 rounded text-[10px] font-bold uppercase shadow-sm active:scale-95 transition-transform">Add</button>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 pb-20">
        {activePage === 'dashboard' && <Dashboard />}
        {activePage === 'chits' && (
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
        )}
        {activePage === 'members' && (
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
        )}
        {activePage === 'collections' && <Collections />}
        {activePage === 'allotment' && <AllotmentPage />}
        {activePage === 'reports' && <Reports />}
        {activePage === 'masters' && renderMasters()}
      </div>
      {isSyncing && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-blue-700">Syncing to Cloud...</p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
