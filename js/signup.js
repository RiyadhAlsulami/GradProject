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

// Handle registration form submission
function initRegistrationForm() {
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log("Registration form submitted");
            
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Check if passwords match
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            try {
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
                    // The profile will be created when they visit the profile page
                }
                
                // Registration successful
                console.log("Registration successful:", data.user.email);
                
                // Show success message
                const popup = document.createElement('div');
                popup.className = 'popup success';
                popup.textContent = 'Registration successful! Redirecting to dashboard...';
                document.body.appendChild(popup);
                
                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } catch (error) {
                console.error("Registration error:", error);
                
                // Show error message
                const popup = document.createElement('div');
                popup.className = 'popup error';
                popup.textContent = error.message || 'Registration failed';
                document.body.appendChild(popup);
                
                setTimeout(() => {
                    popup.style.animation = 'fadeOut 0.5s forwards';
                    setTimeout(() => {
                        document.body.removeChild(popup);
                    }, 500);
                }, 3000);
            }
        });
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initPasswordValidation();
    initRegistrationForm();
});
