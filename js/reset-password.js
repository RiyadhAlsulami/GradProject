// Import the Supabase client
import supabaseClient from './supabase-client.js';

// Get the form element and message div
const resetForm = document.getElementById('resetForm');
const messageDiv = document.getElementById('message');

// Handle form submission
resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // Get the email value
  const email = document.getElementById('email').value;
  
  try {
    // Show sending message
    messageDiv.textContent = 'Sending reset link...';
    
    // Call Supabase to send the password reset email
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password.html`
    });
    
    // Handle response
    if (error) {
      messageDiv.textContent = `Error: ${error.message}`;
      messageDiv.style.color = 'red';
      console.error(error);
    } else {
      messageDiv.textContent = 'Password reset link sent! Please check your email.';
      messageDiv.style.color = 'green';
      resetForm.reset();
    }
  } catch (err) {
    messageDiv.textContent = `Unexpected error: ${err.message}`;
    messageDiv.style.color = 'red';
    console.error(err);
  }
});
