// Preloader functionality
document.addEventListener('DOMContentLoaded', function() {
    // Show preloader when page starts loading
    const preloader = document.querySelector('.preloader');
    
    // Hide preloader when page is fully loaded
    window.addEventListener('load', function() {
        // Use requestAnimationFrame for smoother transitions
        requestAnimationFrame(() => {
            preloader.classList.add('hidden');
            
            // Remove preloader from DOM after transition completes
            setTimeout(function() {
                preloader.style.display = 'none';
            }, 300); // Reduced from 500ms to 300ms
        });
    });
    
    // Simplified navigation preloader
    document.addEventListener('click', function(e) {
        // Check if the clicked element is a link to another page
        const target = e.target.closest('a');
        if (target && target.href && !target.href.startsWith('#') && 
            target.href.indexOf(window.location.origin) === 0 && 
            !target.target && !e.ctrlKey && !e.metaKey) {
            
            // Navigate immediately without showing preloader
            window.location.href = target.href;
        }
    });
});

// Function to show preloader programmatically (for form submissions, etc.)
function showPreloader() {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        preloader.classList.remove('hidden');
        preloader.style.display = 'flex';
    }
}
