import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useMemberCreation } from '@/hooks/useMemberCreation';
import { validateEmail, validatePassword, validatePhone, validateName } from '@/lib/validation';
import { logger } from '@/lib/utils';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded?: () => void;
}

interface AddMemberFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  notes: string;
  password: string;
}

interface FormErrors {
  [key: string]: string;
}

export const AddMemberDialog: React.FC<AddMemberDialogProps> = ({ open, onOpenChange, onMemberAdded }) => {
  const { createMember, isCreating } = useMemberCreation();
  const [formData, setFormData] = useState<AddMemberFormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'member',
    notes: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate secure password
  const generatePassword = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }, []);

  const handleGeneratePassword = useCallback(() => {
    const pwd = generatePassword();
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
  }, [generatePassword]);

  // Validate form with improved validation
  const validateForm = useCallback(() => {
    const errors: FormErrors = {};

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error!;
    }

    // Name validation
    const firstNameValidation = validateName(formData.firstName, 'First name');
    if (!firstNameValidation.isValid) {
      errors.firstName = firstNameValidation.error!;
    }

    const lastNameValidation = validateName(formData.lastName, 'Last name');
    if (!lastNameValidation.isValid) {
      errors.lastName = lastNameValidation.error!;
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.error!;
    }

    // Phone validation (optional)
    if (formData.phone) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error!;
      }
    }

    // Role validation
    if (!formData.role || !['super_admin', 'admin', 'member', 'secretary', 'treasurer'].includes(formData.role)) {
      errors.role = 'Please select a valid role';
    }

    return errors;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFormErrors({});

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      logger.log('Creating new member:', { email: formData.email, role: formData.role });

      await createMember({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        role: formData.role as any,
        notes: formData.notes || undefined,
        password: formData.password,
      });

      // Reset form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'member',
        notes: '',
        password: '',
      });
      setShowPassword(false);
      setShowNotes(false);
      setFormErrors({});
      setErrorMessage(null);

      onMemberAdded?.();
      onOpenChange(false);

    } catch (error: any) {
      logger.error('Error creating member:', error);
      setErrorMessage(error.message || 'Failed to create member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, createMember, onMemberAdded, onOpenChange]);

  const handleInputChange = useCallback((field: keyof AddMemberFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);

  const handleClose = useCallback(() => {
    // Reset form when closing
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'member',
      notes: '',
      password: '',
    });
    setShowPassword(false);
    setShowNotes(false);
    setFormErrors({});
    setErrorMessage(null);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white pointer-events-auto overflow-visible">
        {/* Close button, absolutely positioned in the top-right corner */}
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100 focus:outline-none z-20"
        >
          <User className="sr-only" />
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Add New Member</span>
          </DialogTitle>
          <DialogDescription>
            Add a new bureau member with appropriate role and permissions
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{errorMessage}</span>
            </div>
          )}
          
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="member@iskconbureau.in"
                autoComplete="off"
                className={`pl-10 ${formErrors.email ? 'border-red-500' : ''}`}
                required
                aria-invalid={!!formErrors.email}
                aria-describedby={formErrors.email ? 'email-error' : undefined}
                disabled={isSubmitting}
              />
            </div>
            {formErrors.email && (
              <div id="email-error" className="text-red-500 text-xs mt-1" role="alert">
                {formErrors.email}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                className={formErrors.firstName ? 'border-red-500' : ''}
                required
                aria-invalid={!!formErrors.firstName}
                aria-describedby={formErrors.firstName ? 'firstName-error' : undefined}
              />
              {formErrors.firstName && (
                <div id="firstName-error" className="text-red-500 text-xs mt-1" role="alert">
                  {formErrors.firstName}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                className={formErrors.lastName ? 'border-red-500' : ''}
                required
                aria-invalid={!!formErrors.lastName}
                aria-describedby={formErrors.lastName ? 'lastName-error' : undefined}
              />
              {formErrors.lastName && (
                <div id="lastName-error" className="text-red-500 text-xs mt-1" role="alert">
                  {formErrors.lastName}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className={`pl-10 ${formErrors.phone ? 'border-red-500' : ''}`}
                aria-invalid={!!formErrors.phone}
                aria-describedby={formErrors.phone ? 'phone-error' : undefined}
              />
            </div>
            {formErrors.phone && (
              <div id="phone-error" className="text-red-500 text-xs mt-1" role="alert">
                {formErrors.phone}
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value: string) => handleInputChange('role', value)}>
              <SelectTrigger className={formErrors.role ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.role && (
              <div className="text-red-500 text-xs mt-1" role="alert">
                {formErrors.role}
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter password"
                className={`pr-20 ${formErrors.password ? 'border-red-500' : ''}`}
                required
                aria-invalid={!!formErrors.password}
                aria-describedby={formErrors.password ? 'password-error' : undefined}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="h-6 w-6 p-0"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGeneratePassword}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {formErrors.password && (
              <div id="password-error" className="text-red-500 text-xs mt-1" role="alert">
                {formErrors.password}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 8 characters with letters and numbers
            </p>
          </div>
          
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowNotes(!showNotes)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {showNotes ? 'Hide' : 'Add'} Notes
            </Button>
            {showNotes && (
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about this member..."
                className="mt-2"
                rows={3}
              />
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isCreating}>
              {isSubmitting || isCreating ? 'Creating...' : 'Create Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
