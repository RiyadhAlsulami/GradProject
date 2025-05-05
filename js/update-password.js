// Import the Supabase client
import supabaseClient from './supabase-client.js';

// Get the form element and message div
const updatePasswordForm = document.getElementById('updatePasswordForm');
const messageDiv = document.getElementById('message');

// Check if the user is authenticated via the PKCE flow
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get the current session
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      showError(`Authentication error: ${error.message}`, error);
      hideForm();
      return;
    }
    
    if (!session) {
      showError('Invalid or expired password reset link. Please request a new one.');
      hideForm();
      addResetLink();
    }
  } catch (err) {
    showError(`Unexpected error: ${err.message}`, err);
  }
});

// Handle form submission
updatePasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // Get the password values
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // Validate passwords match
  if (password !== confirmPassword) {
    showError('Passwords do not match!');
    return;
  }
  
  try {
    // Show updating message
    messageDiv.textContent = 'Updating password...';
    
    // Call Supabase to update the password
    const { error } = await supabaseClient.auth.updateUser({
      password: password
    });
    
    if (error) {
      showError(`Error: ${error.message}`, error);
    } else {
      showSuccess();
    }
  } catch (err) {
    showError(`Unexpected error: ${err.message}`, err);
  }
});

// Helper functions
function showError(message, error = null) {
  messageDiv.textContent = message;
  messageDiv.style.color = 'red';
  if (error) console.error(error);
}

function hideForm() {
  updatePasswordForm.style.display = 'none';
}

function addResetLink() {
  const resetLink = document.createElement('p');
  resetLink.innerHTML = '<a href="reset.html">Request a new password reset</a>';
  document.body.appendChild(resetLink);
}

function showSuccess() {
  messageDiv.textContent = 'Password updated successfully!';
  messageDiv.style.color = 'green';
  
  setTimeout(() => {
    const loginLink = document.createElement('p');
    loginLink.innerHTML = '<a href="index.html">Return to login</a>';
    document.body.appendChild(loginLink);
  }, 1000);
}
