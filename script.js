document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('blood-pressure-form');
    const resultDiv = document.getElementById('result');
    const systolicInput = document.getElementById('systolic');
    const diastolicInput = document.getElementById('diastolic');
    const heartrateInput = document.getElementById('heartrate');
    const historyListDiv = document.getElementById('history-list');
    
    // 載入之前儲存的資料
    loadFromLocalStorage();
    
    // 檢查用戶登錄狀態並載入歷史記錄
    checkLoginAndLoadHistory();
    
    // 計算血壓類別的通用函數
    function calculateBloodPressureCategory(systolic, diastolic) {
        let category = '';
        let categoryClass = '';
        
        if (systolic < 90 || diastolic < 60) {
            category = '低血壓';
            categoryClass = 'bp-low';
        } else if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) {
            category = '正常血壓';
            categoryClass = 'bp-normal';
        } else if ((systolic > 120 && systolic < 130) || diastolic == 80) {
            category = '血壓偏高';
            categoryClass = 'bp-elevated';
        } else if ((systolic >= 130 && systolic <= 140) || (diastolic > 80 && diastolic <= 90)) {
            category = '高血壓 (前期)';
            categoryClass = 'bp-high-1';
        } else if (systolic > 140 || diastolic > 90) {
            category = '高血壓 (危險)';
            categoryClass = 'bp-high-3';
        }
        
        return { category, categoryClass };
    }
    
    // 表單提交處理
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 獲取輸入值
        const systolic = parseFloat(systolicInput.value);
        const diastolic = parseFloat(diastolicInput.value);
        const heartrate = parseFloat(heartrateInput.value);
        
        // 檢查輸入是否有效
        if (isNaN(systolic) || isNaN(diastolic) || systolic <= 0 || diastolic <= 0) {
            resultDiv.innerHTML = '<p class="error">請輸入有效的血壓數值</p>';
            return;
        }
        
        if (isNaN(heartrate) || heartrate <= 0) {
            resultDiv.innerHTML = '<p class="error">請輸入有效的心律數值</p>';
            return;
        }
        
        // 確定血壓類別
        const bpResult = calculateBloodPressureCategory(systolic, diastolic);
        const category = bpResult.category;
        const categoryClass = bpResult.categoryClass;
        
        // 確定心律狀況
        let heartrateStatus = '';
        if (heartrate < 60) {
            heartrateStatus = '心律過慢';
        } else if (heartrate > 100) {
            heartrateStatus = '心律過快';
        } else {
            heartrateStatus = '心律正常';
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
        
        // 根據心律添加額外提醒
        if (heartrateStatus === '心律過慢') {
            reminder += ' 心律過慢可能導致疲勞、頭暈，嚴重時可能暈厥。';
        } else if (heartrateStatus === '心律過快') {
            reminder += ' 心律過快可能感到心悸、胸悶，或呼吸困難。';
        }
        
        // 顯示結果
        resultDiv.innerHTML = `
            <div class="result-content ${categoryClass}">
                <p class="bp-result">收縮壓: <strong>${systolic}</strong> mmHg / 舒張壓: <strong>${diastolic}</strong> mmHg / 心律: <strong>${heartrate}</strong> 次/分</p>
                <p class="bp-category">${category} (${heartrateStatus})</p>
                <p class="bp-reminder">${reminder}</p>
            </div>
        `;
        
        // 將資料儲存到 localStorage
        saveToLocalStorage(systolic, diastolic, heartrate, category, heartrateStatus, categoryClass, reminder);
        
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
                    heartrateInput.value
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
    function saveToLocalStorage(systolic, diastolic, heartrate, category, heartrateStatus, categoryClass, reminder) {
        const bpData = {
            systolic: systolic,
            diastolic: diastolic,
            heartrate: heartrate,
            category: category,
            heartrateStatus: heartrateStatus,
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
            if (bpData.heartrate) {
                heartrateInput.value = bpData.heartrate;
            }
            
            // 顯示上次測量的結果
            resultDiv.innerHTML = `
                <div class="result-content ${bpData.categoryClass}">
                    <p class="bp-result">收縮壓: <strong>${bpData.systolic}</strong> mmHg / 舒張壓: <strong>${bpData.diastolic}</strong> mmHg${bpData.heartrate ? ` / 心律: <strong>${bpData.heartrate}</strong> 次/分` : ''}</p>
                    <p class="bp-category">${bpData.category}${bpData.heartrateStatus ? ` (${bpData.heartrateStatus})` : ''}</p>
                    <p class="bp-reminder">${bpData.reminder}</p>
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
    async function saveBloodPressureRecord(userId, systolic, diastolic, heartrate) {
        try {
            const date = new Date().toISOString();
            const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=saveBloodPressure&userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}&systolic=${encodeURIComponent(systolic)}&diastolic=${encodeURIComponent(diastolic)}&heartrate=${encodeURIComponent(heartrate)}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error saving blood pressure record:', error);
            return false;
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
    
    // 分頁變數
    let currentPage = 1;
    let recordsPerPage = 5;
    let totalRecords = [];

    // 載入血壓歷史記錄
    async function loadBloodPressureHistory(page = 1) {
        const userProfile = getCurrentUserProfile();
        if (!userProfile) {
            historyListDiv.innerHTML = '<p>請先登入以查看您的血壓記錄</p>';
            return;
        }
        
        try {
            const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=getBloodPressureHistory&userId=${userProfile.userId}`);
            const result = await response.json();
            
            if (result.success) {
                totalRecords = result.data;
                currentPage = page;
                displayHistoryPage(currentPage);
            } else {
                historyListDiv.innerHTML = '<p>無法載入血壓記錄</p>';
            }
        } catch (error) {
            console.error('Error loading blood pressure history:', error);
            historyListDiv.innerHTML = '<p>載入血壓記錄時發生錯誤</p>';
        }
    }

    // 顯示指定頁面的歷史記錄
    function displayHistoryPage(page) {
        if (totalRecords.length === 0) {
            historyListDiv.innerHTML = '<p>暫無血壓記錄</p>';
            document.getElementById('pagination-controls').style.display = 'none';
            return;
        }

        const startIndex = (page - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const pageRecords = totalRecords.slice(startIndex, endIndex);

        let historyHTML = '<div class="history-container">';
        historyHTML += '<div class="history-header">';
        historyHTML += '<div class="history-cell">日期時間</div>';
        historyHTML += '<div class="history-cell">收縮壓</div>';
        historyHTML += '<div class="history-cell">舒張壓</div>';
        historyHTML += '<div class="history-cell">心律</div>';
        historyHTML += '<div class="history-cell">類別</div>';
        historyHTML += '<div class="history-cell actions">操作</div>';
        historyHTML += '</div>';

        pageRecords.forEach((record, index) => {
            const recordDate = new Date(record[0]);
            const dateTimeString = recordDate.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }) + ' ' + recordDate.toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const systolic = record[1];
            const diastolic = record[2];
            const heartrate = record[3] || '-';

            // 使用通用函數計算血壓類別
            const bpResult = calculateBloodPressureCategory(systolic, diastolic);
            const category = bpResult.category;
            const categoryClass = bpResult.categoryClass;
            
            const recordIndex = startIndex + index;
            
            historyHTML += `<div class="history-row ${categoryClass}">`;
            historyHTML += `<div class="history-cell">${dateTimeString}</div>`;
            historyHTML += `<div class="history-cell">${systolic}</div>`;
            historyHTML += `<div class="history-cell">${diastolic}</div>`;
            historyHTML += `<div class="history-cell">${heartrate}</div>`;
            historyHTML += `<div class="history-cell">${category}</div>`;
            historyHTML += `<div class="history-cell actions">
                <button class="delete-btn" onclick="deleteRecord(${recordIndex})" title="刪除記錄">刪除</button>
            </div>`;
            historyHTML += '</div>';
        });

        historyHTML += '</div>';
        historyListDiv.innerHTML = historyHTML;

        // 顯示分頁控制
        updatePaginationControls();
    }

    // 更新分頁控制
    function updatePaginationControls() {
        const totalPages = Math.ceil(totalRecords.length / recordsPerPage);
        const paginationControls = document.getElementById('pagination-controls');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        if (totalPages > 1) {
            paginationControls.style.display = 'flex';
            
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages;
            
            pageInfo.textContent = `第 ${currentPage} 頁，共 ${totalPages} 頁`;
        } else {
            paginationControls.style.display = 'none';
        }
    }

    // 刪除記錄
    async function deleteRecord(recordIndex) {
        if (!confirm('確定要刪除這筆記錄嗎？')) {
            return;
        }

        const userProfile = getCurrentUserProfile();
        if (!userProfile) {
            alert('請先登入');
            return;
        }

        const record = totalRecords[recordIndex];
        const recordDate = new Date(record[0]).toISOString();

        try {
            const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=deleteBloodPressureRecord&userId=${encodeURIComponent(userProfile.userId)}&date=${encodeURIComponent(recordDate)}&systolic=${encodeURIComponent(record[1])}&diastolic=${encodeURIComponent(record[2])}&heartrate=${encodeURIComponent(record[3] || '')}`, {
                method: 'GET',
                mode: 'cors'
            });

            const result = await response.json();
            
            if (result.success) {
                // 重新載入記錄
                await loadBloodPressureHistory(currentPage);
                
                // 如果當前頁面沒有記錄了，回到前一頁
                const totalPages = Math.ceil(totalRecords.length / recordsPerPage);
                if (currentPage > totalPages && totalPages > 0) {
                    await loadBloodPressureHistory(totalPages);
                }
                
                // 更新圖表
                if (typeof updateChart === 'function') {
                    updateChart();
                }
            } else {
                alert('刪除記錄失敗：' + (result.error || '未知錯誤'));
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('刪除記錄時發生錯誤');
        }
    }

    // 將刪除函數設為全域函數
    window.deleteRecord = deleteRecord;
    
    // 監聽 Line 登錄狀態變化
    document.addEventListener('lineLoginStatusChanged', function() {
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            loadBloodPressureHistory();
            updateBloodPressureChart(); // 更新圖表
        } else {
            historyListDiv.innerHTML = '<p>請先登入以查看您的血壓記錄</p>';
            showNoDataMessage(); // 顯示無數據訊息
        }
    });

    // 圖表相關變數
    let bpChart = null;
    let chartData = [];
    let currentTimePeriod = 'morning';

    // 初始化圖表
    function initializeChart() {
        const ctx = document.getElementById('bp-chart').getContext('2d');
        
        bpChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '收縮壓',
                    data: [],
                    borderColor: 'rgb(231, 76, 60)',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'bp-axis'
                }, {
                    label: '舒張壓',
                    data: [],
                    borderColor: 'rgb(52, 152, 219)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'bp-axis'
                }, {
                    label: '心律',
                    data: [],
                    borderColor: 'rgb(46, 204, 113)',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'hr-axis'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: '血壓趨勢圖表'
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '測量時間'
                        }
                    },
                    'bp-axis': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '血壓 (mmHg)'
                        },
                        min: 40,
                        max: 200
                    },
                    'hr-axis': {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '心律 (次/分)'
                        },
                        min: 40,
                        max: 120,
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    // 按時間段分類數據
    function categorizeDataByTimePeriod(data, period) {
        if (period === 'all') {
            return data;
        }

        return data.filter(record => {
            const date = new Date(record[0]);
            const hour = date.getHours();
            
            switch (period) {
                case 'morning':
                    return hour >= 6 && hour < 12;
                case 'afternoon':
                    return hour >= 12 && hour < 18;
                case 'evening':
                    return hour >= 18 && hour < 24;
                case 'night':
                    return hour >= 0 && hour < 6;
                default:
                    return true;
            }
        });
    }

    // 更新血壓圖表
    function updateBloodPressureChart(period = currentTimePeriod) {
        const userProfile = getCurrentUserProfile();
        if (!userProfile) {
            showNoDataMessage();
            return;
        }

        // 使用現有的圖表數據
        if (!chartData || chartData.length === 0) {
            fetchChartData().then(data => {
                chartData = data;
                renderChart(period);
            });
        } else {
            renderChart(period);
        }
    }

    // 獲取圖表數據
    async function fetchChartData() {
        const userProfile = getCurrentUserProfile();
        if (!userProfile) {
            return [];
        }

        try {
            const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=getBloodPressureHistory&userId=${userProfile.userId}`);
            const result = await response.json();
            
            if (result.success) {
                return result.data;
            }
        } catch (error) {
            console.error('Error fetching chart data:', error);
        }
        
        return [];
    }

    // 渲染圖表
    function renderChart(period) {
        const filteredData = categorizeDataByTimePeriod(chartData, period);
        
        if (filteredData.length === 0) {
            showNoDataMessage();
            return;
        }

        hideNoDataMessage();

        // 準備圖表數據（最多顯示最近30筆記錄）
        const recentData = filteredData.slice(0, 30).reverse();
        const labels = recentData.map(record => {
            const date = new Date(record[0]);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString('zh-TW', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        });
        
        const systolicData = recentData.map(record => record[1]);
        const diastolicData = recentData.map(record => record[2]);
        const heartrateData = recentData.map(record => record[3] || null); // 心律數據，兼容舊數據

        // 更新圖表
        if (bpChart) {
            bpChart.data.labels = labels;
            bpChart.data.datasets[0].data = systolicData;
            bpChart.data.datasets[1].data = diastolicData;
            bpChart.data.datasets[2].data = heartrateData;
            bpChart.update();
        }
    }

    // 顯示無數據訊息
    function showNoDataMessage() {
        document.getElementById('chart-no-data').style.display = 'block';
        document.getElementById('bp-chart').style.display = 'none';
    }

    // 隱藏無數據訊息
    function hideNoDataMessage() {
        document.getElementById('chart-no-data').style.display = 'none';
        document.getElementById('bp-chart').style.display = 'block';
    }

    // 設置時間段篩選按鈕事件
    function setupTimePeriodFilters() {
        const filterButtons = document.querySelectorAll('.time-filter');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 移除所有按鈕的 active 類別
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // 為當前按鈕添加 active 類別
                this.classList.add('active');
                
                // 更新當前時間段
                currentTimePeriod = this.getAttribute('data-period');
                
                // 更新圖表
                renderChart(currentTimePeriod);
            });
        });
    }

    // 修改原有的載入歷史記錄函數，同時更新圖表
    const originalLoadBloodPressureHistory = window.loadBloodPressureHistory || loadBloodPressureHistory;
    
    // 重新定義載入歷史記錄函數
    async function loadBloodPressureHistoryWithChart() {
        await loadBloodPressureHistory();
        
        // 載入歷史記錄後，更新圖表數據
        chartData = await fetchChartData();
        updateBloodPressureChart();
    }

    // 替換所有對 loadBloodPressureHistory 的調用
    window.loadBloodPressureHistory = loadBloodPressureHistoryWithChart;

    // 頁面載入完成後初始化圖表
    setTimeout(() => {
        initializeChart();
        setupTimePeriodFilters();
        
        // 如果用戶已登錄，載入圖表數據
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            updateBloodPressureChart();
        } else {
            showNoDataMessage();
        }
    }, 500); // 延遲確保其他腳本都已載入

    // 分頁按鈕事件監聽器
    document.getElementById('prev-page').addEventListener('click', function() {
        if (currentPage > 1) {
            loadBloodPressureHistory(currentPage - 1);
        }
    });

    document.getElementById('next-page').addEventListener('click', function() {
        const totalPages = Math.ceil(totalRecords.length / recordsPerPage);
        if (currentPage < totalPages) {
            loadBloodPressureHistory(currentPage + 1);
        }
    });
});