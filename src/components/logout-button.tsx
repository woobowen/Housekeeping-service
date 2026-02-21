'use client';

import { logout } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => logout()}
      className="text-muted-foreground hover:text-foreground"
    >
      <LogOut className="mr-2 h-4 w-4" />
      退出登录
    </Button>
  );
}
