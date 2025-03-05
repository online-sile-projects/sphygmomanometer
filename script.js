document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('blood-pressure-form');
    const resultDiv = document.getElementById('result');
    const systolicInput = document.getElementById('systolic');
    const diastolicInput = document.getElementById('diastolic');
    const historyListDiv = document.getElementById('history-list');
    
    // 載入之前儲存的資料
    loadFromLocalStorage();
    
    // 檢查用戶登錄狀態並載入歷史記錄
    checkLoginAndLoadHistory();
    
    // 表單提交處理
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 獲取輸入值
        const systolic = parseFloat(systolicInput.value);
        const diastolic = parseFloat(diastolicInput.value);
        
        // 檢查輸入是否有效
        if (isNaN(systolic) || isNaN(diastolic) || systolic <= 0 || diastolic <= 0) {
            resultDiv.innerHTML = '<p class="error">請輸入有效的血壓數值</p>';
            return;
        }
        
        // 確定血壓類別
        let category = '';
        let categoryClass = '';
        
        if (systolic < 90 || diastolic < 60) {
            category = '低血壓';
            categoryClass = 'underweight';
        } else if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) {
            category = '正常血壓';
            categoryClass = 'normal';
        } else if ((systolic > 120 && systolic < 130) || diastolic == 80) {
            category = '血壓偏高';
            categoryClass = 'overweight';
        } else if ((systolic >= 130 && systolic <= 140) || (diastolic > 80 && diastolic <= 90)) {
            category = '高血壓 (前期)';
            categoryClass = 'obese-mild';
        } else if (systolic > 140 || diastolic > 90) {
            category = '高血壓 (危險)';
            categoryClass = 'obese-severe';
        }
        
        // 產生提醒訊息
        let reminder = '';
        if (category === '低血壓') {
            reminder = '可能疲倦、暈眩，甚至暈厥。';
        } else if (category === '正常血壓') {
            reminder = '很棒，繼續保持。';
        } else if (category === '血壓偏高') {
            reminder = '通常沒有症狀，要開始留意。';
        } else if (category === '高血壓 (前期)') {
            reminder = '通常沒有症狀。心腦血管疾病需服藥。';
        } else if (category === '高血壓 (危險)') {
            reminder = '身體通常已受影響，較危險。';
        }
        
        // 顯示結果
        resultDiv.innerHTML = `
            <div class="result-content ${categoryClass}">
                <p class="bmi-result">收縮壓: <strong>${systolic}</strong> mmHg / 舒張壓: <strong>${diastolic}</strong> mmHg</p>
                <p class="bmi-category">${category}</p>
                <p class="bmi-reminder">${reminder}</p>
            </div>
        `;
        
        // 將資料儲存到 localStorage
        saveToLocalStorage(systolic, diastolic, category, categoryClass, reminder);
        
        // 如果用戶已經登錄，保存記錄到 Google Sheets
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            try {
                // 保存用戶資料到主表
                await saveUserToMasterSheet(userProfile);
                
                // 保存血壓記錄到用戶專屬表格
                await saveBloodPressureRecord(
                    userProfile.userId, 
                    systolicInput.value, 
                    diastolicInput.value, 
                    category,
                    reminder
                );
                
                // 重新載入血壓歷史記錄
                loadBloodPressureHistory();
            } catch (error) {
                console.error('Error saving data to Google Sheets:', error);
            }
        } else {
            resultDiv.innerHTML += `
                <p class="login-prompt">登入 Line 帳號以保存您的血壓記錄</p>
            `;
        }
    });
    
    // 儲存資料到 localStorage
    function saveToLocalStorage(systolic, diastolic, category, categoryClass, reminder) {
        const bpData = {
            systolic: systolic,
            diastolic: diastolic,
            category: category,
            categoryClass: categoryClass,
            reminder: reminder,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('bpData', JSON.stringify(bpData));
    }
    
    // 從 localStorage 讀取資料
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('bpData');
        
        if (savedData) {
            const bpData = JSON.parse(savedData);
            
            // 設置表單的值
            systolicInput.value = bpData.systolic;
            diastolicInput.value = bpData.diastolic;
            
            // 顯示上次測量的結果
            resultDiv.innerHTML = `
                <div class="result-content ${bpData.categoryClass}">
                    <p class="bmi-result">收縮壓: <strong>${bpData.systolic}</strong> mmHg / 舒張壓: <strong>${bpData.diastolic}</strong> mmHg</p>
                    <p class="bmi-category">${bpData.category}</p>
                    <p class="bmi-reminder">${bpData.reminder}</p>
                    <p class="timestamp">上次測量時間: ${new Date(bpData.timestamp).toLocaleString()}</p>
                </div>
            `;
        }
    }
    
    // 保存用戶到主表
    async function saveUserToMasterSheet(userProfile) {
        try {
            const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=saveUser&userId=${encodeURIComponent(userProfile.userId)}&displayName=${encodeURIComponent(userProfile.displayName)}&pictureUrl=${encodeURIComponent(userProfile.pictureUrl)}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error saving user data:', error);
            return false;
        }
    }
    
    // 保存血壓記錄
    async function saveBloodPressureRecord(userId, systolic, diastolic, category, reminder) {
        try {
            const date = new Date().toISOString();
            const response = await fetch('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'saveBloodPressure',
                    userId: userId,
                    date: date,
                    systolic: systolic,
                    diastolic: diastolic,
                    category: category,
                    reminder: reminder
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error saving blood pressure record:', error);
            throw error;
        }
    }
    
    // 檢查用戶登錄狀態並載入歷史記錄
    function checkLoginAndLoadHistory() {
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            loadBloodPressureHistory();
        } else {
            historyListDiv.innerHTML = '<p>請先登入以查看您的血壓記錄</p>';
        }
    }
    
    // 載入血壓歷史記錄
    async function loadBloodPressureHistory() {
        const userProfile = getCurrentUserProfile();
        if (!userProfile) {
            historyListDiv.innerHTML = '<p>請先登入以查看您的血壓記錄</p>';
            return;
        }
        
        try {
            const response = await fetch(`https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getBloodPressureHistory&userId=${userProfile.userId}`);
            const result = await response.json();
            
            if (result.success) {
                let historyHTML = '<div class="history-container">';
                historyHTML += '<div class="history-header">';
                historyHTML += '<div class="history-cell">日期</div>';
                historyHTML += '<div class="history-cell">收縮壓</div>';
                historyHTML += '<div class="history-cell">舒張壓</div>';
                historyHTML += '<div class="history-cell">類別</div>';
                historyHTML += '</div>';
                
                // 最多顯示10筆記錄
                const recentHistory = result.data.slice(0, 10);
                
                recentHistory.forEach(record => {
                    const date = new Date(record[0]).toLocaleDateString();
                    const systolic = record[1];
                    const diastolic = record[2];
                    const category = record[3];
                    
                    historyHTML += '<div class="history-row">';
                    historyHTML += `<div class="history-cell">${date}</div>`;
                    historyHTML += `<div class="history-cell">${systolic}</div>`;
                    historyHTML += `<div class="history-cell">${diastolic}</div>`;
                    historyHTML += `<div class="history-cell">${category}</div>`;
                    historyHTML += '</div>';
                });
                
                historyHTML += '</div>';
                historyListDiv.innerHTML = historyHTML;
            } else {
                historyListDiv.innerHTML = '<p>無法載入血壓記錄</p>';
            }
        } catch (error) {
            console.error('Error loading blood pressure history:', error);
            historyListDiv.innerHTML = '<p>載入血壓記錄時發生錯誤</p>';
        }
    }
    
    // 監聽 Line 登錄狀態變化
    document.addEventListener('lineLoginStatusChanged', function() {
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            loadBloodPressureHistory();
        } else {
            historyListDiv.innerHTML = '<p>請先登入以查看您的血壓記錄</p>';
        }
    });
});