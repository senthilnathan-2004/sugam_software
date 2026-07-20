'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Users, Save, Loader2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function UserManagement() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'DOCTOR',
    },
  });

  const fetchUsersList = async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('settings:get-users');
        if (res?.success && Array.isArray(res.data)) setUsersList(res.data);
      } catch {
        // Fallback demo users
        setUsersList([
          { id: '1', name: 'HMS Admin', email: 'admin@sugamhms.com', role: 'ADMIN', isActive: true },
          { id: '2', name: 'Dr. Anjali Verma', email: 'doctor@sugamhms.com', role: 'DOCTOR', isActive: true },
        ]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  const handleCreateUser = async (data: any) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('settings:create-user', data);
        if (res?.success) {
          toast.success('System user created successfully!');
          reset();
          fetchUsersList();
        } else {
          toast.error(res?.error ?? 'Failed to register user.');
        }
      } catch {
        toast.error('Simulation creation failed.');
      }
    }
    setIsLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('settings:delete-user', userId);
        if (res?.success) {
          toast.success('System user deleted successfully.');
          fetchUsersList();
        } else {
          toast.error(res?.error ?? 'Failed to delete user.');
        }
      } catch {
        toast.error('Simulation delete failed.');
      }
    } else {
      setUsersList(usersList.filter(u => u.id !== userId));
      toast.success('User deleted (Demo Mode)');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 items-start w-full max-w-5xl">
      {/* Create User Form */}
      <Card className="w-full p-6 bg-white border border-slate-100 shadow-md rounded-hms space-y-4">
        <div className="flex items-center gap-2 text-slate-800 border-b pb-2.5">
          <Plus className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold">Register New User Account</h3>
        </div>

        <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="usr-name">Full Name</Label>
            <Input id="usr-name" {...register('name', { required: true })} className="h-10 rounded-lg text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usr-email">Email Address</Label>
            <Input id="usr-email" type="email" {...register('email', { required: true })} className="h-10 rounded-lg text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usr-pass">Password</Label>
            <Input id="usr-pass" type="password" {...register('password', { required: true })} className="h-10 rounded-lg text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label>User System Role</Label>
            <Select defaultValue="DOCTOR" onValueChange={(v) => setValue('role', v)}>
              <SelectTrigger className="h-10 rounded-lg text-xs">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent className="bg-white border">
                <SelectItem value="ADMIN">Administrator</SelectItem>
                <SelectItem value="DOCTOR">Doctor / Clinician</SelectItem>
                <SelectItem value="BILLING">Billing Counter Clerk</SelectItem>
                <SelectItem value="RECEPTION">Receptionist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Create User Account
          </Button>
        </form>
      </Card>

      {/* Users directory List */}
      <Card className="w-full p-6 bg-white border border-slate-100 shadow-md rounded-hms">
        <div className="flex items-center gap-2 text-slate-800 border-b pb-2.5 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold">User Directory Logs</h3>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-2">
                <th className="pb-2.5">User Name</th>
                <th className="pb-2.5">Email</th>
                <th className="pb-2.5">System Role</th>
                <th className="pb-2.5">Status</th>
                {user?.role === 'ADMIN' && <th className="pb-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
              {usersList.map((usr) => (
                <tr key={usr.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-bold text-slate-900">{usr.name}</td>
                  <td className="py-2.5 font-mono text-slate-600">{usr.email}</td>
                  <td className="py-2.5">
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase">{usr.role}</span>
                  </td>
                  <td className="py-2.5">
                    <span className="text-[9px] bg-emerald-50 text-success border border-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase">
                      {usr.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  {user?.role === 'ADMIN' && (
                    <td className="py-2.5 text-right">
                      {usr.id !== user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="text-danger hover:bg-danger/10 p-1.5 rounded transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user account
                                "{usr.name}" from the database.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(usr.id)} className="bg-danger text-white hover:bg-danger/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
