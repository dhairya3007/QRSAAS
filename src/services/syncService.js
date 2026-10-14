/**
 * Real-time Multi-Tab & Multi-Window Synchronization Service
 * Uses BroadcastChannel, Storage Events, and DOM CustomEvents to ensure that
 * any update made in Client, Admin, or Public views is instantly reflected across
 * all open tabs and windows without requiring manual page refreshes.
 */

const CHANNEL_NAME = 'saas_realtime_sync_channel';

class SyncService {
  constructor() {
    this.listeners = new Set();
    this.channel = null;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this._dispatch(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not available, falling back to storage events:', err);
      }
    }

    // Storage event fallback for cross-tab communication
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'saas_sync_timestamp' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this._dispatch(data);
          } catch {
            this._dispatch({ type: 'DATA_CHANGED', timestamp: Date.now() });
          }
        }
      });

      // Internal event for same-window updates
      window.addEventListener('saas_sync_internal', (e) => {
        if (e.detail) {
          this._dispatch(e.detail);
        }
      });
    }
  }

  _dispatch(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    });
  }

  /**
   * Broadcasts a data change notification to all open tabs and windows
   * @param {string} [entity] e.g. 'menu', 'dishes', 'card', 'clients', 'status'
   * @param {Object} [meta] additional metadata
   */
  notify(entity = 'all', meta = {}) {
    const payload = {
      type: 'DATA_CHANGED',
      entity,
      timestamp: Date.now(),
      meta,
    };

    // 1. Send to all other tabs via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (err) {
        console.warn('Failed to postMessage on BroadcastChannel:', err);
      }
    }

    // 2. Send via localStorage for cross-tab fallback
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('saas_sync_timestamp', JSON.stringify(payload));
      } catch {}

      // 3. Dispatch to same-tab listeners
      try {
        window.dispatchEvent(new CustomEvent('saas_sync_internal', { detail: payload }));
      } catch {}
    }
  }

  /**
   * Subscribes to real-time sync notifications
   * @param {Function} callback Function called whenever any data change is broadcast
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const syncService = new SyncService();
export default syncService;
