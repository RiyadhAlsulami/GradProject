// Preloader functionality
document.addEventListener('DOMContentLoaded', function() {
    // Show preloader when page starts loading
    const preloader = document.querySelector('.preloader');
    
    // Hide preloader when page is fully loaded
    window.addEventListener('load', function() {
        preloader.classList.add('hidden');
        
        // Remove preloader from DOM after transition completes
        setTimeout(function() {
            preloader.style.display = 'none';
        }, 500);
    });
    
    // Show preloader before navigating away
    document.addEventListener('click', function(e) {
        // Check if the clicked element is a link to another page
        const target = e.target.closest('a');
        if (target && target.href && !target.href.startsWith('#') && 
            target.href.indexOf(window.location.origin) === 0 && 
            !target.target && !e.ctrlKey && !e.metaKey) {
            
            e.preventDefault();
            preloader.classList.remove('hidden');
            preloader.style.display = 'flex';
            
            // Navigate after a short delay to show the preloader
            setTimeout(function() {
                window.location.href = target.href;
            }, 300);
        }
    });
});

// Function to show preloader programmatically (for form submissions, etc.)
function showPreloader() {
    const preloader = document.querySelector('.preloader');
    preloader.classList.remove('hidden');
    preloader.style.display = 'flex';
}
