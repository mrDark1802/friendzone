export interface CallSession {
  callId: string;
  conversationId: string;
  callerId: string;
  targetId: string;
  type: 'audio' | 'video';
  status: 'RINGING' | 'ACCEPTED' | 'CONNECTED' | 'ENDED' | 'DECLINED' | 'CANCELLED' | 'BUSY' | 'TIMEOUT' | 'FAILED';
  createdAt: Date;
  expiresAt: Date;
  ringingTimeoutTimer?: NodeJS.Timeout;
  recoveryTimeoutTimer?: NodeJS.Timeout;
}

export interface ICallRegistry {
  tryCreateCall(session: CallSession): { success: boolean; reason?: 'BUSY_CALLER' | 'BUSY_TARGET' };
  getCall(callId: string): CallSession | undefined;
  getCallByUserId(userId: string): CallSession | undefined;
  updateCallStatus(callId: string, status: CallSession['status']): CallSession | undefined;
  removeCall(callId: string): CallSession | undefined;
  isUserInCall(userId: string): boolean;
  forceClearUserCalls(userId: string): void;
}

/**
 * Single-instance in-memory active call registry.
 * Performs atomic tryCreateCall checks to prevent concurrent caller race conditions.
 * Interface designed for future RedisCallRegistry distributed multi-instance scaling.
 */
export class InMemoryCallRegistry implements ICallRegistry {
  private calls = new Map<string, CallSession>(); // callId -> CallSession
  private userActiveCallMap = new Map<string, string>(); // userId -> callId

  public forceClearUserCalls(userId: string): void {
    const callId = this.userActiveCallMap.get(userId);
    if (callId) {
      this.removeCall(callId);
    }
    this.userActiveCallMap.delete(userId);
  }

  public tryCreateCall(session: CallSession): { success: boolean; reason?: 'BUSY_CALLER' | 'BUSY_TARGET' } {
    // Purge any stale calls first
    this.isUserInCall(session.callerId);
    this.isUserInCall(session.targetId);

    // If caller is still in a previous session, force clear caller's previous call so new call can proceed
    if (this.isUserInCall(session.callerId)) {
      this.forceClearUserCalls(session.callerId);
    }

    if (this.isUserInCall(session.targetId)) {
      return { success: false, reason: 'BUSY_TARGET' };
    }

    // Single atomic insertion
    this.calls.set(session.callId, session);
    this.userActiveCallMap.set(session.callerId, session.callId);
    this.userActiveCallMap.set(session.targetId, session.callId);

    return { success: true };
  }

  public getCall(callId: string): CallSession | undefined {
    return this.calls.get(callId);
  }

  public getCallByUserId(userId: string): CallSession | undefined {
    const callId = this.userActiveCallMap.get(userId);
    if (!callId) return undefined;
    return this.calls.get(callId);
  }

  public updateCallStatus(callId: string, status: CallSession['status']): CallSession | undefined {
    const session = this.calls.get(callId);
    if (session) {
      session.status = status;
      this.calls.set(callId, session);
    }
    return session;
  }

  public removeCall(callId: string): CallSession | undefined {
    const session = this.calls.get(callId);
    if (session) {
      if (session.ringingTimeoutTimer) clearTimeout(session.ringingTimeoutTimer);
      if (session.recoveryTimeoutTimer) clearTimeout(session.recoveryTimeoutTimer);

      this.userActiveCallMap.delete(session.callerId);
      this.userActiveCallMap.delete(session.targetId);
      this.calls.delete(callId);
    }
    return session;
  }

  public isUserInCall(userId: string): boolean {
    const callId = this.userActiveCallMap.get(userId);
    if (!callId) return false;
    const session = this.calls.get(callId);
    if (!session) {
      this.userActiveCallMap.delete(userId);
      return false;
    }
    // Terminal states are purged cleanly and considered inactive
    if (['ENDED', 'DECLINED', 'CANCELLED', 'TIMEOUT', 'FAILED', 'BUSY'].includes(session.status)) {
      this.removeCall(callId);
      return false;
    }
    return true;
  }
}

export const callRegistry = new InMemoryCallRegistry();
