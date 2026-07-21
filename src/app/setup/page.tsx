'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, Server, Laptop, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLan, type DeploymentInfo } from '@/features/lan/hooks/use-lan';

type Choice = 'STANDALONE' | 'HOST' | 'CLIENT' | null;

/**
 * First-run / reconfigure deployment setup (spec §15). Top-level route (NOT under
 * the authenticated dashboard) so a Client that cannot yet reach its Host can
 * still open it to pair or switch roles. A mode change requires an app restart.
 */
export default function SetupPage() {
  const router = useRouter();
  const { getDeployment, setDeployment, pair } = useLan();

  const [current, setCurrent] = useState<DeploymentInfo | null>(null);
  const [choice, setChoice] = useState<Choice>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // Host form
  const [hostPort, setHostPort] = useState('4783');
  // Client form
  const [address, setAddress] = useState('');
  const [clientPort, setClientPort] = useState('4783');
  const [code, setCode] = useState('');
  const [deviceName, setDeviceName] = useState('');

  useEffect(() => {
    getDeployment().then((d) => d && setCurrent(d));
  }, [getDeployment]);

  const chooseStandalone = async () => {
    setBusy(true);
    const r = await setDeployment('STANDALONE');
    setBusy(false);
    if (r) setDone('This computer is now set to Single Computer mode.');
  };

  const chooseHost = async () => {
    setBusy(true);
    const r = await setDeployment('HOST', parseInt(hostPort, 10) || 4783);
    setBusy(false);
    if (r) setDone('This computer is now the Main / Host. Other clinic computers can connect to it.');
  };

  const chooseClient = async () => {
    if (!address.trim() || !code.trim()) return;
    setBusy(true);
    const r = await pair(address.trim(), parseInt(clientPort, 10) || 4783, code.trim(), deviceName.trim() || undefined);
    setBusy(false);
    if (r.success) {
      setDone(
        `Connected to the Main computer${r.data?.hostName ? ` (${r.data.hostName})` : ''}. This computer is now a Client.`
      );
    }
  };

  if (done) {
    return (
      <Shell>
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-black text-slate-800">Setup saved</h1>
          <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">{done}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-semibold max-w-md mx-auto">
            Please fully close and reopen Sugam HMS now for the change to take effect.
          </div>
          <Button variant="outline" onClick={() => router.replace('/login')} className="rounded-xl font-bold">
            Go to Login
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => router.replace('/login')}
          className="text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
        </button>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-slate-800">How will this computer be used?</h1>
          <p className="text-sm text-slate-500 font-medium">
            {current ? `Currently: ${current.mode}` : 'Choose a deployment mode for Sugam HMS.'}
          </p>
        </div>

        {!choice && (
          <div className="grid gap-4">
            <ModeCard
              icon={<Monitor className="h-6 w-6" />}
              title="Single Computer"
              desc="Use Sugam HMS only on this PC. Stores its own clinic database."
              onClick={() => setChoice('STANDALONE')}
            />
            <ModeCard
              icon={<Server className="h-6 w-6" />}
              title="Main / Host Computer"
              desc="Store the clinic database here and let other clinic computers connect over Wi-Fi/LAN. (Recommended for the Billing PC.)"
              onClick={() => setChoice('HOST')}
            />
            <ModeCard
              icon={<Laptop className="h-6 w-6" />}
              title="Additional / Client Computer"
              desc="Connect to the Main computer over the clinic Wi-Fi/LAN. (For Doctor PCs.)"
              onClick={() => setChoice('CLIENT')}
            />
          </div>
        )}

        {choice === 'STANDALONE' && (
          <Panel onBack={() => setChoice(null)} title="Single Computer">
            <p className="text-sm text-slate-600 font-medium">
              This PC will run entirely on its own with a local database. No network needed.
            </p>
            <Button onClick={chooseStandalone} disabled={busy} className="bg-primary text-white rounded-xl font-bold">
              {busy ? 'Saving…' : 'Use Single Computer mode'}
            </Button>
          </Panel>
        )}

        {choice === 'HOST' && (
          <Panel onBack={() => setChoice(null)} title="Main / Host Computer">
            <div className="space-y-1.5 max-w-xs">
              <Label className="text-xs font-bold uppercase text-slate-600">Network Port</Label>
              <Input value={hostPort} onChange={(e) => setHostPort(e.target.value)} className="h-11 rounded-xl" />
              <p className="text-[11px] text-slate-400 font-medium">Default 4783. Allow this port through Windows Firewall for Private networks.</p>
            </div>
            <Button onClick={chooseHost} disabled={busy} className="bg-primary text-white rounded-xl font-bold">
              {busy ? 'Saving…' : 'Make this the Main / Host'}
            </Button>
          </Panel>
        )}

        {choice === 'CLIENT' && (
          <Panel onBack={() => setChoice(null)} title="Connect to the Main Computer">
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Main Computer Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 192.168.1.100" className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-600">Port</Label>
                  <Input value={clientPort} onChange={(e) => setClientPort(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-600">Pairing Code</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">This Computer&apos;s Name</Label>
                <Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="e.g. Doctor A Laptop" className="h-11 rounded-xl" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              On the Main computer, open Settings → Multi-PC / Network → Enable pairing to get the code.
            </p>
            <Button
              onClick={chooseClient}
              disabled={busy || !address.trim() || !code.trim()}
              className="bg-primary text-white rounded-xl font-bold"
            >
              {busy ? 'Connecting…' : 'Connect'}
            </Button>
          </Panel>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-lg p-8">{children}</div>
    </div>
  );
}

function ModeCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-5 rounded-2xl border border-slate-200 hover:border-primary hover:bg-primary/5 transition flex gap-4 items-start"
    >
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

function Panel({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <h2 className="text-lg font-black text-slate-800">{title}</h2>
      {children}
    </div>
  );
}
