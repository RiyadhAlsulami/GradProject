import { supabase } from './config.js';

// Login function
async function login(email, password) {
    try {
        // Show loading state
        const button = document.querySelector('button[type="submit"]');
        const originalText = button.textContent;
        button.textContent = 'Logging in...';
        button.disabled = true;
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Show success message
        const popup = document.createElement('div');
        popup.className = 'popup success';
        popup.textContent = 'Login successful! Redirecting...';
        document.body.appendChild(popup);
        
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
        
        // Show error message
        const popup = document.createElement('div');
        popup.className = 'popup error';
        popup.textContent = error.message || 'Login failed';
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 500);
        }, 3000);
        
        // Reset button
        const button = document.querySelector('button[type="submit"]');
        button.textContent = 'Login';
        button.disabled = false;
    }
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
                        // User is admin, redirect to admin page
                        window.location.href = 'admin.html';
                    } else {
                        // User is not admin or error occurred, redirect to dashboard
                        window.location.href = 'dashboard.html';
                    }
                })
                .catch(err => {
                    console.error('Error checking admin status:', err);
                    // Default to dashboard if there's an error
                    window.location.href = 'dashboard.html';
                });
        }
    });
});
