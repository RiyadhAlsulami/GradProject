import { supabase } from './config.js';

// Password validation functionality
function initPasswordValidation() {
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Password policy checks
    const lengthCheck = document.getElementById('lengthCheck');
    const uppercaseCheck = document.getElementById('uppercaseCheck');
    const lowercaseCheck = document.getElementById('lowercaseCheck');
    const numberCheck = document.getElementById('numberCheck');
    const specialCheck = document.getElementById('specialCheck');

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

// Helper function to show popup messages
function showPopup(message, isSuccess = true) {
    // Create popup element
    const popup = document.createElement('div');
    popup.className = `popup ${isSuccess ? 'success' : 'error'}`;
    popup.textContent = message;
    document.body.appendChild(popup);
    
    // Remove existing popups after a delay
    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        }, 500);
    }, 3000);
}

// Validate password meets requirements
function validatePassword(password) {
    const isLengthValid = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const isValid = isLengthValid && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    
    if (!isValid) {
        let message = 'Password must:';
        if (!isLengthValid) message += ' be at least 8 characters;';
        if (!hasUppercase) message += ' include uppercase letter;';
        if (!hasLowercase) message += ' include lowercase letter;';
        if (!hasNumber) message += ' include number;';
        if (!hasSpecial) message += ' include special character;';
        
        return { valid: false, message };
    }
    
    return { valid: true };
}

// Handle registration form submission
function initRegistrationForm() {
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log("Registration form submitted");
            
            // Get form elements
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const submitButton = registrationForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            
            try {
                // Validate inputs
                if (!fullName || !email || !password) {
                    showPopup('Please fill in all required fields', false);
                    return;
                }
                
                // Validate password
                const passwordValidation = validatePassword(password);
                if (!passwordValidation.valid) {
                    showPopup(passwordValidation.message, false);
                    return;
                }
                
                // Check if passwords match
                if (password !== confirmPassword) {
                    showPopup('Passwords do not match!', false);
                    return;
                }
                
                // Show loading state
                submitButton.textContent = 'Creating Account...';
                submitButton.disabled = true;
                
                // Create user with email, password and username as metadata
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });
                
                if (error) throw error;
                
                // Get the user ID from the newly created user
                const userId = data.user.id;
                
                // Create a profile record in the public.profiles table
                const now = new Date().toISOString();
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: userId,
                        full_name: fullName,
                        phone: '',  // Empty by default, user can update later
                        created_at: now,
                        updated_at: now
                    }]);
                
                if (profileError) {
                    console.error('Error creating profile:', profileError);
                    // Continue with signup process even if profile creation fails
                }
                
                // Registration successful
                console.log("Registration successful:", data.user.email);
                
                // Show success message
                showPopup('Registration successful! Redirecting to dashboard...', true);
                
                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } catch (error) {
                console.error("Registration error:", error);
                
                // Show user-friendly error message
                let errorMessage = 'Registration failed';
                
                if (error.message) {
                    if (error.message.includes('already registered')) {
                        errorMessage = 'This email is already registered';
                    } else if (error.message.includes('valid email')) {
                        errorMessage = 'Please enter a valid email address';
                    } else if (error.message.includes('weak password')) {
                        errorMessage = 'Password is too weak';
                    } else {
                        errorMessage = error.message;
                    }
                }
                
                showPopup(errorMessage, false);
            } finally {
                // Always reset button state
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initPasswordValidation();
    initRegistrationForm();
});
