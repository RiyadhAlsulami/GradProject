import { supabase } from './config.js';

// Login function
async function login(email, password) {
    // Get the submit button
    const button = document.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    
    try {
        // Validate input
        if (!email || !password) {
            showPopup('Please enter both email and password', false);
            return;
        }
        
        // Show loading state
        button.textContent = 'Logging in...';
        button.disabled = true;
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Show success message
        showPopup('Login successful! Redirecting...', true);
        
        // Check if user is admin
        try {
            const user = data.user;
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();
                
            if (profileError) throw profileError;
            
            // Redirect based on admin status
            setTimeout(() => {
                if (profileData && profileData.is_admin === true) {
                    // User is admin, redirect to admin page
                    window.location.href = 'admin.html';
                } else {
                    // User is not admin, redirect to dashboard
                    window.location.href = 'dashboard.html';
                }
            }, 1500);
        } catch (profileError) {
            console.error('Error checking admin status:', profileError);
            // Default to dashboard if there's an error checking admin status
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Show user-friendly error message
        let errorMessage = 'Login failed';
        
        if (error.message) {
            if (error.message.includes('Invalid login credentials') || error.code === 'invalid_credentials') {
                errorMessage = 'Invalid email or password';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Please confirm your email before logging in';
            } else if (error.message.includes('rate limit')) {
                errorMessage = 'Too many login attempts. Please try again later';
            } else {
                errorMessage = error.message;
            }
        }
        
        showPopup(errorMessage, false);
        
    } finally {
        // Always reset button state, even if there's an error
        button.textContent = originalText;
        button.disabled = false;
    }
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

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            login(email, password);
        });
    }
    
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data, error }) => {
        if (data.session) {
            // User is already logged in, check if admin
            const user = data.session.user;
            supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single()
                .then(({ data: profileData, error: profileError }) => {
                    if (!profileError && profileData && profileData.is_admin === true) {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                })
                .catch(() => {
                    window.location.href = 'dashboard.html';
                });
        }
    });
});
