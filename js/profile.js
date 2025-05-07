// Profile page functionality
import { supabase } from './config.js';

// Utility function to show popup messages
const showPopup = (message, isSuccess = true) => {
    const popup = document.createElement('div');
    popup.className = `popup ${isSuccess ? 'success' : 'error'}`;
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => document.body.removeChild(popup), 500);
    }, 3000);
};

// Format date for display
const formatDate = dateString => !dateString ? 'N/A' : new Date(dateString).toLocaleString();

// DOM helper functions
const $ = id => document.getElementById(id);
const setDisplay = (id, display) => {
    const element = $(id);
    if (element) element.style.display = display;
};
const setValue = (id, value) => {
    const element = $(id);
    if (element) element.value = value || '';
};
const setReadOnly = (ids, readOnly) => ids.forEach(id => {
    const element = $(id);
    if (element) element.readOnly = readOnly;
});

// Load user profile data
async function loadUserProfile() {
    try {
        // Show loading state
        setDisplay('profileLoading', 'block');
        setDisplay('profileContent', 'none');
        
        // Get current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error('Not authenticated. Please log in.');
        
        const userId = session.user.id;
        setValue('email', session.user.email || session.user.email_address || '');
        
        // Fetch user profile
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (profileError) {
            console.error('Error fetching profile:', profileError);
            
            
        }
        
        // Update form and show content
        updateProfileForm(profile);
        setDisplay('profileLoading', 'none');
        setDisplay('profileContent', 'block');
        
    } catch (error) {
        console.error('Profile loading error:', error);
        showPopup(error.message || 'Failed to load profile', false);
        
        // Redirect if not authenticated
        if (error.message.includes('authenticated')) {
            setTimeout(() => window.location.href = 'login.html', 2000);
        }
    }
}

// Update form with profile data
function updateProfileForm(profile) {
    if (!profile) return;
    
    setValue('fullName', profile.full_name);
    setValue('phone', profile.phone || '');
    setValue('email', profile.email || profile.email_address || '');
    
    const createdAt = $('createdAt');
    if (createdAt) createdAt.textContent = formatDate(profile.created_at);
    
    const updatedAt = $('updatedAt');
    if (updatedAt) updatedAt.textContent = formatDate(profile.updated_at);
    
    // Set join date if it exists
    const joinDate = $('joinDate');
    if (joinDate) joinDate.value = formatDate(profile.created_at);
}

// Toggle edit mode functions
function enableEditMode() {
    setReadOnly(['fullName', 'phone'], false);
    setDisplay('saveProfileBtn', 'inline-block');
    setDisplay('cancelEditBtn', 'inline-block');
    setDisplay('editProfileBtn', 'none');
}

function disableEditMode() {
    setReadOnly(['fullName', 'phone'], true);
    setDisplay('saveProfileBtn', 'none');
    setDisplay('cancelEditBtn', 'none');
    setDisplay('editProfileBtn', 'inline-block');
}

// Cancel edit and restore original values
async function cancelEdit() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
        if (error) throw error;
        updateProfileForm(profile);
        disableEditMode();
    } catch (error) {
        console.error('Error canceling edit:', error);
        showPopup('Failed to restore profile data', false);
    }
}

// Save profile changes
async function saveProfileChanges(event) {
    event.preventDefault();
    
    try {
        const submitButton = $('saveProfileBtn');
        if (!submitButton) return;
        
        submitButton.textContent = 'Saving...';
        submitButton.disabled = true;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        
        const fullNameInput = $('fullName');
        const phoneInput = $('phone');
        
        if (!fullNameInput || !phoneInput) {
            throw new Error('Required form fields are missing');
        }
        
        const { data, error } = await supabase
            .from('profiles')
            .update({
                full_name: fullNameInput.value,
                phone: phoneInput.value,
                updated_at: new Date().toISOString()
            })
            .eq('id', session.user.id)
            .select()
            .single();
        
        if (error) throw error;
        
        updateProfileForm(data);
        disableEditMode();
        showPopup('Profile updated successfully');
    } catch (error) {
        console.error('Profile update error:', error);
        showPopup(error.message || 'Failed to update profile', false);
    } finally {
        const submitButton = $('saveProfileBtn');
        if (submitButton) {
            submitButton.textContent = 'Save Changes';
            submitButton.disabled = false;
        }
    }
}

// Validate password strength
function validatePassword(password) {
    if (!password) return { valid: false, message: 'Password is required' };
    
    const checks = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    const isValid = Object.values(checks).every(Boolean);
    
    if (!isValid) {
        let message = 'Password must:';
        if (!checks.minLength) message += ' be at least 8 characters long;';
        if (!checks.hasUppercase) message += ' include at least one uppercase letter;';
        if (!checks.hasLowercase) message += ' include at least one lowercase letter;';
        if (!checks.hasNumber) message += ' include at least one number;';
        if (!checks.hasSpecial) message += ' include at least one special character;';
        return { valid: false, message };
    }
    
    return { valid: true };
}

// Update password policy indicators in real-time
function initPasswordValidation() {
    const passwordInput = $('newPassword');
    
    // Password policy checks
    const lengthCheck = $('lengthCheck');
    const uppercaseCheck = $('uppercaseCheck');
    const lowercaseCheck = $('lowercaseCheck');
    const numberCheck = $('numberCheck');
    const specialCheck = $('specialCheck');

    // Update password policy indicators in real-time
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        // Check length
        if (password.length >= 8) {
            lengthCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            lengthCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check uppercase
        if (/[A-Z]/.test(password)) {
            uppercaseCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            uppercaseCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check lowercase
        if (/[a-z]/.test(password)) {
            lowercaseCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            lowercaseCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check number
        if (/[0-9]/.test(password)) {
            numberCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            numberCheck.querySelector('.policy-icon').textContent = '❌';
        }
        
        // Check special character
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            specialCheck.querySelector('.policy-icon').textContent = '✅';
        } else {
            specialCheck.querySelector('.policy-icon').textContent = '❌';
        }
    });
}

// Change user password
async function changePassword(event) {
    event.preventDefault();
    
    try {
        const currentPassword = $('currentPassword').value;
        const newPassword = $('newPassword').value;
        const confirmPassword = $('confirmNewPassword').value;
        
        if (!currentPassword) {
            showPopup('Current password is required', false);
            return;
        }
        
        // Validate new password
        const validation = validatePassword(newPassword);
        if (!validation.valid) {
            showPopup(validation.message, false);
            return;
        }
        
        // Check if passwords match
        if (newPassword !== confirmPassword) {
            showPopup('New passwords do not match', false);
            return;
        }
        
        // Verify current password
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: session.user.email,
            password: currentPassword
        });
        
        if (signInError) {
            showPopup('Current password is incorrect', false);
            return;
        }
        
        // Update password
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;
        
        // Clear password fields
        ['currentPassword', 'newPassword', 'confirmNewPassword'].forEach(id => setValue(id, ''));
        showPopup('Password updated successfully');
    } catch (error) {
        console.error('Password change error:', error);
        showPopup(error.message || 'Failed to change password', false);
    }
}

// Handle account deletion
function showDeleteModal() {
    // Simply show the delete confirmation section
    document.getElementById('deleteModal').style.display = 'block';
    
    // Scroll to make it visible if needed
    document.getElementById('deleteModal').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideDeleteModal() {
    // Hide the delete confirmation section
    document.getElementById('deleteModal').style.display = 'none';
    
    // Clear the password field
    setValue('deleteConfirmPassword', '');
}

async function deleteAccount() {
    try {
        const password = $('deleteConfirmPassword').value;
        if (!password) {
            showPopup('Please enter your password to confirm deletion', false);
            return;
        }
        
        // Get current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error('Not authenticated. Please log in.');
        
        const userId = session.user.id;
        
        // Verify password
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
            email: session.user.email, 
            password 
        });
        if (signInError) throw new Error('Incorrect password');
        
        // Delete user's data
        await Promise.allSettled([
            supabase.from('devices').delete().eq('user_id', userId),
            supabase.from('profiles').delete().eq('id', userId)
        ]);
        
        // Call the Edge Function to delete the user from auth.users table
        try {
            const token = session.access_token;
            if (!token) throw new Error('No access token available. Please log in again.');
            
            const response = await fetch("https://fzrxktbxjbcmbudiouqa.functions.supabase.co/delete-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: userId })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                
                // If we get a "User not allowed" error, try the fallback approach
                if (errorText.includes("User not allowed")) {
                    // Mark user as deleted in metadata
                    const { error: updateError } = await supabase.auth.updateUser({
                        data: { deleted: true, deleted_at: new Date().toISOString() }
                    });
                    
                    if (updateError) throw updateError;
                    await supabase.auth.signOut();
                    showPopup('Your account has been marked as deleted and all your data has been removed.');
                    setTimeout(() => window.location.href = 'index.html', 2000);
                    return;
                }
                
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error deleting account from auth.users');
            
            await supabase.auth.signOut();
            showPopup('Your account has been completely deleted from the system.');
            setTimeout(() => window.location.href = 'index.html', 2000);
        } catch (fetchError) {
            throw new Error('Failed to delete account: ' + fetchError.message);
        }
    } catch (error) {
        console.error('Account deletion error:', error);
        showPopup(error.message || 'Failed to delete account', false);
        hideDeleteModal();
    }
}

// Handle user logout
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        showPopup('Successfully logged out');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } catch (error) {
        console.error('Logout error:', error);
        showPopup(error.message || 'Failed to logout', false);
    }
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load profile data
    loadUserProfile();
    
    // Initialize password validation
    initPasswordValidation();
    
    // Add event listeners to form elements
    const elements = {
        'editProfileBtn': { event: 'click', handler: enableEditMode },
        'cancelEditBtn': { event: 'click', handler: cancelEdit },
        'profileForm': { event: 'submit', handler: saveProfileChanges },
        'changePasswordForm': { event: 'submit', handler: changePassword },
        'deleteAccountBtn': { event: 'click', handler: showDeleteModal },
        'cancelDeleteBtn': { event: 'click', handler: hideDeleteModal },
        'confirmDeleteBtn': { event: 'click', handler: deleteAccount },
        'logoutBtn': { event: 'click', handler: handleLogout }
    };
    
    // Attach all event listeners
    Object.entries(elements).forEach(([id, { event, handler }]) => {
        const element = $(id);
        if (element) element.addEventListener(event, handler);
    });
    
});
