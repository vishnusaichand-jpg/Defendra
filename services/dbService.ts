
import { User, PlanType, Message } from '../types';

export interface AuditLog {
  id: string;
  timestamp: number;
  event: 'NODE_PROVISIONED' | 'EMAIL_CHALLENGE' | 'IDENTITY_CONFIRMED' | 'ACCESS_GRANTED' | 'CLEARANCE_ELEVATED' | 'CREDENTIAL_OVERRIDE';
  details: string;
}

interface DBUser extends User {
  password_hash: string;
}

interface DBMessages {
  [userId: string]: Message[];
}

interface DBAudit {
  [userId: string]: AuditLog[];
}

const USERS_KEY = 'defendra_db_vault_users';
const MESSAGES_KEY = 'defendra_db_vault_messages';
const AUDIT_KEY = 'defendra_db_vault_audit';

const simulateLatency = (min = 400, max = 1000) => 
  new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

export const dbService = {
  init: () => {
    if (!localStorage.getItem(USERS_KEY)) localStorage.setItem(USERS_KEY, JSON.stringify([]));
    if (!localStorage.getItem(MESSAGES_KEY)) localStorage.setItem(MESSAGES_KEY, JSON.stringify({}));
    if (!localStorage.getItem(AUDIT_KEY)) localStorage.setItem(AUDIT_KEY, JSON.stringify({}));
  },

  privateLogAudit: (userId: string, event: AuditLog['event'], details: string) => {
    const data = localStorage.getItem(AUDIT_KEY);
    const audit: DBAudit = data ? JSON.parse(data) : {};
    if (!audit[userId]) audit[userId] = [];
    
    audit[userId].unshift({
      id: `LOG-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      timestamp: Date.now(),
      event,
      details
    });
    
    // Keep only last 20 logs for storage efficiency
    audit[userId] = audit[userId].slice(0, 20);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(audit));
  },

  getAuditLogs: async (userId: string): Promise<AuditLog[]> => {
    await simulateLatency(200, 500);
    const data = localStorage.getItem(AUDIT_KEY);
    const audit: DBAudit = data ? JSON.parse(data) : {};
    return audit[userId] || [];
  },

  findUserByEmail: async (email: string): Promise<DBUser | undefined> => {
    await simulateLatency();
    const users: DBUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  createUser: async (username: string, email: string, passwordHash: string): Promise<User> => {
    await simulateLatency(1200, 2000);
    const users: DBUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    const newUser: DBUser = {
      id: `NODE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      username,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      plan: 'FREE',
      createdDate: Date.now(),
      isEmailConfirmed: false
    };
    
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    dbService.privateLogAudit(newUser.id, 'NODE_PROVISIONED', `Operative node @${username} established.`);
    dbService.privateLogAudit(newUser.id, 'EMAIL_CHALLENGE', `Cryptographic challenge dispatched to ${email}.`);
    
    const { password_hash, ...sanitized } = newUser;
    return sanitized;
  },

  confirmEmail: async (userId: string): Promise<boolean> => {
    await simulateLatency(800, 1500);
    const users: DBUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const index = users.findIndex(u => u.id === userId);
    
    if (index !== -1) {
      users[index].isEmailConfirmed = true;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      dbService.privateLogAudit(userId, 'IDENTITY_CONFIRMED', 'Node identity verified through challenge bypass.');
      return true;
    }
    return false;
  },

  updateUserPlan: async (userId: string, plan: PlanType): Promise<boolean> => {
    await simulateLatency(1500, 2500);
    const users: DBUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const index = users.findIndex(u => u.id === userId);
    
    if (index !== -1) {
      const oldPlan = users[index].plan;
      users[index].plan = plan;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      dbService.privateLogAudit(userId, 'CLEARANCE_ELEVATED', `Clearance level elevated from ${oldPlan} to ${plan}.`);
      return true;
    }
    return false;
  },

  updateUserPassword: async (email: string, newPasswordHash: string): Promise<boolean> => {
    await simulateLatency(1000, 1800);
    const users: DBUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (index !== -1) {
      users[index].password_hash = newPasswordHash;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      dbService.privateLogAudit(users[index].id, 'CREDENTIAL_OVERRIDE', 'Security keys re-generated via recovery protocol.');
      return true;
    }
    return false;
  },

  saveMessage: async (userId: string, message: Message): Promise<void> => {
    const allMessages: DBMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '{}');
    if (!allMessages[userId]) allMessages[userId] = [];
    allMessages[userId].push(message);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
  },

  getChatHistory: async (userId: string): Promise<Message[]> => {
    await simulateLatency(400, 800);
    const allMessages: DBMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '{}');
    return allMessages[userId] || [];
  },

  recordLogin: async (userId: string) => {
    dbService.privateLogAudit(userId, 'ACCESS_GRANTED', 'Node session authenticated successfully.');
  }
};
