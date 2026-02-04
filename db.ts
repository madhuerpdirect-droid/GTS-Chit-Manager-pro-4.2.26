
import { 
  User, UserRole, ChitGroup, Member, GroupMembership, 
  InstallmentSchedule, Allotment, Payment, PaymentRequest, 
  MasterSettings, ChitStatus, PaymentStatus 
} from './types';

const INITIAL_USERS: User[] = [
  { userId: 'u1', name: 'Admin User', role: UserRole.ADMIN, username: 'admin', passwordHash: 'xdr5tgb', isActive: true },
];

const INITIAL_MASTER_SETTINGS: MasterSettings = {
  mastersPasswordHash: 'secure123',
  lateFeeRules: {},
  receiptTemplateConfig: {},
  whatsappConfig: {}
};

class DB {
  private users: User[] = [];
  private chits: ChitGroup[] = [];
  private members: Member[] = [];
  private memberships: GroupMembership[] = [];
  private installments: InstallmentSchedule[] = [];
  private allotments: Allotment[] = [];
  private payments: Payment[] = [];
  private paymentRequests: PaymentRequest[] = [];
  private settings: MasterSettings = INITIAL_MASTER_SETTINGS;
  
  private isDirty: boolean = false;
  private hasLoaded: boolean = false;
  private onDirtyChange?: (dirty: boolean) => void;

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.load();
      if (!this.users || this.users.length === 0) {
        this.users = INITIAL_USERS;
        this.saveLocal();
      }
      this.hasLoaded = true;
    } catch (e) {
      console.error("DB Init failed, resetting to defaults", e);
      this.users = INITIAL_USERS;
      this.hasLoaded = true;
    }
  }

  setDirtyListener(listener: (dirty: boolean) => void) {
    this.onDirtyChange = listener;
  }

  markDirty() {
    this.isDirty = true;
    this.saveLocal(); // Local-First Persistence: Save immediately to storage
    if (this.onDirtyChange) this.onDirtyChange(true);
  }

  load() {
    const data = localStorage.getItem('mi_chit_db');
    if (data && data !== "null" && data !== "undefined") {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          this.deserialize(parsed);
        }
      } catch (e) {
        console.error("Corrupted local storage data", e);
      }
    }
  }

  private deserialize(parsed: any) {
    if (!parsed) return;
    this.users = parsed.users || [];
    this.chits = parsed.chits || [];
    this.members = parsed.members || [];
    this.memberships = parsed.memberships || [];
    this.installments = parsed.installments || [];
    this.allotments = parsed.allotments || [];
    this.payments = parsed.payments || [];
    this.paymentRequests = parsed.paymentRequests || [];
    this.settings = parsed.settings || INITIAL_MASTER_SETTINGS;
  }

  private getSerializedData() {
    return JSON.stringify({
      users: this.users,
      chits: this.chits,
      members: this.members,
      memberships: this.memberships,
      installments: this.installments,
      allotments: this.allotments,
      payments: this.payments,
      paymentRequests: this.paymentRequests,
      settings: this.settings
    });
  }

  saveLocal() {
    localStorage.setItem('mi_chit_db', this.getSerializedData());
  }

  async save(): Promise<boolean> {
    this.saveLocal();
    if (navigator.onLine) {
      return await this.syncWithCloud();
    }
    return false; // Offline save only
  }

  async syncWithCloud(): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      // Mock Cloud Sync Process
      console.log("Hybrid Sync: Pushing local updates to cloud...");
      await new Promise(r => setTimeout(r, 800)); // Simulate network latency
      
      this.isDirty = false;
      if (this.onDirtyChange) this.onDirtyChange(false);
      localStorage.setItem('mi_chit_last_sync', new Date().toISOString());
      return true;
    } catch (error) {
      return false;
    }
  }

  async loadCloudData() {
    if (!navigator.onLine) return;
    try {
      console.log("Hybrid Sync: Checking for cloud updates...");
    } catch (e) {
      console.warn("Could not reach cloud server.");
    }
  }

  getDirtyStatus = () => this.isDirty;
  isReady = () => this.hasLoaded;

  // Generic Getters
  getUsers = () => this.users || [];
  getChits = () => this.chits || [];
  getMembers = () => this.members || [];
  getMemberships = () => this.memberships || [];
  getInstallments = () => this.installments || [];
  getAllotments = () => this.allotments || [];
  getPayments = () => this.payments || [];
  getPaymentRequests = () => this.paymentRequests || [];
  getSettings = () => this.settings || INITIAL_MASTER_SETTINGS;

  addPayment(payment: Payment) {
    this.payments.push(payment);
    const schedule = this.installments.find(s => 
      s.chitGroupId === payment.chitGroupId && 
      s.memberId === payment.memberId && 
      s.monthNo === payment.monthNo
    );
    if (schedule) {
      schedule.paidAmount += payment.paidAmount;
      schedule.paidDate = payment.paymentDate;
      schedule.status = schedule.paidAmount >= schedule.dueAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
    }
    this.markDirty();
  }

  addMember(member: Member) {
    this.members.push(member);
    this.markDirty();
  }

  addChit(chit: ChitGroup) {
    this.chits.push(chit);
    this.markDirty();
  }

  addMembership(membership: GroupMembership) {
    const exists = this.memberships.find(m => m.chitGroupId === membership.chitGroupId && m.memberId === membership.memberId);
    if (exists) return;

    this.memberships.push(membership);
    const chit = this.chits.find(c => c.chitGroupId === membership.chitGroupId);
    if (chit) {
      for (let i = 1; i <= chit.totalMonths; i++) {
        const date = new Date(chit.startMonth);
        date.setMonth(date.getMonth() + i - 1);
        this.installments.push({
          scheduleId: `s_${membership.groupMembershipId}_${i}`,
          chitGroupId: membership.chitGroupId,
          memberId: membership.memberId,
          monthNo: i,
          dueDate: date.toISOString().split('T')[0],
          dueAmount: chit.monthlyInstallmentRegular,
          paidAmount: 0,
          status: PaymentStatus.PENDING,
          isPrizeMonth: false
        });
      }
    }
    this.markDirty();
  }

  bulkAddMembers(membersList: { member: Member, chitGroupId?: string }[]) {
    membersList.forEach(item => {
      this.members.push(item.member);
      if (item.chitGroupId) {
        const groupMemberships = this.memberships.filter(m => m.chitGroupId === item.chitGroupId);
        const nextToken = groupMemberships.length > 0 
          ? Math.max(...groupMemberships.map(m => m.tokenNo)) + 1 
          : 1;

        this.addMembership({
          groupMembershipId: `gm_${Date.now()}_${Math.random()}`,
          chitGroupId: item.chitGroupId,
          memberId: item.member.memberId,
          tokenNo: nextToken,
          joinedOn: new Date().toISOString().split('T')[0]
        });
      }
    });
    this.markDirty();
  }

  confirmAllotment(allotment: Allotment) {
    this.allotments.push(allotment);
    const chit = this.chits.find(c => c.chitGroupId === allotment.chitGroupId);
    if (!chit) return;

    const currentSchedule = this.installments.find(s => 
      s.chitGroupId === allotment.chitGroupId && 
      s.memberId === allotment.memberId && 
      s.monthNo === allotment.monthNo
    );
    if (currentSchedule) currentSchedule.isPrizeMonth = true;

    this.installments.forEach(s => {
      if (s.chitGroupId === allotment.chitGroupId && 
          s.memberId === allotment.memberId && 
          s.monthNo > allotment.monthNo) {
        s.dueAmount = chit.monthlyInstallmentAllotted;
      }
    });
    this.markDirty();
  }

  revokeAllotment(allotmentId: string) {
    const allotmentIdx = this.allotments.findIndex(a => a.allotmentId === allotmentId);
    if (allotmentIdx === -1) return;
    
    const allotment = this.allotments[allotmentIdx];
    allotment.revoked = true;
    allotment.isConfirmed = false;

    const chit = this.chits.find(c => c.chitGroupId === allotment.chitGroupId);
    if (!chit) return;

    const currentSchedule = this.installments.find(s => 
      s.chitGroupId === allotment.chitGroupId && 
      s.memberId === allotment.memberId && 
      s.monthNo === allotment.monthNo
    );
    if (currentSchedule) currentSchedule.isPrizeMonth = false;

    this.installments.forEach(s => {
      if (s.chitGroupId === allotment.chitGroupId && 
          s.memberId === allotment.memberId && 
          s.monthNo > allotment.monthNo) {
        s.dueAmount = chit.monthlyInstallmentRegular;
      }
    });
    this.markDirty();
  }
}

export const db = new DB();
