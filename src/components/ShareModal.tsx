import { useState, useEffect } from 'react';
import {
  Link2, Copy, Trash2, RefreshCw, X, CheckCheck, Shield, Users, Eye,
} from 'lucide-react';
import {
  doc, setDoc, deleteDoc, collection, query, where, getDocs, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

interface ShareModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

interface ShareToken {
  id: string;
  createdAt: string;
}

interface Viewer {
  viewerId: string;
  viewerEmail?: string;
  grantedAt: string;
}

export default function ShareModal({ userId, userName, onClose }: ShareModalProps) {
  const [token, setToken] = useState<ShareToken | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const baseUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '')
    ?? window.location.origin;
  const shareUrl = token ? `${baseUrl}?share=${token.id}` : '';

  useEffect(() => {
    loadState();
  }, [userId]);

  const loadState = async () => {
    setLoading(true);
    try {
      // Find existing token for this owner
      const tokSnap = await getDocs(
        query(collection(db, 'shareTokens'), where('ownerId', '==', userId))
      );
      if (!tokSnap.empty) {
        const d = tokSnap.docs[0];
        setToken({ id: d.id, createdAt: d.data().createdAt });

        // Load viewers from subcollection /viewerGrants/{ownerId}/viewers
        const viewersSnap = await getDocs(
          collection(db, 'viewerGrants', userId, 'viewers')
        );
        setViewers(viewersSnap.docs.map(v => v.data() as Viewer));
      } else {
        setToken(null);
        setViewers([]);
      }
    } catch (err) {
      console.error('ShareModal load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    setGenerating(true);
    try {
      // Revoke old token if any
      if (token) {
        await deleteDoc(doc(db, 'shareTokens', token.id));
      }
      const tokenId = crypto.randomUUID();
      await setDoc(doc(db, 'shareTokens', tokenId), {
        ownerId: userId,
        ownerName: userName,
        active: true,
        createdAt: new Date().toISOString(),
      });
      setToken({ id: tokenId, createdAt: new Date().toISOString() });
    } catch (err) {
      console.error(err);
      alert('Failed to generate link. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const revokeAccess = async () => {
    if (!token) return;
    if (!confirm('Revoke share link? Anyone with the link will lose access immediately.')) return;
    setRevoking(true);
    try {
      // Delete token
      await deleteDoc(doc(db, 'shareTokens', token.id));
      // Delete all viewer grants for this owner
      const snap = await getDocs(collection(db, 'viewerGrants', userId, 'viewers'));
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      setToken(null);
      setViewers([]);
    } catch (err) {
      console.error(err);
      alert('Failed to revoke. Please try again.');
    } finally {
      setRevoking(false);
    }
  };

  const removeViewer = async (viewerId: string) => {
    if (!confirm('Remove this person\'s access?')) return;
    try {
      await deleteDoc(doc(db, 'viewerGrants', userId, 'viewers', viewerId));
      setViewers(v => v.filter(x => x.viewerId !== viewerId));
    } catch (err) {
      console.error(err);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="glass-card rounded-[32px] p-6 w-full max-w-md shadow-2xl border border-white/60 dark:border-slate-800/40">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-2xl text-indigo-500"><Link2 size={18} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Share My Finances</h3>
              <p className="text-xs text-slate-400 font-medium">Read-only access for your partner</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900 rounded-xl transition">
            <X size={18} />
          </button>
        </div>

        {/* Info banner */}
        <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 mb-5">
          <div className="flex items-start gap-2.5">
            <Shield size={13} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              Your partner opens the link and signs in once with Google. They can view all your
              transactions, debts, and monthly reports — <strong>but cannot add, edit, or delete</strong> anything.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : token ? (
          <div className="space-y-4">
            {/* Link display */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Your Share Link
              </label>
              <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-slate-900/40 border border-white/50 dark:border-slate-800 rounded-2xl">
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 flex-1 truncate">{shareUrl}</p>
                <button type="button" onClick={copyLink}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                  {copied ? <><CheckCheck size={11} />Copied!</> : <><Copy size={11} />Copy</>}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Active since {new Date(token.createdAt).toLocaleDateString('en-IN')}</p>
            </div>

            {/* Viewers list */}
            {viewers.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Eye size={10} />Has Access ({viewers.length})
                </label>
                <div className="space-y-1.5">
                  {viewers.map(v => (
                    <div key={v.viewerId} className="flex items-center justify-between px-3 py-2 bg-white/40 dark:bg-slate-900/30 rounded-xl border border-white/50 dark:border-slate-800/40">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <Users size={10} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {v.viewerEmail || 'Partner'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Since {new Date(v.grantedAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeViewer(v.viewerId)}
                        className="p-1 text-slate-400 hover:text-red-500 transition rounded-lg">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={generateToken} disabled={generating}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl border border-white/50 dark:border-slate-700 bg-white/40 dark:bg-slate-900/30 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-white/70 transition disabled:opacity-50">
                <RefreshCw size={11} className={generating ? 'animate-spin' : ''} />
                New Link
              </button>
              <button type="button" onClick={revokeAccess} disabled={revoking}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30 font-bold text-xs uppercase tracking-wider transition disabled:opacity-50">
                <Trash2 size={11} />{revoking ? 'Revoking...' : 'Revoke All'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="py-4 text-slate-400">
              <Link2 className="w-10 h-10 opacity-20 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No active share link</p>
              <p className="text-xs mt-1">Generate a link to share your finances in read-only mode.</p>
            </div>
            <button type="button" onClick={generateToken} disabled={generating}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-60 shadow-lg shadow-indigo-500/20">
              <Link2 size={16} />
              {generating ? 'Generating...' : 'Generate Share Link'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
