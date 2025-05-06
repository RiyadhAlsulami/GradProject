// Sidebar Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const menuToggle = document.querySelector('.menu-toggle');
    
    // Set active menu item based on current page
    function setActiveMenuItem() {
        const currentPath = window.location.pathname;
        const menuItems = document.querySelectorAll('.sidebar-menu-item');
        
        menuItems.forEach(item => {
            const href = item.getAttribute('href');
            if (currentPath.includes(href)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    // Toggle sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        
        // Add overlay when sidebar is visible
        if (!sidebar.classList.contains('collapsed')) {
            const overlay = document.createElement('div');
            overlay.classList.add('sidebar-overlay');
            overlay.addEventListener('click', toggleSidebar);
            document.body.appendChild(overlay);
        } else {
            // Remove overlay when sidebar is hidden
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    }

    // Initialize menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    
    // Close sidebar when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggle = menuToggle && menuToggle.contains(event.target);
        
        if (!isClickInsideSidebar && !isClickOnToggle && !sidebar.classList.contains('collapsed')) {
            toggleSidebar();
        }
    });
    
    // Update sidebar username from profile
    function updateSidebarUsername() {
        const usernameElement = document.querySelector('.sidebar-profile-name');
        if (usernameElement) {
            // Get username from localStorage if available
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user && user.user_metadata && user.user_metadata.name) {
                usernameElement.textContent = user.user_metadata.name;
            }
        }
    }
    
    // Initialize
    setActiveMenuItem();
    updateSidebarUsername();
    
    // Set initial state - sidebar collapsed by default
    if (!sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
    
    // Handle logout button clicks
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Clear all storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Force redirect to login page
            window.location.href = 'login.html';
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.remove();
        }
    });
});
