
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const DebugUserInfo: React.FC = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Checking user role for:', user.email);
        
        // Check user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError) {
          console.error('❌ Error fetching user role:', roleError);
        } else {
          console.log('✅ User role found:', roleData?.role);
          setUserRole(roleData?.role || null);
        }

        // Check profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('❌ Error fetching profile:', profileError);
        } else {
          console.log('✅ Profile found:', profileData);
        }

      } catch (error) {
        console.error('❌ Error in user role check:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

  if (!user) {
    return (
      <Card className="mb-4 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Debug: No User Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You are not logged in. Please log in to add members.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <p>Checking user permissions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-600">Debug: User Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        <div>
          <strong>User ID:</strong> {user.id}
        </div>
        <div>
          <strong>Role:</strong> {userRole ? (
            <Badge variant="secondary">{userRole}</Badge>
          ) : (
            <Badge variant="destructive">No role assigned</Badge>
          )}
        </div>
        {!userRole && (
          <div className="text-red-600 text-sm">
            ⚠️ You don't have a role assigned. This might prevent you from adding members.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
