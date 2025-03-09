/**
 * Line Authentication Module
 * Handles Line login, user profile retrieval, and session management
 */

// Global user profile object
let lineUserProfile = null;

// Local storage keys
const STORAGE_KEY = {
    ACCESS_TOKEN: 'line_access_token',
    USER_PROFILE: 'line_user_profile',
    EXPIRES_AT: 'line_token_expires_at'
};

// Initialize Line SDK
document.addEventListener('DOMContentLoaded', () => {
    initializeLineLogin();
    setupLoginButton();
});

// Initialize LIFF (LINE Front-end Framework)
async function initializeLineLogin() {
    try {
        await liff.init({ liffId: LINE_CONFIG.liffId });
        document.getElementById('login-status').textContent = 'Line SDK 初始化成功';
        
        // First check if we have stored credentials
        if (restoreLoginState()) {
            document.getElementById('login-status').textContent = '已從存儲恢復登入';
            displayUserProfile();
            document.getElementById('line-login-btn').textContent = '登出';
            // 觸發登錄狀態改變事件
            triggerLoginStatusChanged();
        }
        // Then check if user is already logged in with LIFF
        else if (liff.isLoggedIn()) {
            document.getElementById('login-status').textContent = '已登入';
            await fetchUserProfile();
            saveLoginState();
            displayUserProfile();
            document.getElementById('line-login-btn').textContent = '登出';
            // 觸發登錄狀態改變事件
            triggerLoginStatusChanged();
        } else {
            document.getElementById('login-status').textContent = '未登入';
        }
    } catch (error) {
        document.getElementById('login-status').textContent = `Line SDK 初始化失敗: ${error.message}`;
        console.error('LIFF initialization failed', error);
    }
}

// Setup login button behavior
function setupLoginButton() {
    const loginButton = document.getElementById('line-login-btn');
    loginButton.addEventListener('click', async () => {
        if (liff.isLoggedIn() || lineUserProfile) {
            // Logout
            liff.logout();
            lineUserProfile = null;
            clearLoginState();
            document.getElementById('user-profile').innerHTML = '';
            document.getElementById('login-status').textContent = '已登出';
            loginButton.textContent = '使用 Line 登入';
            
            // 觸發登錄狀態改變事件
            triggerLoginStatusChanged();
        } else {
            // Login
            try {
                await liff.login();
                // 登入成功後，獲取資料並觸發事件
                await fetchUserProfile();
                saveLoginState();
                displayUserProfile();
                loginButton.textContent = '登出';
                document.getElementById('login-status').textContent = '已登入';
                
                // 觸發登錄狀態改變事件
                triggerLoginStatusChanged();
            } catch (error) {
                document.getElementById('login-status').textContent = `登入失敗: ${error.message}`;
                console.error('Line login failed', error);
            }
        }
    });
}

// Save login state to local storage
function saveLoginState() {
    if (!lineUserProfile) return;
    
    try {
        // Get access token
        const accessToken = liff.getAccessToken();
        if (accessToken) {
            // Set expiration time (default to 30 days if not specified by LINE)
            const expiresIn = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
            const expiresAt = Date.now() + expiresIn;
            
            // Save to local storage
            localStorage.setItem(STORAGE_KEY.ACCESS_TOKEN, accessToken);
            localStorage.setItem(STORAGE_KEY.USER_PROFILE, JSON.stringify(lineUserProfile));
            localStorage.setItem(STORAGE_KEY.EXPIRES_AT, expiresAt.toString());
            
            console.log('Login state saved to local storage');
        }
    } catch (error) {
        console.error('Error saving login state:', error);
    }
}

// Restore login state from local storage
function restoreLoginState() {
    try {
        const accessToken = localStorage.getItem(STORAGE_KEY.ACCESS_TOKEN);
        const userProfileJson = localStorage.getItem(STORAGE_KEY.USER_PROFILE);
        const expiresAt = parseInt(localStorage.getItem(STORAGE_KEY.EXPIRES_AT) || '0', 10);
        
        // Check if token has expired
        if (Date.now() > expiresAt) {
            console.log('Stored token has expired');
            clearLoginState();
            return false;
        }
        
        if (accessToken && userProfileJson) {
            lineUserProfile = JSON.parse(userProfileJson);
            return true;
        }
    } catch (error) {
        console.error('Error restoring login state:', error);
    }
    
    return false;
}

// Clear login state from local storage
function clearLoginState() {
    localStorage.removeItem(STORAGE_KEY.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEY.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEY.EXPIRES_AT);
    console.log('Login state cleared from local storage');
}

// Fetch user profile from Line
async function fetchUserProfile() {
    try {
        if (liff.isLoggedIn()) {
            lineUserProfile = await liff.getProfile();
            return lineUserProfile;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        document.getElementById('login-status').textContent = `獲取用戶資料失敗: ${error.message}`;
        return null;
    }
}

// Display user profile in the UI
function displayUserProfile() {
    if (!lineUserProfile) return;
    
    const userProfileElement = document.getElementById('user-profile');
    userProfileElement.innerHTML = `
        <div class="profile-container">
            <img src="${lineUserProfile.pictureUrl}" alt="用戶頭像" class="profile-image">
            <div class="profile-info">
                <p class="profile-name">${lineUserProfile.displayName}</p>
                <p class="profile-id">ID: ${lineUserProfile.userId}</p>
            </div>
        </div>
    `;
}

// Get current user profile (for other modules to use)
function getCurrentUserProfile() {
    return lineUserProfile;
}

// 觸發登錄狀態改變事件
function triggerLoginStatusChanged() {
    const event = new Event('lineLoginStatusChanged');
    document.dispatchEvent(event);
}