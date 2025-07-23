import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, Menu } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/components/auth/AuthProvider';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar = ({ onToggleSidebar }: TopBarProps) => {
  const { user, signOut } = useAuth();

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-4">
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="p-2 touch-manipulation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-xl md:text-2xl">🐄</span>
          <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">
            <span className="hidden sm:inline">Dairy Farm Manager</span>
            <span className="sm:hidden">Dairy Manager</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <NotificationBell />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 h-auto touch-manipulation">
              <Avatar className="h-7 w-7 md:h-8 md:w-8">
                <AvatarImage src="" alt="User avatar" />
                <AvatarFallback className="bg-blue-600 text-white text-xs md:text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56 z-50 bg-white border shadow-lg">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-7 w-7 md:h-8 md:w-8">
                <AvatarImage src="" alt="User avatar" />
                <AvatarFallback className="bg-blue-600 text-white text-xs md:text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[200px]">{user?.email}</span>
                <span className="text-xs text-gray-500">Online</span>
              </div>
            </div>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="cursor-pointer touch-manipulation py-3">
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer touch-manipulation py-3">
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className="cursor-pointer text-red-600 touch-manipulation py-3"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};